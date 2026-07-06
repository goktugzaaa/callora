import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import LogoutButton from "@/components/LogoutButton";
import PanelNav from "@/components/PanelNav";
import Logo from "@/components/Logo";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/giris");

  const business = await db.business.findUnique({
    where: { id: session.businessId },
    select: { name: true },
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-line bg-surface/50 md:min-h-screen">
        <div className="p-4 md:p-5 flex md:flex-col gap-4 md:gap-0 items-center md:items-stretch justify-between">
          <Logo />
          <p className="hidden md:block text-xs text-muted mt-2 truncate">{business?.name}</p>
          <PanelNav />
          <div className="hidden md:block mt-auto pt-6">
            <LogoutButton />
          </div>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 max-w-5xl w-full mx-auto">{children}</main>
    </div>
  );
}
