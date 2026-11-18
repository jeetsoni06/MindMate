"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AiFriendRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/chat");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FDF8F9] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-[#b42243] border-t-transparent animate-spin"></div>
    </div>
  );
}
