// src/lib/sanity.client.ts
import { createClient } from "next-sanity";

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!, // set by the init
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,      // set by the init
  apiVersion: "2025-01-01",
  useCdn: true,
});
