"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Activity, Search } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminToolbar, AdminToolbarStats } from "@/components/admin/admin-toolbar";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminEmptyState, AdminTableShell } from "@/components/admin/admin-table-shell";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { AdminAuditListResponse, AdminAuditLogView } from "@/types/admin-audit";

type EconomyGuardFilter = "" | "match_reward" | "triggered" | "ceiling" | "repeated_group";

const economyGuardPresets: Array<{
    value: EconomyGuardFilter;
    label: string;
    description: string;
}> = [
    { value: "", label: "Tum Kayitlar", description: "Standart audit gorunumu." },
    {
        value: "match_reward",
        label: "Mac Odulleri",
        description: "Tum match finalize kayitlarini gosterir.",
    },
    {
        value: "triggered",
        label: "Koruma Tetikleri",
        description: "Ceiling veya tekrar grup etkisi alan maclari gosterir.",
    },
    {
        value: "ceiling",
        label: "Ceiling",
        description: "Rolling soft cap / hard ceiling tetiklerini izole eder.",
    },
    {
        value: "repeated_group",
        label: "Tekrar Grup",
        description: "Ayni lineup damping tetiklerini izole eder.",
    },
];

function formatDateTime(value: string): string {
    return new Date(value).toLocaleString("tr-TR", {
        dateStyle: "short",
        timeStyle: "short",
    });
}

function renderMetadata(metadata: Record<string, string>): string {
    const entries = Object.entries(metadata);
    if (entries.length === 0) {
        return "-";
    }

    return entries.map(([key, value]) => `${key}: ${value}`).join(" | ");
}

function renderEconomyGuard(log: AdminAuditLogView): string {
    if (!log.economyGuard) {
        return "-";
    }

    const parts: string[] = [];

    if (log.economyGuard.rewardSource) {
        parts.push(`Kaynak: ${log.economyGuard.rewardSource}`);
    }

    if (
        log.economyGuard.requestedRewardCoin !== null &&
        log.economyGuard.allowedRewardCoin !== null
    ) {
        parts.push(
            `Odul: ${log.economyGuard.requestedRewardCoin} -> ${log.economyGuard.allowedRewardCoin}`
        );
    }

    if ((log.economyGuard.blockedRewardCoin ?? 0) > 0) {
        parts.push(`Kesilen: ${log.economyGuard.blockedRewardCoin}`);
    }

    if (log.economyGuard.rewardGuardTriggered) {
        parts.push(`Ceiling: ${log.economyGuard.rewardGuardBand ?? "aktif"}`);
    }

    if (log.economyGuard.repeatedGroupTriggered) {
        const ordinal =
            log.economyGuard.repeatedGroupOrdinal !== null &&
            log.economyGuard.repeatedGroupThreshold !== null
                ? `${log.economyGuard.repeatedGroupOrdinal}. mac / esik ${log.economyGuard.repeatedGroupThreshold}`
                : "aktif";
        parts.push(`Tekrar grup: ${ordinal}`);
    }

    return parts.length > 0 ? parts.join(" | ") : "-";
}

