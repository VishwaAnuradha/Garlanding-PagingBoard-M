import { readSessionToken } from '../utils/sessionToken.js';
export default function requireAuth(req, res, next) { const session = readSessionToken(req.headers.authorization?.replace(/^Bearer\s+/i, '')); if (!session) return res.status(401).json({ message: 'Please sign in to continue.' }); req.user = session; next(); }
