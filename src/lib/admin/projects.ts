import { parse, stringify } from 'yaml';
import { youtubePattern } from '../youtube';
import { commitChanges, listDirectory, readBlob, type FileChange } from './github';

export const PROJECTS_DIR = 'src/content/projects';
export const MEDIA_DIR = `${PROJECTS_DIR}/media`;

export type AdminImage = { path: string; sha: string };

export type AdminProject = {
	slug: string;
	titol: string;
	descripcio: string;
	tag: string;
	youtube: string;
	esborrany: boolean;
	imatges: AdminImage[];
};

export type ImageInput = { path: string } | { sha: string; ext: string };

export type ProjectInput = {
	slug?: string;
	titol: string;
	descripcio: string;
	tag: string;
	youtube: string;
	imatges: ImageInput[];
	publicar: boolean;
};

const SHA = /^[0-9a-f]{40}$/;
const EXTENSIONS = new Set(['jpg', 'png', 'webp', 'gif']);

export const slugify = (value: string) =>
	value
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/l·l/g, 'll')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60) || 'projecte';

const isProjectFile = (name: string) => name.endsWith('.md') && !name.startsWith('_');

const splitFrontmatter = (source: string) => {
	const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) return { data: {} as Record<string, unknown>, body: source };
	return { data: (parse(match[1]) ?? {}) as Record<string, unknown>, body: match[2] };
};

const toRepoPath = (relative: string) => `${PROJECTS_DIR}/${relative.replace(/^\.\//, '')}`;
const toRelative = (repoPath: string) => `./${repoPath.slice(PROJECTS_DIR.length + 1)}`;

/** Llegeix tots els projectes (esborranys i publicats) directament de GitHub. */
export const listProjects = async (): Promise<AdminProject[]> => {
	const [files, media] = await Promise.all([listDirectory(PROJECTS_DIR), listDirectory(MEDIA_DIR)]);
	const mediaSha = new Map(media.map((entry) => [entry.path, entry.sha]));

	const projects = await Promise.all(
		files
			.filter((entry) => isProjectFile(entry.path.split('/').pop()!))
			.map(async (entry) => {
				const { data } = splitFrontmatter((await readBlob(entry.sha)).toString('utf8'));
				const imatges = Array.isArray(data.imatges) ? data.imatges.map(String) : [];
				return {
					slug: entry.path.split('/').pop()!.replace(/\.md$/, ''),
					titol: String(data.titol ?? ''),
					descripcio: String(data.descripcio ?? '').trimEnd(),
					tag: String(data.tag ?? ''),
					youtube: String(data.youtube ?? ''),
					esborrany: data.esborrany === true,
					imatges: imatges
						.map((relative) => toRepoPath(relative))
						.filter((path) => mediaSha.has(path))
						.map((path) => ({ path, sha: mediaSha.get(path)! })),
				} satisfies AdminProject;
			})
	);

	return projects.sort((a, b) => a.titol.localeCompare(b.titol, 'ca'));
};

export class ValidationError extends Error {}

const validate = (input: ProjectInput) => {
	const titol = String(input.titol ?? '').trim();
	const descripcio = String(input.descripcio ?? '').trim();
	const tag = String(input.tag ?? '').trim().toLowerCase();
	const youtube = String(input.youtube ?? '').trim();
	const imatges = Array.isArray(input.imatges) ? input.imatges : [];

	if (!titol) throw new ValidationError('Posa-li un títol.');
	if (youtube && !youtubePattern.test(youtube))
		throw new ValidationError('L’enllaç de YouTube no és vàlid.');
	if (input.publicar) {
		if (!descripcio) throw new ValidationError('Per publicar cal una descripció.');
		if (!tag) throw new ValidationError('Per publicar cal una etiqueta.');
		if (imatges.length === 0) throw new ValidationError('Per publicar cal almenys una imatge.');
	}
	for (const image of imatges) {
		if ('sha' in image) {
			if (!SHA.test(image.sha) || !EXTENSIONS.has(image.ext))
				throw new ValidationError('Hi ha una imatge que no és vàlida.');
		} else if (!String(image.path ?? '').startsWith(`${MEDIA_DIR}/`) || image.path.includes('..')) {
			throw new ValidationError('Hi ha una imatge que no és vàlida.');
		}
	}
	return { titol, descripcio, tag, youtube, imatges };
};

/** Crea o actualitza un projecte amb un sol commit. Retorna el slug (nom del fitxer). */
export const saveProject = async (input: ProjectInput) => {
	const data = validate(input);
	const existing = await listProjects();
	const previous = input.slug ? existing.find((project) => project.slug === input.slug) : undefined;
	if (input.slug && !previous) throw new ValidationError('Aquest projecte ja no existeix.');

	let slug = previous?.slug;
	if (!slug) {
		const base = slugify(data.titol);
		const taken = new Set(existing.map((project) => project.slug));
		slug = base;
		for (let n = 2; taken.has(slug); n += 1) slug = `${base}-${n}`;
	}

	const stamp = Date.now().toString(36);
	const changes: FileChange[] = [];
	const imagePaths = data.imatges.map((image, index) => {
		if ('path' in image) return image.path;
		const path = `${MEDIA_DIR}/${slug}-${stamp}-${index + 1}.${image.ext}`;
		changes.push({ path, blobSha: image.sha });
		return path;
	});

	// Esborra les fotos que s'han tret del projecte (només les que va pujar el panell per a aquest projecte).
	for (const image of previous?.imatges ?? []) {
		if (!imagePaths.includes(image.path) && ownsImage(slug, image.path))
			changes.push({ path: image.path, delete: true });
	}

	const frontmatter: Record<string, unknown> = {
		titol: data.titol,
		descripcio: data.descripcio,
		tag: data.tag,
		imatges: imagePaths.map(toRelative),
	};
	if (data.youtube) frontmatter.youtube = data.youtube;
	if (!input.publicar) frontmatter.esborrany = true;

	changes.push({
		path: `${PROJECTS_DIR}/${slug}.md`,
		content: `---\n${stringify(frontmatter, { lineWidth: 0 })}---\n`,
	});

	const action = input.publicar ? 'Publica' : 'Desa l’esborrany';
	await commitChanges(`${action}: ${data.titol}\n\nFet des del panell /admin.`, changes);
	return slug;
};

const ownsImage = (slug: string, path: string) =>
	path.startsWith(`${MEDIA_DIR}/${slug}-`) &&
	/^[a-z0-9]+-\d+\.\w+$/.test(path.slice(`${MEDIA_DIR}/${slug}-`.length));

export const deleteProject = async (slug: string) => {
	const project = (await listProjects()).find((item) => item.slug === slug);
	if (!project) throw new ValidationError('Aquest projecte ja no existeix.');
	const changes: FileChange[] = [{ path: `${PROJECTS_DIR}/${slug}.md`, delete: true }];
	for (const image of project.imatges) {
		if (ownsImage(slug, image.path)) changes.push({ path: image.path, delete: true });
	}
	await commitChanges(`Esborra: ${project.titol}\n\nFet des del panell /admin.`, changes);
};
