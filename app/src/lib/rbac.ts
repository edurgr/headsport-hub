export const ALLOWED_PATHS: Record<string, string[]> = {
  athlete: ['/content', '/orders', '/profile', '/my-stats'],
  manager: ['/athlete-management', '/profile'],
  admin: ['/', '/admin', '/content', '/orders', '/profile', '/accept-invite', '/analytics'],
  superadmin: ['*'],
};
