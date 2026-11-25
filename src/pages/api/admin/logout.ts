import type { APIRoute } from 'astro';
import { SESSION_COOKIE, json } from '../../../lib/admin/auth';

export const prerender = false;

export const POST: APIRoute = ({ cookies }) => {
	cookies.delete(SESSION_COOKIE, { path: '/' });
	return json({ ok: true });
};
