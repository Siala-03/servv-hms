import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase';
import { HttpError } from '../lib/errors';
import { authenticate, AuthRequest, requireRole } from '../middleware/authenticate';
import { createAuthToken } from '../lib/authToken';

const router = Router();

type UserRole = 'superadmin' | 'manager' | 'front_desk' | 'housekeeping' | 'fnb';

function toUser(row: any, hotel: any = null) {
  return {
    id:            row.id,
    firstName:     row.first_name,
    lastName:      row.last_name,
    email:         row.email,
    phone:         row.phone,
    role:          row.role,
    isActive:      row.is_active,
    hotelId:       row.hotel_id ?? null,
    hotelName:     hotel?.name ?? null,
    hasRestaurant: hotel?.has_restaurant ?? false,
    createdAt:     row.created_at,
  };
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { username, password, hotelId } = req.body as {
      username: string;
      password: string;
      hotelId?: string;
    };

    if (!username?.trim() || !password) throw new HttpError(400, 'Username and password are required');

    // Find credentials
    const { data: creds, error: credErr } = await supabase
      .from('hotel_user_credentials')
      .select('user_id, password_hash, hotel_id')
      .eq('username', username.trim());

    if (credErr) throw new HttpError(500, credErr.message);
    if (!creds || creds.length === 0) throw new HttpError(401, 'Invalid username or password');

    let cred = null as (typeof creds[number]) | null;

    if (hotelId) {
      cred = creds.find((c) => c.hotel_id === hotelId) ?? null;
      if (!cred) throw new HttpError(401, 'Invalid username, password, or hotel ID');
      const valid = await bcrypt.compare(password, cred.password_hash);
      if (!valid) throw new HttpError(401, 'Invalid username, password, or hotel ID');
    } else if (creds.length === 1) {
      const only = creds[0];
      const valid = await bcrypt.compare(password, only.password_hash);
      if (!valid) throw new HttpError(401, 'Invalid username or password');
      cred = only;
    } else {
      // Same username exists in multiple hotels. Try matching password first.
      const matches: typeof creds = [];
      for (const c of creds) {
        // eslint-disable-next-line no-await-in-loop
        const ok = await bcrypt.compare(password, c.password_hash);
        if (ok) matches.push(c);
      }

      if (matches.length === 0) throw new HttpError(401, 'Invalid username or password');
      if (matches.length > 1) {
        throw new HttpError(400, 'This username exists in multiple hotels. Please enter your Hotel ID.');
      }
      cred = matches[0];
    }

    // Fetch full user + hotel info
    const { data: user } = await supabase
      .from('hotel_users')
      .select('*')
      .eq('id', cred!.user_id)
      .maybeSingle();

    if (!user || !user.is_active) throw new HttpError(401, 'Account not found or deactivated');

    let hotel = null;
    if (user.hotel_id) {
      const { data } = await supabase.from('hotel_accounts').select('id, name, has_restaurant').eq('id', user.hotel_id).maybeSingle();
      hotel = data;
    }

    const authToken = createAuthToken({
      userId: user.id,
      role: user.role,
      hotelId: user.hotel_id ?? null,
    });

    res.json({ user: toUser(user, hotel), token: authToken.token, expiresIn: authToken.expiresIn });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { data: user } = await supabase
      .from('hotel_users')
      .select('*')
      .eq('id', req.userId!)
      .maybeSingle();

    if (!user) throw new HttpError(401, 'User not found');

    let hotel = null;
    if (user.hotel_id) {
      const { data } = await supabase.from('hotel_accounts').select('id, name, has_restaurant').eq('id', user.hotel_id).maybeSingle();
      hotel = data;
    }

    res.json({ user: toUser(user, hotel) });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/users  (manager creates staff accounts) ───────────────────
router.post('/users', authenticate, requireRole('manager'), async (req: AuthRequest, res, next) => {
  try {
    const { firstName, lastName, email, phone, username, password, role } = req.body as {
      firstName: string; lastName: string; email?: string; phone?: string;
      username: string; password: string; role: UserRole;
    };

    if (!firstName || !lastName || !username || !password || !role) {
      throw new HttpError(400, 'firstName, lastName, username, password and role are required');
    }

    const ALLOWED: UserRole[] = ['front_desk', 'housekeeping', 'fnb'];
    if (!ALLOWED.includes(role)) throw new HttpError(400, `Managers can only create: ${ALLOWED.join(', ')}`);

    const hotelId = req.hotelId!;

    // Check username uniqueness within hotel
    const { data: existing } = await supabase
      .from('hotel_user_credentials')
      .select('user_id')
      .eq('username', username.trim())
      .eq('hotel_id', hotelId)
      .maybeSingle();

    if (existing) throw new HttpError(409, 'Username already taken in this hotel');

    const hash = await bcrypt.hash(password, 10);

    const { data: newUser, error } = await supabase
      .from('hotel_users')
      .insert({ hotel_id: hotelId, first_name: firstName.trim(), last_name: lastName.trim(), email, phone, role })
      .select()
      .single();

    if (error) throw new HttpError(500, error.message);

    await supabase.from('hotel_user_credentials').insert({
      user_id:       newUser.id,
      hotel_id:      hotelId,
      username:      username.trim(),
      password_hash: hash,
    });

    res.status(201).json({ user: toUser(newUser) });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/auth/users ───────────────────────────────────────────────────────
router.get('/users', authenticate, requireRole('manager', 'superadmin'), async (req: AuthRequest, res, next) => {
  try {
    const query = req.userRole === 'superadmin'
      ? supabase.from('hotel_users').select('*').neq('role', 'superadmin')
      : supabase.from('hotel_users').select('*').eq('hotel_id', req.hotelId!).neq('role', 'manager');

    const { data } = await query.order('created_at', { ascending: true });

    // Join usernames
    const ids = (data ?? []).map((u: any) => u.id);
    const { data: creds } = await supabase
      .from('hotel_user_credentials')
      .select('user_id, username')
      .in('user_id', ids);

    const usernameMap = Object.fromEntries((creds ?? []).map((c: any) => [c.user_id, c.username]));

    res.json((data ?? []).map((u: any) => ({ ...toUser(u), username: usernameMap[u.id] ?? null })));
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/auth/users/:id (deactivate) ───────────────────────────────────
router.delete('/users/:id', authenticate, requireRole('manager'), async (req: AuthRequest, res, next) => {
  try {
    const { data: target } = await supabase
      .from('hotel_users')
      .select('id, hotel_id, role')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!target) throw new HttpError(404, 'User not found');
    if (target.hotel_id !== req.hotelId) throw new HttpError(403, 'Cannot modify users from another hotel');
    if (target.role === 'manager') throw new HttpError(403, 'Cannot deactivate a manager account');

    await supabase.from('hotel_users').update({ is_active: false }).eq('id', req.params.id);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/auth/users/:id/password ─────────────────────────────────────────
router.put('/users/:id/password', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };

    // Only the user themselves (or a manager in their hotel) can change the password
    const isSelf    = req.userId === req.params.id;
    const isManager = req.userRole === 'manager';
    if (!isSelf && !isManager) throw new HttpError(403, 'Insufficient permissions');

    const { data: cred } = await supabase
      .from('hotel_user_credentials')
      .select('password_hash')
      .eq('user_id', req.params.id)
      .maybeSingle();

    if (!cred) throw new HttpError(404, 'Credentials not found');

    if (isSelf) {
      const valid = await bcrypt.compare(currentPassword, cred.password_hash);
      if (!valid) throw new HttpError(401, 'Current password is incorrect');
    }

    if (!newPassword || newPassword.length < 6) throw new HttpError(400, 'New password must be at least 6 characters');

    const hash = await bcrypt.hash(newPassword, 10);
    await supabase.from('hotel_user_credentials').update({ password_hash: hash }).eq('user_id', req.params.id);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
