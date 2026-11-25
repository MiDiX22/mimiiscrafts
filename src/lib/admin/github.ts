import { GITHUB_BRANCH, GITHUB_REPO, GITHUB_TOKEN } from 'astro:env/server';

const API = 'https://api.github.com';

export class GitHubError extends Error {
	constructor(
		message: string,
		readonly status: number
	) {
		super(message);
	}
}

export const githubConfigured = () => Boolean(GITHUB_TOKEN);

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
	if (!GITHUB_TOKEN) throw new GitHubError('Falta configurar GITHUB_TOKEN a Vercel.', 500);
	const response = await fetch(`${API}/repos/${GITHUB_REPO}${path}`, {
		...init,
		headers: {
			Accept: 'application/vnd.github+json',
			Authorization: `Bearer ${GITHUB_TOKEN}`,
			'X-GitHub-Api-Version': '2022-11-28',
			...(init.body ? { 'Content-Type': 'application/json' } : {}),
			...init.headers,
		},
	});
	if (!response.ok) {
		const detail = await response.text().catch(() => '');
		throw new GitHubError(`GitHub ${response.status}: ${detail.slice(0, 300)}`, response.status);
	}
	return (await response.json()) as T;
};

type TreeEntry = { path: string; mode: string; type: string; sha: string };

export const getBranchHead = async () => {
	const ref = await request<{ object: { sha: string } }>(`/git/ref/heads/${GITHUB_BRANCH}`);
	const commit = await request<{ tree: { sha: string } }>(`/git/commits/${ref.object.sha}`);
	return { commitSha: ref.object.sha, treeSha: commit.tree.sha };
};

/** Llista els fitxers (no recursiu) d'una carpeta del repositori a la branca de producció. */
export const listDirectory = async (dir: string) => {
	const { treeSha } = await getBranchHead();
	const tree = await request<{ tree: TreeEntry[] }>(`/git/trees/${treeSha}?recursive=1`);
	const prefix = `${dir.replace(/\/$/, '')}/`;
	return tree.tree.filter(
		(entry) => entry.type === 'blob' && entry.path.startsWith(prefix) && !entry.path.slice(prefix.length).includes('/')
	);
};

export const readBlob = async (sha: string) => {
	const blob = await request<{ content: string; encoding: string }>(`/git/blobs/${sha}`);
	return Buffer.from(blob.content, blob.encoding === 'base64' ? 'base64' : 'utf8');
};

export const readFileAtHead = async (path: string) => {
	const file = await request<{ content: string; sha: string }>(
		`/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(GITHUB_BRANCH)}`
	);
	return { sha: file.sha, content: Buffer.from(file.content, 'base64') };
};

export const createBlob = async (content: Buffer) => {
	const blob = await request<{ sha: string }>('/git/blobs', {
		method: 'POST',
		body: JSON.stringify({ content: content.toString('base64'), encoding: 'base64' }),
	});
	return blob.sha;
};

export type FileChange =
	| { path: string; content: string }
	| { path: string; blobSha: string }
	| { path: string; delete: true };

/**
 * Fa un sol commit amb tots els canvis a la branca de producció.
 * Vercel el detecta i torna a construir la web (triga menys d'un minut).
 */
export const commitChanges = async (message: string, changes: FileChange[]) => {
	for (let attempt = 0; attempt < 3; attempt += 1) {
		const head = await getBranchHead();
		const tree = await request<{ sha: string }>('/git/trees', {
			method: 'POST',
			body: JSON.stringify({
				base_tree: head.treeSha,
				tree: changes.map((change) => {
					if ('delete' in change) return { path: change.path, mode: '100644', type: 'blob', sha: null };
					if ('blobSha' in change)
						return { path: change.path, mode: '100644', type: 'blob', sha: change.blobSha };
					return { path: change.path, mode: '100644', type: 'blob', content: change.content };
				}),
			}),
		});
		const commit = await request<{ sha: string }>('/git/commits', {
			method: 'POST',
			body: JSON.stringify({ message, tree: tree.sha, parents: [head.commitSha] }),
		});
		try {
			await request(`/git/refs/heads/${GITHUB_BRANCH}`, {
				method: 'PATCH',
				body: JSON.stringify({ sha: commit.sha, force: false }),
			});
			return commit.sha;
		} catch (error) {
			// Algú altre ha fet un commit mentrestant: es torna a provar sobre el nou estat.
			if (error instanceof GitHubError && error.status === 422 && attempt < 2) continue;
			throw error;
		}
	}
	throw new GitHubError('No s’ha pogut desar després de diversos intents.', 409);
};
