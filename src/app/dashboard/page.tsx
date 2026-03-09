import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuthenticatedDashboardHome } from "@/components/game/authenticated-dashboard-home";
import type { DashboardTab } from "@/components/game/dashboard-nav";

interface DashboardPageProps {
  searchParams: Promise<{
    tab?: string;
  }>;
}

const allowedTabs = new Set<DashboardTab>(["play", "dash", "inventory", "shop", "settings"]);

function resolveDashboardTab(tab: string | undefined): DashboardTab {
  if (tab && allowedTabs.has(tab as DashboardTab)) {
    return tab as DashboardTab;
  }

  return "dash";
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const { tab } = await searchParams;
  return <AuthenticatedDashboardHome defaultTab={resolveDashboardTab(tab)} />;
}
