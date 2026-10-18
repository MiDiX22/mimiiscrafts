import { defineCollection, z } from 'astro:content';

const youtubeUrl = z
	.string()
	.trim()
	.refine(
		(value) =>
			/^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/)|youtu\.be\/)[\w-]{11}([?&].*)?$/.test(
				value
			),
		'Ha de ser un enllaç de YouTube (watch, youtu.be, shorts o embed)'
	);

const projects = defineCollection({
	type: 'content',
	schema: ({ image }) =>
		z.object({
			titol: z.string().min(1),
			descripcio: z.string().min(1),
			tag: z.string().min(1),
			imatges: z.array(image()).min(1),
			youtube: youtubeUrl.optional(),
		}),
});

export const collections = { projects };
