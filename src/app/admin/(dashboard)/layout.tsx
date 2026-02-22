import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session || role !== "admin") redirect("/login");

    return (
        <div className="min-h-screen bg-background flex">
            <AdminSidebar username={session.user?.name || "Admin"} />
            <main className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</main>
        </div>
    );
}
