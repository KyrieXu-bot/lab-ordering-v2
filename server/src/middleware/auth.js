const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const REVIEWER_IDS = new Set(
  (process.env.ORDER_REVIEWER_USER_IDS || 'JC0089')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);

function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) return res.status(401).json({ message: '请先登录', code: 'AUTH_REQUIRED' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ message: '登录已失效，请重新登录', code: 'INVALID_TOKEN' });
  }
}

function isReviewer(user) {
  return Boolean(user && REVIEWER_IDS.has(String(user.user_id || user.sub || '')));
}

function isSales(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [user?.role].filter(Boolean);
  return roles.includes('sales');
}

function requireReviewer(req, res, next) {
  if (!isReviewer(req.user)) return res.status(403).json({ message: '仅开单审核员可执行此操作' });
  next();
}

function requireSales(req, res, next) {
  if (!isSales(req.user) || isReviewer(req.user)) {
    return res.status(403).json({ message: '仅业务员可执行此操作' });
  }
  next();
}

function restrictNonRequestWrites(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.path.startsWith('/order-requests')) return next();
  return requireReviewer(req, res, next);
}

module.exports = { requireAuth, requireReviewer, requireSales, restrictNonRequestWrites, isReviewer, isSales, REVIEWER_IDS };
