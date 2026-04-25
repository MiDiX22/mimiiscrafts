import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    craftType: z.string(),
    youTubeVideoID: z.string().optional(),
    videoUrl: z
      .string()
      .refine(
        (value) => value.startsWith('/') || /^https?:\/\//.test(value),
        'videoUrl must be a relative path starting with "/" or an absolute http(s) URL'
      )
      .optional(),
    cardImage: z.string(),
    description: z.string(),
    shortMakerNote: z.string(),
    processGallery: z.array(z.string()).default([])
  })
});

export const collections = { projects };
