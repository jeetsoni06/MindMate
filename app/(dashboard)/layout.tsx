import BottomNav from "@/components/BottomNav";
import AuthGuard from "@/components/AuthGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#FDF8F9] min-h-screen relative font-['Plus_Jakarta_Sans'] select-none">
      <AuthGuard>
        <div className="pb-[120px]">
          {children}
        </div>
        <BottomNav />
      </AuthGuard>
    </div>
  );
}
