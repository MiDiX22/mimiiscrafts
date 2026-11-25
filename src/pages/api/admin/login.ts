import type { APIRoute } from 'astro';
import { SESSION_COOKIE, adminConfigured, checkCredentials, createSessionValue, json } from '../../../lib/admin/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, url }) => {
	if (!adminConfigured())
		return json({ error: 'Falten ADMIN_USER i ADMIN_PASSWORD a la configuració de Vercel.' }, 500);

	const body = (await request.json().catch(() => ({}))) as { usuari?: string; contrasenya?: string };
	if (!checkCredentials(String(body.usuari ?? ''), String(body.contrasenya ?? ''))) {
		// Una petita espera fa més lent provar contrasenyes a l'atzar.
		await new Promise((resolve) => setTimeout(resolve, 800));
		return json({ error: 'Usuari o contrasenya incorrectes.' }, 401);
	}

	const session = createSessionValue();
	cookies.set(SESSION_COOKIE, session.value, {
		path: '/',
		httpOnly: true,
		sameSite: 'strict',
		secure: url.protocol === 'https:',
		expires: session.expires,
	});
	return json({ ok: true });
};
