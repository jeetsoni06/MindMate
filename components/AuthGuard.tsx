"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Require active session authentication every time app is entered
    const token = sessionStorage.getItem("soul_link_id");
    if (!token) {
      setAuthorized(false);
      router.replace("/auth");
    } else {
      setAuthorized(true);
    }
  }, [router]);

  if (!authorized) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#FDF8F9]">
        <div className="animate-pulse flex items-center gap-2 font-bold text-[#b42243]">
          Securing Sanctuary Vault...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
