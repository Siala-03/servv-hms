import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { HttpError } from '../lib/errors';
import { extractBearerToken, verifyAuthToken } from '../lib/authToken';

export interface AuthRequest extends Request {
  userId?:   string;
  userRole?: string;
  hotelId?:  string | null;
}

export async function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization as string | undefined;
    const bearerToken = extractBearerToken(authHeader);
    const tokenPayload = bearerToken ? verifyAuthToken(bearerToken) : null;

    // Temporary fallback for legacy clients still sending x-user-id.
    const userId = tokenPayload?.uid ?? (req.headers['x-user-id'] as string | undefined);
    if (!userId) throw new HttpError(401, 'Authentication required');

    const { data, error } = await supabase
      .from('hotel_users')
      .select('id, role, hotel_id, is_active')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) throw new HttpError(401, 'Invalid session — please log in again');
    if (!data.is_active) throw new HttpError(401, 'Account has been deactivated');

    if (tokenPayload) {
      if (tokenPayload.uid !== data.id) throw new HttpError(401, 'Invalid token subject');
      if (tokenPayload.role !== data.role) throw new HttpError(401, 'Invalid token role');
      if ((tokenPayload.hid ?? null) !== (data.hotel_id ?? null)) throw new HttpError(401, 'Invalid token scope');
    }

    req.userId   = data.id;
    req.userRole = data.role;
    req.hotelId  = data.hotel_id ?? null;

    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.userRole) return next(new HttpError(401, 'Authentication required'));
    if (!roles.includes(req.userRole)) return next(new HttpError(403, 'You do not have permission to do this'));
    next();
  };
}
