// src/app/page.tsx
import { sanityClient } from "@/lib/sanity.client";
import EastwickBullySite from "@/components/EastwickBullySite";

export const revalidate = 0;              // always fresh
export const dynamic = "force-dynamic";   // opt out of caching

type Track = {
  id: string;
  title: string;
  album?: string;
  src: string;       // direct URL to Sanity file
  color?: string;
  tag?: string;
  x?: number;
  y?: number;
};

const query = `
*[_type == "track"] | order(coalesce(order, _createdAt) asc){
  "id": _id,
  title,
  album,
  // dereference the file asset -> get public URL
  "src": audio.asset->url,
  color,
  tag,
  "x": coalesce(x, 50),
  "y": coalesce(y, 50)
}
`;

export default async function Page() {
  const tracks = await sanityClient.fetch<Track[]>(query);
return <EastwickBullySite tracks={tracks} />;
}
