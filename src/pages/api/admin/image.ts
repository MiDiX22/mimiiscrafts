import type { APIRoute } from 'astro';
import { isLoggedIn, unauthorized } from '../../../lib/admin/auth';
import { readBlob } from '../../../lib/admin/github';

export const prerender = false;

const TYPES: Record<string, string> = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	gif: 'image/gif',
};

/** Mostra al panell una foto que ja és al repositori (per exemple, la d'un esborrany). */
export const GET: APIRoute = async (context) => {
	if (!isLoggedIn(context)) return unauthorized();
	const sha = context.url.searchParams.get('sha') ?? '';
	const ext = (context.url.searchParams.get('ext') ?? '').toLowerCase();
	if (!/^[0-9a-f]{40}$/.test(sha) || !TYPES[ext]) return new Response('Bad request', { status: 400 });
	try {
		const bytes = await readBlob(sha);
		return new Response(new Uint8Array(bytes), {
			headers: {
				'Content-Type': TYPES[ext],
				// El contingut d'un sha no canvia mai.
				'Cache-Control': 'private, max-age=31536000, immutable',
			},
		});
	} catch (error) {
		console.error(error);
		return new Response('Not found', { status: 404 });
	}
};
