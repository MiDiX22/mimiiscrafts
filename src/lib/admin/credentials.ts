/**
 * Usuari i contrasenya del panell /admin.
 *
 * La contrasenya no es guarda tal qual, sinó com a "hash" (una empremta que no es pot desfer),
 * perquè qui llegeixi el codi no la pugui veure. Per canviar-la, executa al terminal:
 *
 *   node scripts/admin-password.mjs "la-nova-contrasenya"
 *
 * i enganxa aquí les dues línies que et doni.
 */
export const ADMIN_USER = 'mimi';
export const ADMIN_PASSWORD_SALT = 'efa6ef4de9710684900cd97eb3357d3b';
export const ADMIN_PASSWORD_HASH = '0a8dd4de5ed35a52991692da60c4066bf3bc9399e116d28fae8373eca2eeabcd';
