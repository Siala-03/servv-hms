export type UserRole = 'superadmin' | 'manager' | 'front_desk' | 'housekeeping' | 'fnb';

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin:   'Super Admin',
  manager:      'General Manager',
  front_desk:   'Front Desk',
  housekeeping: 'Housekeeping',
  fnb:          'F&B',
};

// Which roles can access each route
export const ROUTE_ROLES: Record<string, UserRole[]> = {
  '/':             ['superadmin', 'manager', 'front_desk', 'housekeeping', 'fnb'],
  '/reservations': ['superadmin', 'manager', 'front_desk'],
  '/channels':     ['superadmin', 'manager'],
  '/front-desk':   ['superadmin', 'manager', 'front_desk'],
  '/guests':       ['superadmin', 'manager', 'front_desk'],
  '/staff':        ['superadmin', 'manager'],
  '/orders':       ['superadmin', 'manager', 'front_desk', 'fnb'],
  '/housekeeping': ['superadmin', 'manager', 'housekeeping'],
  '/reports':      ['superadmin', 'manager'],
  '/intelligence': ['superadmin', 'manager'],
  '/users':        ['superadmin', 'manager'],
  '/superadmin':   ['superadmin'],
};

export function canAccess(role: UserRole | undefined, path: string): boolean {
  if (!role) return false;
  const allowed = ROUTE_ROLES[path] ?? ROUTE_ROLES['/'];
  return allowed.includes(role);
}

// Where to land after login
export const ROLE_HOME: Record<UserRole, string> = {
  superadmin:   '/superadmin',
  manager:      '/',
  front_desk:   '/front-desk',
  housekeeping: '/housekeeping',
  fnb:          '/orders',
};
