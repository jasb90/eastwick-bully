'use client';

import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { NextStudio } from 'next-sanity/studio';
import config from '../../../sanity/sanity.config';

// One place to read the env key
const ENV_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY;

// Session flag key
const SESSION_FLAG = 'ewb_admin_ok';

export default function AdminStudioPage() {
  const params = useSearchParams();
  const urlKey = params.get('key');

  // In development, allow without a key
  const devBypass = process.env.NODE_ENV !== 'production';

  // Have we already authorized this browser tab in this session?
  const sessionAuthorized =
    typeof window !== 'undefined' && sessionStorage.getItem(SESSION_FLAG) === '1';

  // Are we authorized *this render*?
  const isAuthorized = useMemo(() => {
    if (devBypass) return true;
    if (sessionAuthorized) return true;
    return urlKey && ENV_KEY && urlKey === ENV_KEY;
  }, [devBypass, sessionAuthorized, urlKey]);

  // If the URL key matches, remember it for the rest of the session so
  // internal Studio navigation keeps working.
  useEffect(() => {
    if (!devBypass && urlKey && ENV_KEY && urlKey === ENV_KEY) {
      sessionStorage.setItem(SESSION_FLAG, '1');
    }
  }, [urlKey, devBypass]);

  if (!isAuthorized) {
    return (
      <div style={{ padding: 80, fontSize: 18, lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Not authorized</div>
        <div>
          Open this page with your key, e.g.:
          <div style={{ marginTop: 6, fontFamily: 'monospace' }}>
            /secret-admin?key=YOUR_KEY
          </div>
        </div>
      </div>
    );
  }

  return <NextStudio config={config} />;
}
