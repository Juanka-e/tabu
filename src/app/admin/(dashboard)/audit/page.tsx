"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

export default function AdminAuditPage() {
    const [logs, setLogs] = useState<AdminAuditLogView[]>([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [action, setAction] = useState("");
    const [resourceType, setResourceType] = useState("");
    const [actorRole, setActorRole] = useState("");
    const [actionOptions, setActionOptions] = useState<string[]>([]);
    const [resourceTypeOptions, setResourceTypeOptions] = useState<string[]>([]);
    const [roleOptions, setRoleOptions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

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
    }, [action, actorRole, page, resourceType, search]);

    useEffect(() => {
        void loadLogs();
    }, [loadLogs]);

    useEffect(() => {
        setPage(1);
    }, [search, action, resourceType, actorRole]);

    const stats = useMemo(
        () => [
            { label: "görünen", value: String(logs.length) },
            { label: "toplam", value: String(total) },
            { label: "sayfa", value: `${page} / ${pages}` },
        ],
        [logs.length, page, pages, total]
    );

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="Audit Kayıtları"
                description="Admin ve sistem operasyonlarının izini tek ekranda takip edin."
                meta={`${total} kayıt`}
                icon={<Activity className="h-5 w-5 text-emerald-500" />}
            />

            <AdminToolbar>
                <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="relative md:col-span-2 xl:col-span-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Action, admin, resource veya özet ara..."
                            className="pl-9"
                        />
                    </div>

                    <select
                        value={action}
                        onChange={(event) => setAction(event.target.value)}
                        className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none"
                    >
                        <option value="">Tüm action&apos;lar</option>
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
                        <option value="">Tüm resource tipleri</option>
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
                        <option value="">Tüm roller</option>
                        {roleOptions.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </div>
                <AdminToolbarStats stats={stats} />
            </AdminToolbar>

            <AdminTableShell
                title="Audit Geçmişi"
                description="En son operasyonlar tarih, actor, action, not ve metadata özeti ile listelenir."
                loading={loading}
                isEmpty={!loading && logs.length === 0}
                emptyState={
                    <AdminEmptyState
                        icon={<Activity className="h-6 w-6" />}
                        title="Audit kaydı bulunamadı"
                        description="Mevcut filtrelerle eşleşen bir operasyon kaydı yok."
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
                            <TableHead>Özet</TableHead>
                            <TableHead>Not</TableHead>
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
