const { hasAdminAccess } = require('../lib/rbac');

const adminGuard = (req, res, next) => {
  if (!hasAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }
  next();
};

module.exports = adminGuard;
