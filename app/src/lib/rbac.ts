export const ALLOWED_PATHS: Record<string, string[]> = {
  athlete:    ['/content', '/orders', '/profile', '/insights'],
  manager:    ['/athlete-management', '/profile', '/insights', '/content', '/orders'],
  admin:      ['/', '/admin', '/content', '/orders', '/profile', '/accept-invite', '/insights', '/user-directory'],
  superadmin: ['*'],
};
