import type { APIRoute } from 'astro';
import { isLoggedIn, json, unauthorized } from '../../../lib/admin/auth';
import { createBlob } from '../../../lib/admin/github';

export const prerender = false;

// Vercel no accepta peticions de més de 4,5 MB. El navegador redueix les fotos abans d'enviar-les.
const MAX_BYTES = 4 * 1024 * 1024;

const detectExtension = (bytes: Buffer) => {
	if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
	if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
	if (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP')
		return 'webp';
	if (bytes.subarray(0, 4).toString('ascii') === 'GIF8') return 'gif';
	return null;
};

/** Puja una imatge com a blob de GitHub. Encara no apareix enlloc fins que es desa el projecte. */
export const POST: APIRoute = async (context) => {
	if (!isLoggedIn(context)) return unauthorized();
	const bytes = Buffer.from(await context.request.arrayBuffer());
	if (bytes.length === 0) return json({ error: 'La imatge és buida.' }, 400);
	if (bytes.length > MAX_BYTES) return json({ error: 'La imatge és massa gran.' }, 413);
	const ext = detectExtension(bytes);
	if (!ext) return json({ error: 'Format no suportat. Fes servir JPG, PNG, WebP o GIF.' }, 415);
	try {
		return json({ sha: await createBlob(bytes), ext });
	} catch (error) {
		console.error(error);
		return json({ error: 'No s’ha pogut pujar la imatge.' }, 500);
	}
};
