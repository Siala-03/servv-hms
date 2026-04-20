// Superadmin-only routes: manage hotel accounts + create managers
// Also: one-time setup endpoint to bootstrap the superadmin

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase';
import { HttpError } from '../lib/errors';
import { authenticate, AuthRequest, requireRole } from '../middleware/authenticate';

const router = Router();

// ── POST /api/admin/setup ─────────────────────────────────────────────────────
// One-time bootstrap: creates the superadmin if none exists.
// Call this once on first deploy, then remove or lock behind a secret.
router.post('/setup', async (req, res, next) => {
  try {
    const { username, password, firstName, lastName } = req.body as {
      username: string; password: string; firstName?: string; lastName?: string;
    };

    if (!username?.trim() || !password) throw new HttpError(400, 'username and password are required');
    if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');

    // Guard: only allow if no superadmin exists yet
    const { data: existing } = await supabase
      .from('hotel_users')
      .select('id')
      .eq('role', 'superadmin')
      .maybeSingle();

    if (existing) throw new HttpError(409, 'Superadmin already exists. Use /api/admin/hotels to manage hotels.');

    const hash = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from('hotel_users')
      .insert({
        hotel_id:   null,
        first_name: (firstName ?? 'Super').trim(),
        last_name:  (lastName  ?? 'Admin').trim(),
        role:       'superadmin',
      })
      .select()
      .single();

    if (error) throw new HttpError(500, error.message);

    await supabase.from('hotel_user_credentials').insert({
      user_id:       user.id,
      hotel_id:      null,
      username:      username.trim(),
      password_hash: hash,
    });

    res.status(201).json({
      message: 'Superadmin created. Log in at /api/auth/login (no hotelId needed).',
      userId:  user.id,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/superadmin ────────────────────────────────────────────────
// An existing superadmin creates another superadmin account.
router.post('/superadmin', authenticate, requireRole('superadmin'), async (_req, res, next) => {
  try {
    const { username, password, firstName, lastName } = _req.body as {
      username: string; password: string; firstName?: string; lastName?: string;
    };

    if (!username?.trim() || !password) throw new HttpError(400, 'username and password are required');
    if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');

    // Check username not already taken globally (superadmins have no hotel_id)
    const { data: existing } = await supabase
      .from('hotel_user_credentials')
      .select('user_id')
      .eq('username', username.trim())
      .is('hotel_id', null)
      .maybeSingle();

    if (existing) throw new HttpError(409, 'That username is already taken');

    const hash = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from('hotel_users')
      .insert({
        hotel_id:   null,
        first_name: (firstName ?? 'Super').trim(),
        last_name:  (lastName  ?? 'Admin').trim(),
        role:       'superadmin',
      })
      .select()
      .single();

    if (error) throw new HttpError(500, error.message);

    await supabase.from('hotel_user_credentials').insert({
      user_id:       user.id,
      hotel_id:      null,
      username:      username.trim(),
      password_hash: hash,
    });

    res.status(201).json({ userId: user.id, username: username.trim(), role: 'superadmin' });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/hotels ─────────────────────────────────────────────────────
router.get('/hotels', authenticate, requireRole('superadmin'), async (_req, res, next) => {
  try {
    const { data: hotels } = await supabase
      .from('hotel_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    // Count users per hotel
    const ids = (hotels ?? []).map((h: any) => h.id);
    const { data: users } = await supabase
      .from('hotel_users')
      .select('hotel_id, id')
      .in('hotel_id', ids);

    const countMap: Record<string, number> = {};
    (users ?? []).forEach((u: any) => { countMap[u.hotel_id] = (countMap[u.hotel_id] ?? 0) + 1; });

    res.json((hotels ?? []).map((h: any) => ({ ...h, userCount: countMap[h.id] ?? 0 })));
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/hotels ────────────────────────────────────────────────────
// Creates hotel + optional manager in one atomic call
router.post('/hotels', authenticate, requireRole('superadmin'), async (_req: AuthRequest, res, next) => {
  try {
    const {
      name, address, country, phone, email, hasRestaurant,
      managerFirstName, managerLastName, managerEmail, managerPhone,
      managerUsername, managerPassword,
    } = _req.body as {
      name: string; address?: string; country?: string;
      phone?: string; email?: string; hasRestaurant?: boolean;
      managerFirstName?: string; managerLastName?: string;
      managerEmail?: string; managerPhone?: string;
      managerUsername?: string; managerPassword?: string;
    };

    if (!name?.trim()) throw new HttpError(400, 'Hotel name is required');

    const hasManager = !!(managerFirstName && managerUsername && managerPassword);
    if (hasManager && (managerPassword as string).length < 6) {
      throw new HttpError(400, 'Manager password must be at least 6 characters');
    }

    const { data: hotel, error: hotelErr } = await supabase
      .from('hotel_accounts')
      .insert({
        name:           name.trim(),
        address,
        country:        country ?? 'Rwanda',
        phone,
        email,
        has_restaurant: hasRestaurant ?? false,
      })
      .select()
      .single();

    if (hotelErr) throw new HttpError(500, hotelErr.message);

    let manager = null;
    if (hasManager) {
      const hash = await bcrypt.hash(managerPassword as string, 10);
      const { data: user, error: userErr } = await supabase
        .from('hotel_users')
        .insert({
          hotel_id:   hotel.id,
          first_name: (managerFirstName as string).trim(),
          last_name:  (managerLastName ?? '').trim(),
          email:      managerEmail,
          phone:      managerPhone,
          role:       'manager',
        })
        .select()
        .single();

      if (userErr) throw new HttpError(500, userErr.message);

      await supabase.from('hotel_user_credentials').insert({
        user_id:       user.id,
        hotel_id:      hotel.id,
        username:      (managerUsername as string).trim(),
        password_hash: hash,
      });

      manager = { id: user.id, firstName: user.first_name, username: managerUsername };
    }

    res.status(201).json({ ...hotel, manager });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/admin/hotels/:id ──────────────────────────────────────────────
router.delete('/hotels/:id', authenticate, requireRole('superadmin'), async (req, res, next) => {
  try {
    const { error } = await supabase.from('hotel_accounts').delete().eq('id', req.params.id);
    if (error) throw new HttpError(500, error.message);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/hotels/:id/users ──────────────────────────────────────────
router.get('/hotels/:id/users', authenticate, requireRole('superadmin'), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('hotel_users')
      .select('id, first_name, last_name, role, username:hotel_user_credentials(username), is_active, created_at')
      .eq('hotel_id', req.params.id)
      .order('created_at');
    if (error) throw new HttpError(500, error.message);
    res.json(data ?? []);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/admin/hotels/:id ─────────────────────────────────────────────────
router.put('/hotels/:id', authenticate, requireRole('superadmin'), async (req, res, next) => {
  try {
    const { name, address, country, phone, email, hasRestaurant, isActive } = req.body;
    const { data, error } = await supabase
      .from('hotel_accounts')
      .update({ name, address, country, phone, email, has_restaurant: hasRestaurant, is_active: isActive })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw new HttpError(404, 'Hotel not found');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/hotels/:id/manager ───────────────────────────────────────
// Superadmin creates the manager account for a hotel
router.post('/hotels/:id/manager', authenticate, requireRole('superadmin'), async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, username, password } = req.body as {
      firstName: string; lastName: string; email?: string; phone?: string;
      username: string; password: string;
    };

    if (!firstName || !lastName || !username || !password) {
      throw new HttpError(400, 'firstName, lastName, username and password are required');
    }
    if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');

    const hotelId = req.params.id;

    // Verify hotel exists
    const { data: hotel } = await supabase.from('hotel_accounts').select('id, name').eq('id', hotelId).maybeSingle();
    if (!hotel) throw new HttpError(404, 'Hotel not found');

    // Check username not taken in this hotel
    const { data: existing } = await supabase
      .from('hotel_user_credentials')
      .select('user_id')
      .eq('username', username.trim())
      .eq('hotel_id', hotelId)
      .maybeSingle();

    if (existing) throw new HttpError(409, 'Username already taken in this hotel');

    const hash = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from('hotel_users')
      .insert({ hotel_id: hotelId, first_name: firstName.trim(), last_name: lastName.trim(), email, phone, role: 'manager' })
      .select()
      .single();

    if (error) throw new HttpError(500, error.message);

    await supabase.from('hotel_user_credentials').insert({
      user_id:       user.id,
      hotel_id:      hotelId,
      username:      username.trim(),
      password_hash: hash,
    });

    res.status(201).json({
      user: {
        id:        user.id,
        firstName: user.first_name,
        lastName:  user.last_name,
        role:      user.role,
        hotelId:   user.hotel_id,
        hotelName: hotel.name,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
