import crypto from 'crypto';
export const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
export const passwordMatches = (password, stored) => { const [salt, saved] = stored.split(':'); if (!salt || !saved) return false; const computed = crypto.scryptSync(password, salt, 64).toString('hex'); return crypto.timingSafeEqual(Buffer.from(saved, 'hex'), Buffer.from(computed, 'hex')); };
