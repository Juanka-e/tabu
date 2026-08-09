"use client";

import { useCallback, useEffect, useState } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    CreditCard,
    RefreshCw,
    RotateCcw,
    Search,
    ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminEmptyState, AdminTableShell } from "@/components/admin/admin-table-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ReversalRequest = {
    id: string;
    outcome: "refund" | "chargeback";
    status: "pending";
    externalReference: string;
    reason: string;
    createdAt: string;
    requestedBy: { id: number; username: string };
};
type PaymentItem = {
    id: string;
    status: string;
    provider: string;
    productNameSnapshot: string;
    productKind: string;
    totalAmountMinor: number;
    currency: string;
    createdAt: string;
    user: { id: number; username: string };
    fulfillment: { status: string; errorCode: string | null } | null;
    reversal: { outcome: string; status: string; externalReference: string; reason: string; evidence: unknown } | null;
    reversalRequests: ReversalRequest[];
    reconciliationCase: {
        id: string;
        status: string;
        reasonCode: string;
        attemptCount: number;
        lastErrorCode: string | null;
    } | null;
    webhookEvents: Array<{
        id: string;
        status: string;
        outcome: string;
        lastErrorCode: string | null;
        attemptCount: number;
    }>;
};
type PaymentResponse = {
    items: PaymentItem[];
    page: number;
    pages: number;
    total: number;
    counts: { openCases: number; deadLetters: number; pendingApprovals: number; manualReversals: number };
    alerts: {
        openCaseThresholdExceeded: boolean;
        deadLetterThresholdExceeded: boolean;
        caseAlertThreshold: number;
        deadLetterAlertThreshold: number;
        oldestOpenCaseAt: string | null;
    };
};

function money(minor: number, currency: string): string {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(minor / 100);
}

async function readError(response: Response, fallback: string): Promise<string> {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    return payload?.error || fallback;
}