export default function AdminAuditPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [logs, setLogs] = useState<AdminAuditLogView[]>([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [action, setAction] = useState("");
    const [resourceType, setResourceType] = useState("");
    const [actorRole, setActorRole] = useState("");
    const [economyGuard, setEconomyGuard] = useState<EconomyGuardFilter>("");
    const [actionOptions, setActionOptions] = useState<string[]>([]);
    const [resourceTypeOptions, setResourceTypeOptions] = useState<string[]>([]);
    const [roleOptions, setRoleOptions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setSearch((searchParams.get("search") ?? "").trim());
        setAction(searchParams.get("action") ?? "");
        setResourceType(searchParams.get("resourceType") ?? "");
        setActorRole(searchParams.get("actorRole") ?? "");
        const nextEconomyGuard = (searchParams.get("economyGuard") ?? "") as EconomyGuardFilter;
        setEconomyGuard(nextEconomyGuard);
        setPage(Number(searchParams.get("page") ?? "1") || 1);
    }, [searchParams]);

    useEffect(() => {
        const params = new URLSearchParams();

        if (page > 1) {
            params.set("page", String(page));
        }
        if (search.trim()) {
            params.set("search", search.trim());
        }
        if (action) {
            params.set("action", action);
        }
        if (resourceType) {
            params.set("resourceType", resourceType);
        }
        if (actorRole) {
            params.set("actorRole", actorRole);
        }
        if (economyGuard) {
            params.set("economyGuard", economyGuard);
        }

        const next = params.toString();
        const current =
            typeof window === "undefined"
                ? ""
                : window.location.search.startsWith("?")
                  ? window.location.search.slice(1)
                  : window.location.search;

        if (next !== current) {
            router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
        }
    }, [action, actorRole, economyGuard, page, pathname, resourceType, router, search]);

    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: "15",
            });
            if (search.trim()) params.set("search", search.trim());
            if (action) params.set("action", action);
            if (resourceType) params.set("resourceType", resourceType);
            if (actorRole) params.set("actorRole", actorRole);
            if (economyGuard) params.set("economyGuard", economyGuard);

            const response = await fetch(`/api/admin/audit?${params.toString()}`, {
                cache: "no-store",
            });
            if (!response.ok) {
                return;
            }

            const payload = (await response.json()) as AdminAuditListResponse;
            setLogs(payload.logs);
            setPage(payload.page);
            setPages(payload.pages);
            setTotal(payload.total);
            setActionOptions(payload.actionOptions);
            setResourceTypeOptions(payload.resourceTypeOptions);
            setRoleOptions(payload.roleOptions);
        } finally {
            setLoading(false);
        }
    }, [action, actorRole, economyGuard, page, resourceType, search]);

    useEffect(() => {
        void loadLogs();
    }, [loadLogs]);

    useEffect(() => {
        setPage(1);
    }, [search, action, resourceType, actorRole, economyGuard]);

    const stats = useMemo(
        () => [
            { label: "gorunen", value: String(logs.length) },
            { label: "toplam", value: String(total) },
            { label: "sayfa", value: `${page} / ${pages}` },
        ],
        [logs.length, page, pages, total]
    );

    const activePreset =
        economyGuardPresets.find((preset) => preset.value === economyGuard) ?? economyGuardPresets[0];

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="Audit Kayitlari"
                description="Admin ve sistem operasyonlarinin izini tek ekranda takip edin."
                meta={`${total} kayit`}
                icon={<Activity className="h-5 w-5 text-emerald-500" />}
            />

            <AdminToolbar>
                <div className="flex-1 space-y-3">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="relative md:col-span-2 xl:col-span-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Action, admin, resource veya ozet ara..."
                                className="pl-9"
                            />
                        </div>

                        <select
                            value={action}
                            onChange={(event) => setAction(event.target.value)}
                            className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none"
                        >
                            <option value="">Tum action&apos;lar</option>
                            {actionOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>

                        <select
                            value={resourceType}
                            onChange={(event) => setResourceType(event.target.value)}
                            className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none"
                        >
                            <option value="">Tum resource tipleri</option>
                            {resourceTypeOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>

                        <select
                            value={actorRole}
                            onChange={(event) => setActorRole(event.target.value)}
                            className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none"
                        >
                            <option value="">Tum roller</option>
                            {roleOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <div>
                                <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                    Economy Review
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {activePreset.description}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {economyGuardPresets.map((preset) => {
                                const active = preset.value === economyGuard;
                                return (
                                    <button
                                        key={preset.value || "all"}
                                        type="button"
                                        onClick={() => setEconomyGuard(preset.value)}
                                        className={`rounded-2xl border px-3 py-2 text-sm transition ${
                                            active
                                                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700"
                                                : "border-border/60 bg-background text-foreground hover:border-emerald-400/40 hover:bg-emerald-500/5"
                                        }`}
                                    >
                                        {preset.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <AdminToolbarStats stats={stats} />
            </AdminToolbar>

            <AdminTableShell
                title="Audit Gecmisi"
                description="En son operasyonlar tarih, actor, action, not ve koruma ozeti ile listelenir."
                loading={loading}
                isEmpty={!loading && logs.length === 0}
                emptyState={
                    <AdminEmptyState
                        icon={<Activity className="h-6 w-6" />}
                        title="Audit kaydi bulunamadi"
                        description="Mevcut filtrelerle eslesen bir operasyon kaydi yok."
                    />
                }
                footer={<AdminPagination page={page} pageCount={pages} onPageChange={setPage} />}
            >
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/20">
                            <TableHead>Zaman</TableHead>
                            <TableHead>Actor</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Resource</TableHead>
                            <TableHead>Ozet</TableHead>
                            <TableHead>Not</TableHead>
                            <TableHead>Koruma</TableHead>
                            <TableHead>Metadata</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                    {formatDateTime(log.createdAt)}
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-1">
                                        <div className="font-medium text-foreground">
                                            {log.actor?.username ?? "Sistem"}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {log.actor?.role ?? "system"}
                                            {log.actor?.id ? ` | id:${log.actor.id}` : ""}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="font-mono text-xs text-foreground">
                                    {log.action}
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-1">
                                        <div className="text-sm font-medium text-foreground">
                                            {log.resourceType}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {log.resourceId ?? "-"}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="max-w-xs text-sm text-muted-foreground">
                                    {log.summary ?? "-"}
                                </TableCell>
                                <TableCell className="max-w-xs text-sm text-muted-foreground">
                                    {log.note ?? "-"}
                                </TableCell>
                                <TableCell className="max-w-sm text-xs text-muted-foreground">
                                    {renderEconomyGuard(log)}
                                </TableCell>
                                <TableCell className="max-w-md text-xs text-muted-foreground">
                                    {renderMetadata(log.metadata)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </AdminTableShell>
        </div>
    );
}
