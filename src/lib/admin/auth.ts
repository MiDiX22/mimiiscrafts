import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { APIContext, AstroGlobal } from 'astro';
import { ADMIN_PASSWORD, ADMIN_USER, GITHUB_TOKEN } from 'astro:env/server';

export const SESSION_COOKIE = 'mimi_admin';
const SESSION_DAYS = 14;

const sha256 = (value: string) => createHash('sha256').update(value).digest();

// Comparació de temps constant: es comparen els hash perquè tinguin la mateixa mida.
const safeEqual = (a: string, b: string) => timingSafeEqual(sha256(a), sha256(b));

export const adminConfigured = () => Boolean(ADMIN_USER && ADMIN_PASSWORD);

// La clau de signatura depèn de la contrasenya: si es canvia, totes les sessions caduquen.
const signingKey = () => sha256(`mimi-admin:${ADMIN_PASSWORD}:${GITHUB_TOKEN ?? ''}`);

const sign = (payload: string) =>
	createHmac('sha256', signingKey()).update(payload).digest('base64url');

export const checkCredentials = (user: string, password: string) => {
	if (!adminConfigured()) return false;
	// Les dues comprovacions s'executen sempre, per no revelar quina ha fallat.
	const userOk = safeEqual(user.trim(), ADMIN_USER!);
	const passwordOk = safeEqual(password, ADMIN_PASSWORD!);
	return userOk && passwordOk;
};

export const createSessionValue = () => {
	const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
	const payload = String(expires);
	return { value: `${payload}.${sign(payload)}`, expires: new Date(expires) };
};

const isValidSession = (value: string | undefined) => {
	if (!value || !adminConfigured()) return false;
	const [payload, signature] = value.split('.');
	if (!payload || !signature) return false;
	if (!safeEqual(signature, sign(payload))) return false;
	return Number(payload) > Date.now();
};

export const isLoggedIn = (context: APIContext | AstroGlobal) =>
	isValidSession(context.cookies.get(SESSION_COOKIE)?.value);

export const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
	});

export const unauthorized = () => json({ error: 'Has de tornar a iniciar la sessió.' }, 401);
