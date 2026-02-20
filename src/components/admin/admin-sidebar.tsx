"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
    LayoutDashboard,
    BookOpen,
    FolderTree,
    Megaphone,
    Upload,
    LogOut,
    Gamepad2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/words", icon: BookOpen, label: "Kelimeler" },
    { href: "/admin/categories", icon: FolderTree, label: "Kategoriler" },
    { href: "/admin/announcements", icon: Megaphone, label: "Duyurular" },
    { href: "/admin/bulk-upload", icon: Upload, label: "Toplu Yükleme" },
];

interface AdminSidebarProps {
    username: string;
}

export function AdminSidebar({ username }: AdminSidebarProps) {
    const pathname = usePathname();

    return (
        <aside className="w-64 border-r border-border bg-card/50 flex flex-col h-screen sticky top-0">
            {/* Header */}
            <div className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <Gamepad2 className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h2 className="text-sm font-bold text-foreground">Tabu Admin</h2>
                    <p className="text-xs text-muted-foreground">{username}</p>
                </div>
            </div>

            <Separator />

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1">
                {navItems.map(({ href, icon: Icon, label }) => {
                    const isActive =
                        href === "/admin"
                            ? pathname === "/admin"
                            : pathname.startsWith(href);

                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </Link>
                    );
                })}
            </nav>

            <Separator />

            {/* Footer */}
            <div className="p-3">
                <Link href="/">
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 text-sm text-muted-foreground"
                    >
                        <Gamepad2 className="h-4 w-4" />
                        Oyuna Dön
                    </Button>
                </Link>
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-sm text-destructive hover:text-destructive"
                    onClick={() => signOut({ callbackUrl: "/admin/login" })}
                >
                    <LogOut className="h-4 w-4" />
                    Çıkış Yap
                </Button>
            </div>
        </aside>
    );
}
