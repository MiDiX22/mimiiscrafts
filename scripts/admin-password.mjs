// Genera el hash de la contrasenya del panell /admin.
// Ús: node scripts/admin-password.mjs "la-nova-contrasenya"
import { randomBytes, scryptSync } from 'node:crypto';

const password = process.argv[2];
if (!password) {
	console.error('Ús: node scripts/admin-password.mjs "la-nova-contrasenya"');
	process.exit(1);
}
const salt = randomBytes(16).toString('hex');
const hash = scryptSync(password, salt, 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString('hex');
console.log('Enganxa això a src/lib/admin/credentials.ts:\n');
console.log(`export const ADMIN_PASSWORD_SALT = '${salt}';`);
console.log(`export const ADMIN_PASSWORD_HASH = '${hash}';`);
