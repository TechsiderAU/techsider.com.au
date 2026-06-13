import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const insights = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/insights" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    pillar: z.enum([
      "LLMOps & reliability",
      "RAG & retrieval",
      "Agentic systems",
      "Sovereignty & compliance",
      "Vendor-neutral platform",
      "How we deliver",
    ]),
    sectors: z
      .array(
        z.enum([
          "Financial services",
          "Government & public sector",
          "Healthcare & life sciences",
          "Resources, energy & utilities",
        ]),
      )
      .optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { insights };
