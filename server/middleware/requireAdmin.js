export default function requireAdmin(req, res, next) {
  if (!['admin', 'superAdmin'].includes(req.user?.role)) return res.status(403).json({ message: 'Administrator access is required.' });
  next();
}
