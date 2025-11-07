import EastwickBullySite from '@/components/EastwickBullySite';
import { sanityClient } from '@/lib/sanity.client';

type Track = {
  id: string;
  title: string;
  album?: string;
  src: string;
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
  "src": audio.asset->url,
  color,
  tag,
  "x": coalesce(x, 50),
  "y": coalesce(y, 50)
}
`;

export default async function Page() {
  let tracks: Track[] = [];
  try {
    tracks = await sanityClient.fetch<Track[]>(query);
  } catch (e) {
    // fail safe: render the page without crashing
    console.error('Sanity fetch failed', e);
    tracks = [];
  }
  return <EastwickBullySite tracks={tracks} />;
}
