"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Directly enter the app
    const sessionToken = sessionStorage.getItem("soul_link_id");
    if (sessionToken) {
      router.replace("/journal");
    } else {
      router.replace("/auth");
    }
  }, [router]);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#FDF8F9]">
      <div className="animate-pulse flex items-center gap-2 font-bold text-[#b42243]">
        Entering MindMate Sanctuary...
      </div>
    </div>
  );
}
