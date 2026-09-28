import { defineCollection, reference } from "astro:content";
import { glob } from "astro/loaders";
import { optionalGlob } from "./content/optional-glob";
import {
  makeDemoSchema,
  makeIndustrySchema,
  makeInsightSchema,
  makeKitSchema,
  makeSolutionSchema,
  regulatoryFile,
  traceFile,
} from "./content/schemas";

// Entry id = file name without extension = the page's nav.ts slug (spec §11.2).
// Page identity (name, path, one-liner) lives in src/data/nav.ts only; these hold content and relationships.

const insights = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/insights" }),
  schema: makeInsightSchema(reference),
});

const solutions = defineCollection({
  loader: optionalGlob({ pattern: "*.yaml", base: "./src/content/solutions" }),
  schema: makeSolutionSchema(reference),
});

const industries = defineCollection({
  loader: optionalGlob({ pattern: "*.yaml", base: "./src/content/industries" }),
  schema: makeIndustrySchema(reference),
});

const kits = defineCollection({
  loader: optionalGlob({ pattern: "*.yaml", base: "./src/content/kits" }),
  schema: makeKitSchema(reference),
});

const regulatory = defineCollection({
  loader: optionalGlob({ pattern: "*.json", base: "./src/data/regulatory" }),
  schema: regulatoryFile,
});

const demos = defineCollection({
  loader: optionalGlob({ pattern: "*.json", base: "./src/data/demos" }),
  schema: makeDemoSchema(reference),
});

const traces = defineCollection({
  loader: optionalGlob({ pattern: "*.json", base: "./src/data/traces" }),
  schema: traceFile,
});

export const collections = { insights, solutions, industries, kits, regulatory, demos, traces };
