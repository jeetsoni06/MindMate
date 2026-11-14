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
      return;
    }

    setAuthorized(true);

    // Initial heartbeat & periodic activity timer (every 30s)
    const sendHeartbeat = async () => {
      try {
        const res = await fetch('/api/user/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: token })
        });
        const data = await res.json();
        if (data.blocked) {
          sessionStorage.clear();
          localStorage.removeItem("soul_link_id");
          localStorage.removeItem("soul_link_username");
          router.replace("/auth?blocked=1");
        }
      } catch (err) {
        // network resilience
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000);

    return () => clearInterval(interval);
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
