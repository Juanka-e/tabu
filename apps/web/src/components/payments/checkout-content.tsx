"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    ArrowLeft,
    CheckCircle2,
    CreditCard,
    LoaderCircle,
    LockKeyhole,
    PackageCheck,
    ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

interface PaymentOffer {
    code: string;
    productKind: "cosmetic_item" | "cosmetic_bundle" | "coin_pack";
    productName: string;
    description: string | null;
    unitAmountMinor: number;
    currency: string;
}

interface LegalDocumentReference {
    version: string;
    href: string;
}

interface OffersResponse {
    offers: PaymentOffer[];
    checkout: {
        available: boolean;
        unavailableReason: string | null;
        legalDocuments: {
            checkoutTerms: LegalDocumentReference;
            privacyNotice: LegalDocumentReference;
            distanceSalesNotice: LegalDocumentReference;
        };
    };
}

interface OrderView {
    id: string;
    status: string;
    productNameSnapshot: string;
    quantity: number;
    totalAmountMinor: number;
    currency: string;
    createdAt: string;
}

const TERMINAL_ORDER_STATUSES = new Set([
    "fulfilled",
    "failed",
    "expired",
    "refunded",
    "chargeback",
]);

function formatMoney(amountMinor: number, currency: string): string {
    try {
        return new Intl.NumberFormat("tr-TR", {
            style: "currency",
            currency,
        }).format(amountMinor / 100);
    } catch {
        return `${(amountMinor / 100).toFixed(2)} ${currency}`;
    }
}

function statusLabel(status: string): string {
    if (status === "created" || status === "pending_provider") return "Ödeme hazırlanıyor";
    if (status === "awaiting_payment") return "Ödeme bekleniyor";
    if (status === "paid") return "Ödeme doğrulandı";
    if (status === "fulfilled") return "Teslim edildi";
    if (status === "failed") return "Ödeme başarısız";
    if (status === "expired") return "Sipariş süresi doldu";
    if (status === "refunded") return "İade edildi";
    if (status === "chargeback") return "Ödeme itirazı incelemede";
    return "Sipariş güncelleniyor";
}

