import { defineCollection, z } from 'astro:content';
import { youtubePattern } from '../lib/youtube';

const youtubeUrl = z
	.string()
	.trim()
	.refine(
		(value) => youtubePattern.test(value),
		'Ha de ser un enllaç de YouTube (watch, youtu.be, shorts o embed)'
	);

// Els esborranys (esborrany: true) poden estar a mitges i no surten a la web.
// Els publicats han de tenir descripció, etiqueta i almenys una imatge.
const projects = defineCollection({
	type: 'content',
	schema: ({ image }) =>
		z
			.object({
				titol: z.string().min(1),
				descripcio: z.string().default(''),
				tag: z.string().default(''),
				imatges: z.array(image()).default([]),
				youtube: youtubeUrl.optional(),
				esborrany: z.boolean().default(false),
			})
			.superRefine((data, ctx) => {
				if (data.esborrany) return;
				if (!data.descripcio.trim())
					ctx.addIssue({ code: 'custom', path: ['descripcio'], message: 'Falta la descripció' });
				if (!data.tag.trim())
					ctx.addIssue({ code: 'custom', path: ['tag'], message: 'Falta l’etiqueta' });
				if (data.imatges.length === 0)
					ctx.addIssue({ code: 'custom', path: ['imatges'], message: 'Cal almenys una imatge' });
			}),
});

export const collections = { projects };
