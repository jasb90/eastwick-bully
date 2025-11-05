'use client';

export const dynamic = "force-dynamic";

import { useSearchParams } from 'next/navigation';
import { NextStudio } from 'next-sanity/studio';
import config from '../../../../sanity/sanity.config';

export default function AdminStudioPage() {
  const params = useSearchParams();
  const key = params.get('key');

  if (key !== process.env.NEXT_PUBLIC_ADMIN_KEY) {
    return <div style={{padding:80, fontSize:18}}>Not authorized</div>;
  }

  return <NextStudio config={config} />;
}
