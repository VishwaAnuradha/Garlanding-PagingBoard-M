import crypto from 'crypto';
const secret = () => process.env.SESSION_SECRET || 'replace-this-development-session-secret';
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
export const createSessionToken = (epfNumber, role = 'staff', sessionId = null, airport = 'BIA') => { const payload = encode({ epfNumber, role, sessionId, airport, exp: Date.now() + 28800000 }); return `${payload}.${crypto.createHmac('sha256', secret()).update(payload).digest('base64url')}`; };
export const readSessionToken = token => { const [payload, signature] = String(token || '').split('.'); if (!payload || !signature) return null; const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url'); if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null; const data = JSON.parse(Buffer.from(payload, 'base64url').toString()); return data.exp > Date.now() ? data : null; };
