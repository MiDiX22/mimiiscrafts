import type { APIRoute } from 'astro';
import { isLoggedIn, json, unauthorized } from '../../../lib/admin/auth';
import { GitHubError } from '../../../lib/admin/github';
import {
	ValidationError,
	deleteProject,
	listProjects,
	saveProject,
	type ProjectInput,
} from '../../../lib/admin/projects';

export const prerender = false;

const fail = (error: unknown) => {
	if (error instanceof ValidationError) return json({ error: error.message }, 400);
	console.error(error);
	if (error instanceof GitHubError && error.status === 401)
		return json({ error: 'El GITHUB_TOKEN no és vàlid o ha caducat.' }, 500);
	return json({ error: 'No s’ha pogut connectar amb GitHub. Torna-ho a provar.' }, 500);
};

export const GET: APIRoute = async (context) => {
	if (!isLoggedIn(context)) return unauthorized();
	try {
		return json({ projects: await listProjects() });
	} catch (error) {
		return fail(error);
	}
};

export const POST: APIRoute = async (context) => {
	if (!isLoggedIn(context)) return unauthorized();
	try {
		const input = (await context.request.json()) as ProjectInput;
		const slug = await saveProject(input);
		return json({ ok: true, slug });
	} catch (error) {
		return fail(error);
	}
};

export const DELETE: APIRoute = async (context) => {
	if (!isLoggedIn(context)) return unauthorized();
	try {
		const slug = context.url.searchParams.get('slug') ?? '';
		await deleteProject(slug);
		return json({ ok: true });
	} catch (error) {
		return fail(error);
	}
};
