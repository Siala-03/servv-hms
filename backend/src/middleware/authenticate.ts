import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { HttpError } from '../lib/errors';

export interface AuthRequest extends Request {
  userId?:   string;
  userRole?: string;
  hotelId?:  string | null;
}

export async function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) throw new HttpError(401, 'Authentication required');

    const { data, error } = await supabase
      .from('hotel_users')
      .select('id, role, hotel_id, is_active')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) throw new HttpError(401, 'Invalid session — please log in again');
    if (!data.is_active) throw new HttpError(401, 'Account has been deactivated');

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
