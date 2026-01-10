"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/cms");
  }, [router]);

  return (
    <div className="min-h-screen bg-[--background] flex items-center justify-center">
      <p className="text-[--muted]">Redirecting...</p>
    </div>
  );
}
