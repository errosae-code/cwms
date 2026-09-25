"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function SaveToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = searchParams.get("saved");
    if (!saved) return;
    const text = saved === "1" ? "✓ Saved successfully." : `✓ ${decodeURIComponent(saved)}`;
    setMessage(text);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("saved");
    const clean = params.toString();
    const timer = window.setTimeout(() => {
      setMessage("");
      router.replace(clean ? `${pathname}?${clean}` : pathname, { scroll: false });
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [pathname, router, searchParams]);

  if (!message) return null;
  return <div role="status" aria-live="polite" style={{ position: "fixed", top: 20, right: 24, zIndex: 1000, padding: "12px 18px", borderRadius: 10, background: "#ECFDF3", border: "1px solid #ABEFC6", color: "#067647", fontWeight: 700, boxShadow: "0 8px 24px rgba(15,23,42,.14)" }}>{message}</div>;
}
