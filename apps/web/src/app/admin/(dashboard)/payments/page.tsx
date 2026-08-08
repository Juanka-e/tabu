"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, RefreshCw, RotateCcw, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminEmptyState, AdminTableShell } from "@/components/admin/admin-table-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PaymentItem = {
    id: string; status: string; provider: string; productNameSnapshot: string;
    productKind: string; totalAmountMinor: number; currency: string; createdAt: string;
    user: { id: number; username: string };
    fulfillment: { status: string; errorCode: string | null } | null;
    reversal: { outcome: string; status: string; externalReference: string; reason: string } | null;
    reconciliationCase: { status: string; reasonCode: string; attemptCount: number; lastErrorCode: string | null } | null;
    webhookEvents: Array<{ id: string; status: string; outcome: string; lastErrorCode: string | null; attemptCount: number }>;
};
type PaymentResponse = { items: PaymentItem[]; page: number; pages: number; total: number; counts: { openCases: number; deadLetters: number } };

function money(minor: number, currency: string): string {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(minor / 100);
}

export default function AdminPaymentsPage() {
    const [data, setData] = useState<PaymentResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState("all");
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: "20", status });
            if (search) params.set("search", search);
            const response = await fetch(`/api/admin/payments?${params}`, { cache: "no-store" });
            const payload = await response.json().catch(() => null) as PaymentResponse | { error?: string } | null;
            if (!response.ok || !payload || !("items" in payload)) throw new Error(payload && "error" in payload ? payload.error : "Ödemeler yüklenemedi.");
            setData(payload);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Ödemeler yüklenemedi.");
        } finally { setLoading(false); }
    }, [page, search, status]);
    useEffect(() => { void load(); }, [load]);

    async function retryWebhook(eventId: string) {
        setBusyId(eventId);
        try {
            const response = await fetch(`/api/admin/payments/webhooks/${eventId}/retry`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirmationEventId: eventId }) });
            const payload = await response.json().catch(() => null) as { error?: string } | null;
            if (!response.ok) throw new Error(payload?.error || "Webhook yeniden kuyruğa alınamadı.");
            toast.success("Webhook kontrollü olarak yeniden kuyruğa alındı.");
            await load();
        } catch (error) { toast.error(error instanceof Error ? error.message : "Webhook yeniden kuyruğa alınamadı."); }
        finally { setBusyId(null); }
    }

    async function reconcileOrder(orderId: string) {
        setBusyId(orderId);
        try {
            const response = await fetch(`/api/admin/payments/${orderId}/reconcile`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirmationOrderId: orderId }) });
            const payload = await response.json().catch(() => null) as { error?: string; outcome?: string } | null;
            if (!response.ok) throw new Error(payload?.error || "Durum sorgusu tamamlanamadı.");
            toast.success(payload?.outcome === "fulfilled" ? "Sipariş doğrulandı ve tamamlandı." : "Uzlaştırma vakası güncellendi.");
            await load();
        } catch (error) { toast.error(error instanceof Error ? error.message : "Durum sorgusu tamamlanamadı."); }
        finally { setBusyId(null); }
    }

    async function applyReversal(event: React.FormEvent<HTMLFormElement>, order: PaymentItem) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusyId(order.id);
        try {
            const response = await fetch(`/api/admin/payments/${order.id}/reversal`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ outcome: form.get("outcome"), externalReference: form.get("externalReference"), reason: form.get("reason"), confirmationOrderId: form.get("confirmationOrderId") }) });
            const payload = await response.json().catch(() => null) as { error?: string; status?: string } | null;
            if (!response.ok) throw new Error(payload?.error || "Ters işlem uygulanamadı.");
            toast.success(payload?.status === "manual_review" ? "Manuel coin incelemesi açıldı." : "Ters işlem uygulandı.");
            await load();
        } catch (error) { toast.error(error instanceof Error ? error.message : "Ters işlem uygulanamadı."); }
        finally { setBusyId(null); }
    }

    return <div className="space-y-6 p-4 md:p-6">
        <AdminPageHeader title="Ödeme Operasyonları" description="Sipariş, webhook ve uzlaştırma vakalarını inceleyin. Bu ekran sağlayıcıda para iadesi başlatmaz. Ters işlem yalnız sağlayıcıdaki işlem tamamlandıktan sonra kanıt referansıyla uygulanır." meta={data ? `${data.counts.openCases} açık vaka · ${data.counts.deadLetters} dead-letter` : undefined} icon={<CreditCard className="h-5 w-5 text-emerald-600" />} action={<Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Yenile</Button>} />
        <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border bg-card p-4"><span className="text-xs uppercase tracking-wider text-muted-foreground">Toplam sonuç</span><strong className="mt-2 block text-2xl">{data?.total ?? 0}</strong></div>
            <div className="rounded-2xl border border-amber-300/70 bg-amber-50/60 p-4 dark:bg-amber-950/20"><span className="text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300">Açık uzlaştırma</span><strong className="mt-2 block text-2xl">{data?.counts.openCases ?? 0}</strong></div>
            <div className="rounded-2xl border border-rose-300/70 bg-rose-50/60 p-4 dark:bg-rose-950/20"><span className="text-xs uppercase tracking-wider text-rose-800 dark:text-rose-300">Dead-letter</span><strong className="mt-2 block text-2xl">{data?.counts.deadLetters ?? 0}</strong></div>
        </div>
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); setPage(1); }}><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Sipariş, sağlayıcı referansı veya kullanıcı ara" /></div><select className="h-10 rounded-md border bg-background px-3 text-sm" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="all">Tüm durumlar</option><option value="awaiting_payment">Ödeme bekliyor</option><option value="fulfilled">Tamamlandı</option><option value="failed">Başarısız</option><option value="refunded">İade</option><option value="chargeback">Ters ibraz</option></select><Button type="submit">Ara</Button></form>
        <AdminTableShell title="Sipariş akışı" description="Coin lot muhasebesi olmadığı için coin paketlerinde otomatik bakiye kesilmez; manuel inceleme açılır." loading={loading} isEmpty={!loading && (data?.items.length ?? 0) === 0} emptyState={<AdminEmptyState icon={<CreditCard />} title="Sipariş bulunamadı" description="Bu filtrede ödeme siparişi yok." />} footer={data ? <AdminPagination page={page} pageCount={data.pages} onPageChange={setPage} /> : undefined}>
            <div className="divide-y divide-border/60">{data?.items.map((item) => {
                const webhook = item.webhookEvents[0];
                const reversible = item.status === "fulfilled" && item.fulfillment?.status === "completed" && !item.reversal;
                return <article key={item.id} className="space-y-4 p-4 lg:p-5">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] lg:items-start"><div className="min-w-0"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{item.status}</span><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">{item.provider}</span></div><h2 className="mt-2 font-semibold">{item.productNameSnapshot}</h2><p className="truncate text-sm text-muted-foreground">@{item.user.username} · #{item.user.id} · {item.id}</p></div><dl className="grid grid-cols-2 gap-2 text-xs"><div><dt className="text-muted-foreground">Tutar</dt><dd className="font-semibold">{money(item.totalAmountMinor, item.currency)}</dd></div><div><dt className="text-muted-foreground">Oluşturuldu</dt><dd className="font-semibold">{new Date(item.createdAt).toLocaleString("tr-TR")}</dd></div><div><dt className="text-muted-foreground">Fulfillment</dt><dd className="font-semibold">{item.fulfillment?.status ?? "-"}</dd></div><div><dt className="text-muted-foreground">Ürün tipi</dt><dd className="font-semibold">{item.productKind}</dd></div></dl><div className="flex flex-col gap-2">{item.provider === "paytr" && ["awaiting_payment", "paid"].includes(item.status) ? <Button variant="outline" disabled={busyId === item.id} onClick={() => void reconcileOrder(item.id)}><RefreshCw className="mr-2 h-4 w-4" />Durumu kontrol et</Button> : null}{webhook?.status === "dead_letter" ? <Button variant="outline" disabled={busyId === webhook.id} onClick={() => void retryWebhook(webhook.id)}><RotateCcw className="mr-2 h-4 w-4" />Webhook retry</Button> : null}</div></div>
                    {item.reconciliationCase ? <div className="rounded-xl border border-amber-300/70 bg-amber-50 p-3 text-sm dark:bg-amber-950/20"><strong>Uzlaştırma:</strong> {item.reconciliationCase.reasonCode} · {item.reconciliationCase.attemptCount} deneme {item.reconciliationCase.lastErrorCode ? `· ${item.reconciliationCase.lastErrorCode}` : ""}</div> : null}
                    {item.reversal ? <div className="rounded-xl border border-rose-300/70 bg-rose-50 p-3 text-sm dark:bg-rose-950/20"><strong>{item.reversal.outcome}</strong> · {item.reversal.status} · {item.reversal.externalReference}<p className="mt-1 text-muted-foreground">{item.reversal.reason}</p></div> : null}
                    {reversible ? <details className="rounded-xl border p-3"><summary className="cursor-pointer font-semibold"><ShieldAlert className="mr-2 inline h-4 w-4 text-amber-600" />Harici iade sonrası yerel ters işlem</summary><form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={(event) => void applyReversal(event, item)}><select name="outcome" className="h-10 rounded-md border bg-background px-3 text-sm" required><option value="refund">İade</option><option value="chargeback">Ters ibraz</option></select><Input name="externalReference" placeholder="Sağlayıcı işlem referansı" minLength={3} maxLength={191} required /><Input name="reason" placeholder="Operasyon gerekçesi" minLength={3} maxLength={500} required /><Input name="confirmationOrderId" placeholder="Onay için sipariş UUID'sini yazın" required /><Button type="submit" variant="destructive" disabled={busyId === item.id}>Yerel ters işlemi uygula</Button></form></details> : null}
                </article>;
            })}</div>
        </AdminTableShell>
    </div>;
}
