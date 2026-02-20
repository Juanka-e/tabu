"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Gamepad2, BookOpen, FolderTree } from "lucide-react";

interface DashboardStats {
    onlineKullaniciSayisi: number;
    aktifLobiSayisi: number;
    totalWords: number;
    totalCategories: number;
    wordsByDifficulty: { easy: number; medium: number; hard: number };
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/admin/dashboard-stats")
            .then((res) => res.json())
            .then((data) => {
                setStats(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    // Memoize statCards to avoid recreating array on every render
    const statCards = useMemo(() => [
        {
            title: "Online Kullanıcılar",
            value: stats?.onlineKullaniciSayisi ?? 0,
            icon: Users,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
        },
        {
            title: "Aktif Lobiler",
            value: stats?.aktifLobiSayisi ?? 0,
            icon: Gamepad2,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
        },
        {
            title: "Toplam Kelime",
            value: stats?.totalWords ?? 0,
            icon: BookOpen,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
        },
        {
            title: "Toplam Kategori",
            value: stats?.totalCategories ?? 0,
            icon: FolderTree,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
        },
    ], [stats]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Oyun istatistikleri ve genel bakış
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map(({ title, value, icon: Icon, color, bg }) => (
                    <Card key={title} className="border-border/50">
                        <CardContent className="flex items-center gap-4 p-5">
                            <div className={`p-3 rounded-xl ${bg}`}>
                                <Icon className={`h-5 w-5 ${color}`} />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">
                                    {title}
                                </p>
                                <p className="text-2xl font-bold text-foreground">
                                    {loading ? "—" : value.toLocaleString()}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Difficulty breakdown */}
            {stats?.wordsByDifficulty && (
                <Card className="border-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg">Zorluk Dağılımı</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-6">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                <span className="text-sm text-muted-foreground">Kolay:</span>
                                <span className="text-sm font-bold">
                                    {stats.wordsByDifficulty.easy}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-amber-500" />
                                <span className="text-sm text-muted-foreground">Orta:</span>
                                <span className="text-sm font-bold">
                                    {stats.wordsByDifficulty.medium}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <span className="text-sm text-muted-foreground">Zor:</span>
                                <span className="text-sm font-bold">
                                    {stats.wordsByDifficulty.hard}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
