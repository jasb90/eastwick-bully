import { createClient } from "@sanity/client";
import { sanityConfig } from "./config";

export async function getTracks() {
  const client = createClient(sanityConfig);

  const tracks = await client.fetch(`
    *[_type == "track"] | order(order asc) {
      title,
      album,
      tag,
      color,
      x,
      y,
      "src": audio.asset->url
    }
  `);

  return tracks;
}