export function CheckoutContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get("order");
    const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
    const [data, setData] = useState<OffersResponse | null>(null);
    const [selectedCode, setSelectedCode] = useState<string | null>(null);
    const [accepted, setAccepted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [order, setOrder] = useState<OrderView | null>(null);
    const [iframeUrl, setIframeUrl] = useState<string | null>(null);
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const idempotencyKey = useRef(`web:${crypto.randomUUID()}`);
    const activeOrderId = orderId ?? createdOrderId;

    useEffect(() => {
        let active = true;
        void fetch("/api/payments/offers", { cache: "no-store" })
            .then(async (response) => {
                const payload = (await response.json()) as OffersResponse & { error?: string };
                if (!response.ok) throw new Error(payload.error || "Teklifler yüklenemedi.");
                if (!active) return;
                setData(payload);
                setSelectedCode(payload.offers[0]?.code ?? null);
            })
            .catch((error: unknown) => {
                if (active) toast.error(error instanceof Error ? error.message : "Teklifler yüklenemedi.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, []);

    const loadOrder = useCallback(async () => {
        if (!activeOrderId) return null;
        const response = await fetch(`/api/payments/orders/${encodeURIComponent(activeOrderId)}`, {
            cache: "no-store",
        });
        if (!response.ok) return null;
        const payload = (await response.json()) as {
            order: OrderView;
            paymentSession?: { iframeUrl: string } | null;
        };
        setOrder(payload.order);
        if (payload.paymentSession?.iframeUrl) setIframeUrl(payload.paymentSession.iframeUrl);
        return payload.order;
    }, [activeOrderId]);

    useEffect(() => {
        if (!activeOrderId) return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | null = null;
        const delays = [2_000, 3_000, 5_000, 8_000, 12_000, 20_000];
        let attempt = 0;
        const poll = async () => {
            const current = await loadOrder();
            if (cancelled || !current || TERMINAL_ORDER_STATUSES.has(current.status)) return;
            timer = setTimeout(poll, delays[Math.min(attempt, delays.length - 1)]);
            attempt += 1;
        };
        void poll();
        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [activeOrderId, loadOrder]);

    const selectedOffer = useMemo(
        () => data?.offers.find((offer) => offer.code === selectedCode) ?? null,
        [data, selectedCode]
    );
    const contactReady = fullName.trim().length >= 2
        && phone.replace(/\D/g, "").length >= 7
        && address.trim().length >= 10;

    const startCheckout = async () => {
        if (!data || !selectedOffer || !accepted || !contactReady || submitting) return;
        setSubmitting(true);
        try {
            const response = await fetch("/api/payments/checkout/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    offerCode: selectedOffer.code,
                    idempotencyKey: idempotencyKey.current,
                    legalAcceptance: {
                        accepted: true,
                        checkoutTermsVersion: data.checkout.legalDocuments.checkoutTerms.version,
                        privacyNoticeVersion: data.checkout.legalDocuments.privacyNotice.version,
                        distanceSalesNoticeVersion: data.checkout.legalDocuments.distanceSalesNotice.version,
                    },
                    contact: { fullName, phone, address },
                }),
            });
            const payload = (await response.json()) as {
                error?: string;
                orderId?: string;
                iframeUrl?: string;
            };
            if (!response.ok || !payload.orderId || !payload.iframeUrl) {
                toast.error(payload.error || "Ödeme başlatılamadı.");
                return;
            }
            setCreatedOrderId(payload.orderId);
            setIframeUrl(payload.iframeUrl);
            window.history.replaceState(null, "", `/checkout?order=${encodeURIComponent(payload.orderId)}`);
            void loadOrder();
        } catch {
            toast.error("Ödeme isteği tamamlanamadı.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_12%_5%,#bae6fd_0,transparent_28%),radial-gradient(circle_at_92%_12%,#fde68a_0,transparent_23%),linear-gradient(155deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-6 text-slate-950 dark:bg-[radial-gradient(circle_at_12%_5%,#0c4a6e_0,transparent_30%),radial-gradient(circle_at_92%_12%,#713f12_0,transparent_25%),linear-gradient(155deg,#020617_0%,#111827_100%)] dark:text-white md:px-8 md:py-10">
            <div className="mx-auto max-w-6xl">
                <Link href="/dashboard?tab=shop" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
                    <ArrowLeft className="h-4 w-4" /> Mağazaya dön
                </Link>

                <header className="mt-6 grid gap-6 rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.55)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/75 md:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-white dark:bg-white dark:text-slate-950">
                            <CreditCard className="h-4 w-4" /> Güvenli ödeme
                        </div>
                        <h1 className="mt-5 text-3xl font-black tracking-tight md:text-5xl">Hesabın için dijital ürünler</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 md:text-base">
                            Tutar ve ürün sunucuda doğrulanır. Ödeme sonucu sağlayıcı bildirimiyle kesinleşmeden ürün teslim edilmez.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-200">
                        <LockKeyhole className="h-5 w-5" /> Kart bilgileri Hushle’da tutulmaz
                    </div>
                </header>

                {order ? (
                    <section className="mt-6 rounded-[28px] border border-blue-200 bg-blue-50/90 p-6 dark:border-blue-900/60 dark:bg-blue-950/35">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">Sipariş durumu</p>
                                <h2 className="mt-2 text-2xl font-black">{statusLabel(order.status)}</h2>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{order.productNameSnapshot} · {formatMoney(order.totalAmountMinor, order.currency)}</p>
                            </div>
                            {order.status === "fulfilled" ? <PackageCheck className="h-10 w-10 text-emerald-600" /> : <LoaderCircle className="h-10 w-10 animate-spin text-blue-600" />}
                        </div>
                    </section>
                ) : null}

                {iframeUrl && (!order || order.status === "awaiting_payment") ? (
                    <section className="mt-6 overflow-hidden rounded-[28px] border border-sky-200 bg-white shadow-[0_24px_70px_-45px_rgba(2,132,199,0.65)] dark:border-sky-900 dark:bg-slate-950">
                        <div className="flex flex-col gap-2 border-b border-slate-200 bg-sky-50 px-5 py-4 dark:border-slate-800 dark:bg-sky-950/35 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="font-black">PayTR güvenli ödeme alanı</p>
                                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Kart bilgileri PayTR tarafından işlenir ve Hushle sistemlerine yazılmaz.</p>
                            </div>
                            <span className="w-fit rounded-full bg-amber-200 px-3 py-1 text-xs font-black text-amber-950">SANDBOX TEST</span>
                        </div>
                        <iframe
                            src={iframeUrl}
                            title="PayTR güvenli ödeme"
                            className="h-[680px] w-full bg-white sm:h-[720px]"
                            allow="payment"
                            referrerPolicy="no-referrer"
                        />
                    </section>
                ) : null}

                <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                    <section className="rounded-[30px] border border-white/70 bg-white/85 p-5 shadow-[0_28px_80px_-58px_rgba(15,23,42,0.6)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/75 md:p-7">
                        <h2 className="text-xl font-black">Teklif seç</h2>
                        {loading ? (
                            <div className="flex min-h-48 items-center justify-center"><LoaderCircle className="h-7 w-7 animate-spin text-blue-600" /></div>
                        ) : data?.offers.length ? (
                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                {data.offers.map((offer) => {
                                    const selected = selectedCode === offer.code;
                                    return (
                                        <button key={offer.code} type="button" onClick={() => { setSelectedCode(offer.code); setAccepted(false); idempotencyKey.current = `web:${crypto.randomUUID()}`; }} className={`rounded-2xl border p-4 text-left transition ${selected ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200 dark:bg-blue-950/35 dark:ring-blue-900" : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60"}`}>
                                            <div className="flex items-start justify-between gap-3">
                                                <span className="font-black">{offer.productName}</span>
                                                {selected ? <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-600" /> : null}
                                            </div>
                                            <p className="mt-2 text-sm leading-5 text-slate-500 dark:text-slate-400">{offer.description}</p>
                                            <p className="mt-4 text-xl font-black">{formatMoney(offer.unitAmountMinor, offer.currency)}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                                Şu anda aktif gerçek para teklifi bulunmuyor. Coin mağazasını kullanmaya devam edebilirsin.
                            </div>
                        )}
                    </section>

                    <aside className="h-fit rounded-[30px] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_28px_80px_-50px_rgba(15,23,42,0.9)] md:p-6">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-sky-300"><ShieldCheck className="h-4 w-4" /> Sipariş özeti</div>
                        <h2 className="mt-4 text-2xl font-black">{selectedOffer?.productName ?? "Teklif seçilmedi"}</h2>
                        <div className="mt-5 flex items-end justify-between border-y border-white/10 py-4">
                            <span className="text-sm text-slate-400">Ödenecek toplam</span>
                            <strong className="text-2xl">{selectedOffer ? formatMoney(selectedOffer.unitAmountMinor, selectedOffer.currency) : "-"}</strong>
                        </div>

                        <div className="mt-5 space-y-3">
                            <div>
                                <label htmlFor="payment-full-name" className="text-xs font-bold text-slate-300">Ad ve soyad</label>
                                <input id="payment-full-name" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={60} className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400" placeholder="Ad Soyad" />
                            </div>
                            <div>
                                <label htmlFor="payment-phone" className="text-xs font-bold text-slate-300">Telefon</label>
                                <input id="payment-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={20} className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400" placeholder="05xx xxx xx xx" />
                            </div>
                            <div>
                                <label htmlFor="payment-address" className="text-xs font-bold text-slate-300">Fatura/iletişim adresi</label>
                                <textarea id="payment-address" autoComplete="street-address" value={address} onChange={(event) => setAddress(event.target.value)} maxLength={400} rows={3} className="mt-1.5 w-full resize-none rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400" placeholder="Mahalle, sokak, ilçe ve il" />
                            </div>
                            <p className="rounded-xl border border-sky-300/15 bg-sky-300/10 p-3 text-xs leading-5 text-sky-100">
                                Bu iletişim bilgileri yalnız ödeme oturumu için PayTR’ye iletilir; Hushle sipariş, audit veya log kayıtlarına kopyalanmaz.
                            </p>
                        </div>

                        {data ? (
                            <div className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
                                <p>
                                    <Link className="font-bold text-sky-300 hover:text-sky-200" href={data.checkout.legalDocuments.privacyNotice.href} target="_blank">Ödeme Aydınlatma Metni</Link> kişisel verilerin ödeme sırasında nasıl işlendiğini açıklar.
                                </p>
                                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                                    <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-sky-500" />
                                    <span>
                                        <Link className="font-bold text-sky-300 hover:text-sky-200" href={data.checkout.legalDocuments.distanceSalesNotice.href} target="_blank">Ön bilgilendirmeyi</Link> ve <Link className="font-bold text-sky-300 hover:text-sky-200" href={data.checkout.legalDocuments.checkoutTerms.href} target="_blank">satın alma koşullarını</Link> okudum, sipariş verdiğimde ödeme yükümlülüğü doğacağını kabul ediyorum.
                                    </span>
                                </label>
                            </div>
                        ) : null}

                        {!data?.checkout.available && data?.checkout.unavailableReason ? (
                            <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-200">{data.checkout.unavailableReason}</p>
                        ) : null}

                        <button type="button" onClick={() => void startCheckout()} disabled={!selectedOffer || !accepted || !contactReady || !data?.checkout.available || submitting} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-400 px-4 py-3.5 text-sm font-black text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
                            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                            Ödeme yükümlülüğü doğuran siparişi ver
                        </button>
                    </aside>
                </div>
            </div>
        </main>
    );
}