function readCoinReversalEvidence(value: unknown): {
    reversedCoin: number | null;
    unrecoveredCoin: number | null;
} | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const evidence = value as Record<string, unknown>;
    if (evidence.kind !== "coin_pack" || typeof evidence.policy !== "string") return null;
    return {
        reversedCoin: typeof evidence.reversedCoin === "number" ? evidence.reversedCoin : null,
        unrecoveredCoin: typeof evidence.unrecoveredCoin === "number" ? evidence.unrecoveredCoin : null,
    };
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
            if (!response.ok || !payload || !("items" in payload)) {
                throw new Error(payload && "error" in payload ? payload.error : "Ödemeler yüklenemedi.");
            }
            setData(payload);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Ödemeler yüklenemedi.");
        } finally {
            setLoading(false);
        }
    }, [page, search, status]);
    useEffect(() => { void load(); }, [load]);

    async function post(url: string, body: object, fallback: string): Promise<Record<string, unknown>> {
        const response = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(await readError(response, fallback));
        return await response.json().catch(() => ({})) as Record<string, unknown>;
    }

    async function retryWebhook(eventId: string) {
        setBusyId(eventId);
        try {
            await post(`/api/admin/payments/webhooks/${eventId}/retry`, { confirmationEventId: eventId }, "Webhook yeniden kuyruğa alınamadı.");
            toast.success("Webhook kontrollü olarak yeniden kuyruğa alındı.");
            await load();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Webhook yeniden kuyruğa alınamadı.");
        } finally { setBusyId(null); }
    }

    async function reconcileOrder(orderId: string) {
        setBusyId(orderId);
        try {
            const result = await post(`/api/admin/payments/${orderId}/reconcile`, { confirmationOrderId: orderId }, "Durum sorgusu tamamlanamadı.");
            toast.success(result.outcome === "fulfilled" ? "Sipariş doğrulandı ve tamamlandı." : "Uzlaştırma vakası güncellendi.");
            await load();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Durum sorgusu tamamlanamadı.");
        } finally { setBusyId(null); }
    }

    async function requestReversal(event: React.FormEvent<HTMLFormElement>, order: PaymentItem) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusyId(order.id);
        try {
            await post(`/api/admin/payments/${order.id}/reversal`, {
                outcome: form.get("outcome"),
                externalReference: form.get("externalReference"),
                reason: form.get("reason"),
                confirmationOrderId: form.get("confirmationOrderId"),
            }, "Ters işlem talebi oluşturulamadı.");
            toast.success("Talep oluşturuldu. Farklı bir adminin onayı gerekiyor.");
            await load();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Ters işlem talebi oluşturulamadı.");
        } finally { setBusyId(null); }
    }

    async function reviewReversal(event: React.FormEvent<HTMLFormElement>, request: ReversalRequest) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusyId(request.id);
        try {
            await post(`/api/admin/payments/reversal-requests/${request.id}/review`, {
                action: form.get("action"),
                reviewNote: form.get("reviewNote"),
                confirmationRequestId: form.get("confirmationRequestId"),
            }, "Reversal incelemesi tamamlanamadı.");
            toast.success(form.get("action") === "approve" ? "Talep onaylandı ve yerel reversal uygulandı." : "Talep reddedildi.");
            await load();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Reversal incelemesi tamamlanamadı.");
        } finally { setBusyId(null); }
    }

    async function resolveCase(event: React.FormEvent<HTMLFormElement>, caseId: string) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusyId(caseId);
        try {
            await post(`/api/admin/payments/cases/${caseId}/resolution`, {
                resolution: form.get("resolution"),
                note: form.get("note"),
                confirmationCaseId: form.get("confirmationCaseId"),
            }, "Uzlaştırma vakası çözülemedi.");
            toast.success("Uzlaştırma vakası güncellendi.");
            await load();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Uzlaştırma vakası çözülemedi.");
        } finally { setBusyId(null); }
    }

    const alertActive = Boolean(
        data?.alerts.openCaseThresholdExceeded || data?.alerts.deadLetterThresholdExceeded
    );

    return (
        <div className="space-y-6 p-4 md:p-6">
            <AdminPageHeader
                title="Ödeme Operasyonları"
                description="Bu ekran sağlayıcıda para iadesi başlatmaz. Yerel reversal için talep oluşturan kişiden farklı bir adminin onayı zorunludur."
                meta={data ? `${data.counts.openCases} açık vaka · ${data.counts.pendingApprovals} onay bekliyor` : undefined}
                icon={<CreditCard className="h-5 w-5 text-emerald-600" />}
                action={<Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Yenile</Button>}
            />

            {alertActive ? (
                <div className="flex gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-950 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div><strong>Operasyon eşiği aşıldı</strong><p className="mt-1 text-sm opacity-80">Açık vaka eşiği {data?.alerts.caseAlertThreshold}, dead-letter eşiği {data?.alerts.deadLetterAlertThreshold}. Otomatik ceza veya bakiye kesintisi uygulanmaz; operatör incelemesi gerekir.</p></div>
                </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Manuel reversal" value={data?.counts.manualReversals ?? 0} />
                <Metric label="Açık uzlaştırma" value={data?.counts.openCases ?? 0} tone="amber" />
                <Metric label="İkinci onay bekliyor" value={data?.counts.pendingApprovals ?? 0} tone="sky" />
                <Metric label="Dead-letter" value={data?.counts.deadLetters ?? 0} tone="rose" />
            </div>

            <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); setPage(1); }}>
                <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Sipariş, sağlayıcı referansı veya kullanıcı ara" /></div>
                <select className="h-10 rounded-md border bg-background px-3 text-sm" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="all">Tüm durumlar</option><option value="awaiting_payment">Ödeme bekliyor</option><option value="fulfilled">Tamamlandı</option><option value="failed">Başarısız</option><option value="refunded">İade</option><option value="chargeback">Ters ibraz</option></select>
                <Button type="submit">Ara</Button>
            </form>

            <AdminTableShell title="Sipariş akışı" description="Coin reversal yalnız ilgili ödeme lotunun kalan kısmını geri alır; kazanılmış coinlere dokunmaz. Harcanmış ücretli kısım manuel incelemede görünür." loading={loading} isEmpty={!loading && (data?.items.length ?? 0) === 0} emptyState={<AdminEmptyState icon={<CreditCard />} title="Sipariş bulunamadı" description="Bu filtrede ödeme siparişi yok." />} footer={data ? <AdminPagination page={page} pageCount={data.pages} onPageChange={setPage} /> : undefined}>
                <div className="divide-y divide-border/60">
                    {data?.items.map((item) => {
                        const webhook = item.webhookEvents[0];
                        const pendingRequest = item.reversalRequests[0];
                        const coinReversal = readCoinReversalEvidence(item.reversal?.evidence);
                        const canRequest = !pendingRequest && (
                            (item.status === "fulfilled" && item.fulfillment?.status === "completed" && !item.reversal)
                            || (item.status === "refunded" && item.reversal?.outcome === "refund")
                        );
                        const terminal = ["fulfilled", "failed", "expired", "refunded", "chargeback"].includes(item.status);
                        return (
                            <article key={item.id} className="space-y-4 p-4 lg:p-5">
                                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] lg:items-start">
                                    <div className="min-w-0"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{item.status}</span><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">{item.provider}</span></div><h2 className="mt-2 font-semibold">{item.productNameSnapshot}</h2><p className="truncate text-sm text-muted-foreground">@{item.user.username} · #{item.user.id} · {item.id}</p></div>
                                    <dl className="grid grid-cols-2 gap-2 text-xs"><div><dt className="text-muted-foreground">Tutar</dt><dd className="font-semibold">{money(item.totalAmountMinor, item.currency)}</dd></div><div><dt className="text-muted-foreground">Oluşturuldu</dt><dd className="font-semibold">{new Date(item.createdAt).toLocaleString("tr-TR")}</dd></div><div><dt className="text-muted-foreground">Fulfillment</dt><dd className="font-semibold">{item.fulfillment?.status ?? "-"}</dd></div><div><dt className="text-muted-foreground">Ürün tipi</dt><dd className="font-semibold">{item.productKind}</dd></div></dl>
                                    <div className="flex flex-col gap-2">{item.provider === "paytr" && ["awaiting_payment", "paid"].includes(item.status) ? <Button variant="outline" disabled={busyId === item.id} onClick={() => void reconcileOrder(item.id)}><RefreshCw className="mr-2 h-4 w-4" />Durumu kontrol et</Button> : null}{webhook?.status === "dead_letter" ? <Button variant="outline" disabled={busyId === webhook.id} onClick={() => void retryWebhook(webhook.id)}><RotateCcw className="mr-2 h-4 w-4" />Webhook retry</Button> : null}</div>
                                </div>

                                {item.reconciliationCase?.status === "open" ? (
                                    <details className="rounded-xl border border-amber-300/70 bg-amber-50 p-3 text-sm dark:bg-amber-950/20">
                                        <summary className="cursor-pointer font-semibold">Uzlaştırma: {item.reconciliationCase.reasonCode} · {item.reconciliationCase.attemptCount} deneme</summary>
                                        <p className="mt-2 text-muted-foreground">Resolved yalnız terminal siparişlerde kullanılabilir. Ignored otomatik sorgulamayı durdurur ve açık operatör kararını kaydeder.</p>
                                        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={(event) => void resolveCase(event, item.reconciliationCase!.id)}>
                                            <select name="resolution" className="h-10 rounded-md border bg-background px-3 text-sm" required><option value="resolved" disabled={!terminal}>Çözüldü</option><option value="ignored">Bilinçli olarak yok say</option></select>
                                            <Input name="note" placeholder="Operasyon çözüm notu" minLength={3} maxLength={500} required />
                                            <Input name="confirmationCaseId" placeholder={`Onay için vaka ID: ${item.reconciliationCase.id}`} required />
                                            <Button type="submit" variant="outline" disabled={busyId === item.reconciliationCase.id}><CheckCircle2 className="mr-2 h-4 w-4" />Vakayı güncelle</Button>
                                        </form>
                                    </details>
                                ) : null}

                                {pendingRequest ? (
                                    <details open className="rounded-xl border border-sky-300 bg-sky-50 p-3 text-sm dark:bg-sky-950/20">
                                        <summary className="cursor-pointer font-semibold text-sky-950 dark:text-sky-100">İkinci admin onayı bekleniyor · {pendingRequest.outcome}</summary>
                                        <p className="mt-2">Talep eden: <strong>@{pendingRequest.requestedBy.username}</strong> · {new Date(pendingRequest.createdAt).toLocaleString("tr-TR")}</p>
                                        <p className="mt-1 text-muted-foreground">{pendingRequest.reason} · Sağlayıcı ref: {pendingRequest.externalReference}</p>
                                        <p className="mt-2 text-xs text-muted-foreground">Talebi oluşturan admin kendi talebini onaylayamaz veya reddedemez.</p>
                                        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={(event) => void reviewReversal(event, pendingRequest)}>
                                            <select name="action" className="h-10 rounded-md border bg-background px-3 text-sm" required><option value="approve">Onayla ve uygula</option><option value="reject">Reddet</option></select>
                                            <Input name="reviewNote" placeholder="İkinci admin inceleme notu" minLength={3} maxLength={500} required />
                                            <Input name="confirmationRequestId" placeholder={`Onay için talep ID: ${pendingRequest.id}`} required />
                                            <Button type="submit" variant="outline" disabled={busyId === pendingRequest.id}><ShieldAlert className="mr-2 h-4 w-4" />Kararı kaydet</Button>
                                        </form>
                                    </details>
                                ) : null}

                                {item.reversal ? <div className="rounded-xl border border-rose-300/70 bg-rose-50 p-3 text-sm dark:bg-rose-950/20"><strong>{item.reversal.outcome}</strong> · {item.reversal.status} · {item.reversal.externalReference}<p className="mt-1 text-muted-foreground">{item.reversal.reason}</p>{coinReversal ? <p className="mt-2 font-medium">{coinReversal.reversedCoin === null ? "Eski coin kaydı: otomatik bakiye işlemi yapılmadı." : `${coinReversal.reversedCoin.toLocaleString("tr-TR")} coin geri alındı · ${(coinReversal.unrecoveredCoin ?? 0).toLocaleString("tr-TR")} coin manuel inceleme`}</p> : null}</div> : null}

                                {canRequest ? (
                                    <details className="rounded-xl border p-3">
                                        <summary className="cursor-pointer font-semibold"><ShieldAlert className="mr-2 inline h-4 w-4 text-amber-600" />Harici işlem sonrası reversal talebi oluştur</summary>
                                        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={(event) => void requestReversal(event, item)}>
                                            <select name="outcome" className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={item.status === "refunded" ? "chargeback" : "refund"} required><option value="refund" disabled={item.status === "refunded"}>İade</option><option value="chargeback">Ters ibraz</option></select>
                                            <Input name="externalReference" placeholder="Sağlayıcı işlem referansı" minLength={3} maxLength={191} required />
                                            <Input name="reason" placeholder="Operasyon gerekçesi" minLength={3} maxLength={500} required />
                                            <Input name="confirmationOrderId" placeholder="Onay için sipariş UUID'sini yazın" required />
                                            <Button type="submit" variant="destructive" disabled={busyId === item.id}>İkinci onaya gönder</Button>
                                        </form>
                                    </details>
                                ) : null}
                            </article>
                        );
                    })}
                </div>
            </AdminTableShell>
        </div>
    );
}

function Metric({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "amber" | "sky" | "rose" }) {
    const tones = {
        default: "border-border bg-card",
        amber: "border-amber-300/70 bg-amber-50/60 dark:bg-amber-950/20",
        sky: "border-sky-300/70 bg-sky-50/60 dark:bg-sky-950/20",
        rose: "border-rose-300/70 bg-rose-50/60 dark:bg-rose-950/20",
    };
    return <div className={`rounded-2xl border p-4 ${tones[tone]}`}><span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span><strong className="mt-2 block text-2xl">{value}</strong></div>;
}
