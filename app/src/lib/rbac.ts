export const ALLOWED_PATHS: Record<string, string[]> = {
  athlete: ['/content', '/orders', '/profile', '/my-stats'],
  manager: ['/content', '/orders', '/profile', '/accept-invite', '/analytics'],
  admin: ['/', '/content', '/orders', '/profile', '/accept-invite', '/analytics']
};
