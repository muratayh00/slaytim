const ADMIN_ROLES = new Set(['moderator', 'support', 'analytics', 'operations', 'super_admin']);

const hasAdminAccess = (user) => {
  if (!user) return false;
  if (user.isAdmin === true) return true;
  if (typeof user.role !== 'string') return false;
  return ADMIN_ROLES.has(user.role);
};

module.exports = {
  ADMIN_ROLES,
  hasAdminAccess,
};
