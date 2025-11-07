"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { NextStudio } from "next-sanity/studio";
import config from "../../../../sanity/sanity.config";

const SESSION_FLAG = "ewb-admin-ok";

export default function AdminStudioPage() {
  const params = useSearchParams();
  const envKey = process.env.NEXT_PUBLIC_ADMIN_KEY;
  const urlKey = params.get("key");

  // If correct key is present in the URL once, remember it for this tab.
  useEffect(() => {
    if (envKey && urlKey && urlKey === envKey) {
      try {
        sessionStorage.setItem(SESSION_FLAG, "1");
      } catch {}
      // Clean the URL (remove ?key=...)
      try {
        const u = new URL(window.location.href);
        u.searchParams.delete("key");
        window.history.replaceState({}, "", u.toString());
      } catch {}
    }
  }, [envKey, urlKey]);

  const authorized = useMemo(() => {
    if (envKey && urlKey === envKey) return true;
    try {
      return sessionStorage.getItem(SESSION_FLAG) === "1";
    } catch {
      return false;
    }
  }, [envKey, urlKey]);

  if (!authorized) {
    return (
      <div style={{ padding: 80, fontSize: 18 }}>
        Not authorized.<br />
        Append <code>?key=YOUR_KEY</code> to the URL to unlock this tab.
      </div>
    );
  }

  return <NextStudio config={config} />;
}
