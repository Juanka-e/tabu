"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Archive,
    BadgeDollarSign,
    ChevronDown,
    ChevronUp,
    Clock3,
    Gift,
    Hash,
    Plus,
    Search,
    ShieldCheck,
    Sparkles,
    Trash2,
    Users,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminToolbar, AdminToolbarStats } from "@/components/admin/admin-toolbar";
import { AdminEmptyState, AdminTableShell } from "@/components/admin/admin-table-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CoinGrantCampaignView } from "@/types/coin-grants";

interface CampaignFormState {
    code: string;
    name: string;
    description: string;
    coinAmount: string;
    totalBudgetCoin: string;
    totalClaimLimit: string;
    perUserClaimLimit: string;
    startsAt: string;
    endsAt: string;
    isActive: boolean;
}

interface CodeFormState {
    campaignId: string;
    label: string;
    manualCode: string;
    prefix: string;
    quantity: string;
    maxClaims: string;
    expiresAt: string;
    isActive: boolean;
}

type CampaignViewFilter = "all" | "active" | "inactive" | "used" | "exhausted" | "archived";

const inputClassName = "w-full rounded-2xl border border-border/80 bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-amber-500";
const sectionClassName = "space-y-4 rounded-[26px] border border-border/80 bg-background/90 p-5";
const emptyCampaignForm: CampaignFormState = {
    code: "",
    name: "",
    description: "",
    coinAmount: "100",
    totalBudgetCoin: "",
    totalClaimLimit: "",
    perUserClaimLimit: "1",
    startsAt: "",
    endsAt: "",
    isActive: true,
};

const emptyCodeForm: CodeFormState = {
    campaignId: "",
    label: "",
    manualCode: "",
    prefix: "",
    quantity: "1",
    maxClaims: "1",
    expiresAt: "",
    isActive: true,
};

function toDateTimeLocal(iso: string | null): string {
    if (!iso) return "";
    const date = new Date(iso);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toIsoDateTime(value: string): string | null {
    return value ? new Date(value).toISOString() : null;
}

function toNullableInt(value: string): number | null {
    const trimmed = value.trim();
    return trimmed ? Number.parseInt(trimmed, 10) : null;
}

function formatDateTime(value: string | null): string {
    if (!value) {
        return "Acik uc";
    }

    return new Date(value).toLocaleString("tr-TR", {
        dateStyle: "short",
        timeStyle: "short",
    });
}

function isCampaignUsed(campaign: CoinGrantCampaignView): boolean {
    return campaign.totalClaimCount > 0 || campaign.totalGrantedCoin > 0 || campaign.codes.some((code) => code.claimCount > 0);
}

function isCampaignExhausted(campaign: CoinGrantCampaignView): boolean {
    const budgetReached =
        campaign.totalBudgetCoin !== null && campaign.totalGrantedCoin >= campaign.totalBudgetCoin;
    const claimLimitReached =
        campaign.totalClaimLimit !== null && campaign.totalClaimCount >= campaign.totalClaimLimit;
    return budgetReached || claimLimitReached;
}

function isCampaignArchived(campaign: CoinGrantCampaignView): boolean {
    return campaign.archivedAt !== null;
}

function StatChip({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Gift;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl border border-border/70 bg-muted/25 px-3 py-2">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {label}
            </div>
            <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
        </div>
    );
}

function SectionLabel({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">{title}</div>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
    );
}

export default function AdminCoinGrantsPage() {
    const [campaigns, setCampaigns] = useState<CoinGrantCampaignView[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [editingCampaignId, setEditingCampaignId] = useState<number | null>(null);
    const [deactivatingCampaignId, setDeactivatingCampaignId] = useState<number | null>(null);
    const [deactivatingCodeId, setDeactivatingCodeId] = useState<number | null>(null);
    const [archivingCampaignId, setArchivingCampaignId] = useState<number | null>(null);
    const [archivingCodeId, setArchivingCodeId] = useState<number | null>(null);
    const [viewFilter, setViewFilter] = useState<CampaignViewFilter>("all");
    const [expandedCampaignIds, setExpandedCampaignIds] = useState<number[]>([]);
    const [campaignForm, setCampaignForm] = useState<CampaignFormState>(emptyCampaignForm);
    const [codeForm, setCodeForm] = useState<CodeFormState>(emptyCodeForm);

    const loadCampaigns = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/admin/coin-grants/campaigns", { cache: "no-store" });
            if (!response.ok) {
                setError("Coin grant verileri yuklenemedi.");
                return;
            }

            const payload = (await response.json()) as CoinGrantCampaignView[];
            setCampaigns(payload);
            setCodeForm((current) => {
                const currentStillEligible = payload.some(
                    (campaign) =>
                        String(campaign.id) === current.campaignId &&
                        campaign.isActive &&
                        !campaign.archivedAt
                );
                const nextEligible = payload.find((campaign) => campaign.isActive && !campaign.archivedAt);

                return {
                    ...current,
                    campaignId: currentStillEligible
                        ? current.campaignId
                        : nextEligible
                            ? String(nextEligible.id)
                            : "",
                };
            });
        } catch {
            setError("Coin grant verileri yuklenemedi.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadCampaigns();
    }, [loadCampaigns]);

    const filteredCampaigns = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return campaigns.filter((campaign) => {
            const matchesSearch =
                !needle ||
                [campaign.code, campaign.name, campaign.description ?? "", ...campaign.codes.map((code) => code.code)]
                    .join(" ")
                    .toLowerCase()
                    .includes(needle);

            if (!matchesSearch) {
                return false;
            }

            switch (viewFilter) {
                case "active":
                    return campaign.isActive;
                case "inactive":
                    return !campaign.isActive;
                case "used":
                    return isCampaignUsed(campaign);
                case "exhausted":
                    return isCampaignExhausted(campaign);
                case "archived":
                    return isCampaignArchived(campaign);
                default:
                    return true;
            }
        });
    }, [campaigns, search, viewFilter]);

    const eligibleCodeCampaigns = useMemo(
        () => campaigns.filter((campaign) => campaign.isActive && !campaign.archivedAt),
        [campaigns]
    );

    const stats = useMemo(
        () => [
            { label: "campaign", value: String(campaigns.length) },
            { label: "kod", value: String(campaigns.reduce((sum, campaign) => sum + campaign.codes.length, 0)) },
            { label: "dagitilan coin", value: String(campaigns.reduce((sum, campaign) => sum + campaign.totalGrantedCoin, 0)) },
        ],
        [campaigns]
    );

    const submitCampaign = async () => {
        setSaving(true);
        setNotice(null);
        try {
            const payload = {
                code: campaignForm.code.trim().toUpperCase(),
                name: campaignForm.name.trim(),
                description: campaignForm.description.trim() || null,
                coinAmount: Number.parseInt(campaignForm.coinAmount, 10),
                totalBudgetCoin: toNullableInt(campaignForm.totalBudgetCoin),
                totalClaimLimit: toNullableInt(campaignForm.totalClaimLimit),
                perUserClaimLimit: Number.parseInt(campaignForm.perUserClaimLimit, 10),
                startsAt: toIsoDateTime(campaignForm.startsAt),
                endsAt: toIsoDateTime(campaignForm.endsAt),
                isActive: campaignForm.isActive,
            };

            const response = await fetch(
                editingCampaignId ? `/api/admin/coin-grants/campaigns/${editingCampaignId}` : "/api/admin/coin-grants/campaigns",
                {
                    method: editingCampaignId ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            );

            if (!response.ok) {
                const errorPayload = (await response.json().catch(() => ({ error: "Campaign kaydedilemedi." }))) as { error?: string };
                window.alert(errorPayload.error || "Campaign kaydedilemedi.");
                return;
            }

            setEditingCampaignId(null);
            setCampaignForm(emptyCampaignForm);
            setNotice(editingCampaignId ? "Campaign guncellendi." : "Campaign olusturuldu.");
            await loadCampaigns();
        } finally {
            setSaving(false);
        }
    };

    const submitCodes = async () => {
        if (!eligibleCodeCampaigns.some((campaign) => String(campaign.id) === codeForm.campaignId)) {
            setError("Kod uretimi icin aktif ve arsivlenmemis bir campaign sec.");
            return;
        }

        setSaving(true);
        setNotice(null);
        setError(null);
        try {
            const payload = {
                campaignId: Number.parseInt(codeForm.campaignId, 10),
                label: codeForm.label.trim() || null,
                manualCode: codeForm.manualCode.trim() ? codeForm.manualCode.trim().toUpperCase() : null,
                prefix: codeForm.prefix.trim() ? codeForm.prefix.trim().toUpperCase() : null,
                quantity: Number.parseInt(codeForm.quantity, 10),
                maxClaims: toNullableInt(codeForm.maxClaims),
                expiresAt: toIsoDateTime(codeForm.expiresAt),
                isActive: codeForm.isActive,
            };

            const response = await fetch("/api/admin/coin-grants/codes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorPayload = (await response.json().catch(() => ({ error: "Kodlar olusturulamadi." }))) as { error?: string };
                window.alert(errorPayload.error || "Kodlar olusturulamadi.");
                return;
            }

            setCodeForm((current) => ({ ...emptyCodeForm, campaignId: current.campaignId }));
            setNotice("Kodlar olusturuldu.");
            await loadCampaigns();
        } finally {
            setSaving(false);
        }
    };

    const editCampaign = (campaign: CoinGrantCampaignView) => {
        if (campaign.archivedAt) {
            setError("Arsivli campaign duzenlenemez.");
            return;
        }

        setEditingCampaignId(campaign.id);
        setCampaignForm({
            code: campaign.code,
            name: campaign.name,
            description: campaign.description ?? "",
            coinAmount: String(campaign.coinAmount),
            totalBudgetCoin: campaign.totalBudgetCoin !== null ? String(campaign.totalBudgetCoin) : "",
            totalClaimLimit: campaign.totalClaimLimit !== null ? String(campaign.totalClaimLimit) : "",
            perUserClaimLimit: String(campaign.perUserClaimLimit),
            startsAt: toDateTimeLocal(campaign.startsAt),
            endsAt: toDateTimeLocal(campaign.endsAt),
            isActive: campaign.isActive,
        });
    };

    const deactivateCampaign = async (campaign: CoinGrantCampaignView) => {
        if (!campaign.isActive) {
            setNotice("Bu campaign zaten pasif.");
            return;
        }

        setNotice(null);
        setDeactivatingCampaignId(campaign.id);
        try {
            const response = await fetch(`/api/admin/coin-grants/campaigns/${campaign.id}`, { method: "DELETE" });
            if (!response.ok) {
                const errorPayload = (await response.json().catch(() => ({ error: "Campaign kapatilamadi." }))) as { error?: string };
                setError(errorPayload.error || "Campaign kapatilamadi.");
                return;
            }

            const payload = (await response.json().catch(() => ({ ok: true, outcome: "deactivated" }))) as {
                ok?: boolean;
                outcome?: "deleted" | "deactivated";
            };

            if (payload.outcome === "deleted") {
                setCampaigns((current) => current.filter((entry) => entry.id !== campaign.id));
                setNotice(`${campaign.name} silindi.`);
            } else {
                setCampaigns((current) =>
                    current.map((entry) =>
                        entry.id === campaign.id
                            ? { ...entry, isActive: false, updatedAt: new Date().toISOString() }
                            : entry
                    )
                );
                setNotice(`${campaign.name} pasife alindi.`);
            }
            await loadCampaigns();
        } finally {
            setDeactivatingCampaignId(null);
        }
    };

    const deactivateCode = async (campaignId: number, codeId: number) => {
        const parentCampaign = campaigns.find((campaign) => campaign.id === campaignId);
        const code = parentCampaign?.codes.find((entry) => entry.id === codeId);
        if (code && !code.isActive) {
            setNotice("Bu kod zaten pasif.");
            return;
        }

        setNotice(null);
        setDeactivatingCodeId(codeId);
        try {
            const response = await fetch(`/api/admin/coin-grants/codes/${codeId}`, { method: "DELETE" });
            if (!response.ok) {
                const errorPayload = (await response.json().catch(() => ({ error: "Kod kapatilamadi." }))) as { error?: string };
                setError(errorPayload.error || "Kod kapatilamadi.");
                return;
            }

            const payload = (await response.json().catch(() => ({ ok: true, outcome: "deactivated" }))) as {
                ok?: boolean;
                outcome?: "deleted" | "deactivated";
            };

            setCampaigns((current) =>
                current.map((campaign) =>
                    campaign.id === campaignId
                        ? {
                            ...campaign,
                            codes:
                                payload.outcome === "deleted"
                                    ? campaign.codes.filter((entry) => entry.id !== codeId)
                                    : campaign.codes.map((entry) =>
                                        entry.id === codeId ? { ...entry, isActive: false } : entry
                                    ),
                        }
                        : campaign
                )
            );
            setNotice(payload.outcome === "deleted" ? "Kod silindi." : "Kod pasife alindi.");
            await loadCampaigns();
        } finally {
            setDeactivatingCodeId(null);
        }
    };

    const archiveCampaign = async (campaign: CoinGrantCampaignView) => {
        if (campaign.archivedAt) {
            setNotice("Bu campaign zaten arsivde.");
            return;
        }
        if (campaign.isActive) {
            setError("Campaign arsivlenmeden once pasife alinmali.");
            return;
        }

        setError(null);
        setNotice(null);
        setArchivingCampaignId(campaign.id);
        try {
            const response = await fetch(`/api/admin/coin-grants/campaigns/${campaign.id}/archive`, { method: "POST" });
            if (!response.ok) {
                const errorPayload = (await response.json().catch(() => ({ error: "Campaign arsivlenemedi." }))) as { error?: string };
                setError(errorPayload.error || "Campaign arsivlenemedi.");
                return;
            }

            setCampaigns((current) =>
                current.map((entry) =>
                    entry.id === campaign.id
                        ? { ...entry, archivedAt: new Date().toISOString() }
                        : entry
                )
            );
            setNotice(`${campaign.name} arsive alindi.`);
            await loadCampaigns();
        } finally {
            setArchivingCampaignId(null);
        }
    };

    const archiveCode = async (campaignId: number, codeId: number) => {
        const parentCampaign = campaigns.find((campaign) => campaign.id === campaignId);
        const code = parentCampaign?.codes.find((entry) => entry.id === codeId);
        if (code?.archivedAt) {
            setNotice("Bu kod zaten arsivde.");
            return;
        }
        if (code?.isActive) {
            setError("Kod arsivlenmeden once pasife alinmali.");
            return;
        }

        setError(null);
        setNotice(null);
        setArchivingCodeId(codeId);
        try {
            const response = await fetch(`/api/admin/coin-grants/codes/${codeId}/archive`, { method: "POST" });
            if (!response.ok) {
                const errorPayload = (await response.json().catch(() => ({ error: "Kod arsivlenemedi." }))) as { error?: string };
                setError(errorPayload.error || "Kod arsivlenemedi.");
                return;
            }

            setCampaigns((current) =>
                current.map((campaign) =>
                    campaign.id === campaignId
                        ? {
                            ...campaign,
                            codes: campaign.codes.map((entry) =>
                                entry.id === codeId ? { ...entry, archivedAt: new Date().toISOString() } : entry
                            ),
                        }
                        : campaign
                )
            );
            setNotice("Kod arsive alindi.");
            await loadCampaigns();
        } finally {
            setArchivingCodeId(null);
        }
    };

    const toggleCampaignDetails = (campaignId: number) => {
        setExpandedCampaignIds((current) =>
            current.includes(campaignId)
                ? current.filter((entry) => entry !== campaignId)
                : [...current, campaignId]
        );
    };
    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="Coin Grants"
                description="Influencer kodu, etkinlik odulu veya toplu coin dagitimi icin kontrollu operasyon paneli."
                meta={`${campaigns.length} campaign`}
                icon={<Gift className="h-5 w-5 text-amber-500" />}
            />

            <AdminToolbar>
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Campaign, aciklama veya kod ara..."
                        className="pl-9"
                    />
                </div>
                <AdminToolbarStats stats={stats} />
            </AdminToolbar>

            {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                </div>
            ) : null}
            {notice ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {notice}
                </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
                {([
                    ["all", "Tum kayitlar"],
                    ["active", "Aktif"],
                    ["inactive", "Pasif"],
                    ["used", "Kullanilan"],
                    ["exhausted", "Tukenen"],
                    ["archived", "Arsiv"],
                ] as Array<[CampaignViewFilter, string]>).map(([key, label]) => (
                    <Button
                        key={key}
                        type="button"
                        variant={viewFilter === key ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewFilter(key)}
                    >
                        {label}
                    </Button>
                ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <AdminTableShell
                    title="Aktif Dagitimlar"
                    description="Campaign butcesi, claim limiti, tukenen dagitimlar ve code dagilimi buradan izlenir."
                    loading={loading}
                    isEmpty={!loading && filteredCampaigns.length === 0}
                    emptyState={
                        <AdminEmptyState
                            icon={<Gift className="h-6 w-6" />}
                            title="Coin grant campaign'i yok"
                            description="Ilk campaign ile bir etkinlik drop'u, influencer dagitimi veya topluluk odulu hazirlayabilirsin."
                        />
                    }
                >
                    <div className="space-y-4 p-4">
                        {filteredCampaigns.map((campaign) => {
                            const visibleCodes = campaign.codes.filter((code) => !code.archivedAt || viewFilter === "archived");
                            const isExpanded = expandedCampaignIds.includes(campaign.id);
                            const archivedCodeCount = campaign.codes.filter((code) => code.archivedAt).length;

                            return (
                                <article key={campaign.id} className="rounded-[28px] border border-border/80 bg-background/90 p-5 shadow-sm">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-semibold text-foreground">{campaign.name}</h3>
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${campaign.isActive ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"}`}
                                                >
                                                    {campaign.isActive ? "aktif" : "pasif"}
                                                </span>
                                                {campaign.archivedAt ? (
                                                    <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-violet-700">
                                                        arsiv
                                                    </span>
                                                ) : null}
                                                {isCampaignUsed(campaign) ? (
                                                    <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-sky-700">
                                                        kullanildi
                                                    </span>
                                                ) : null}
                                                {isCampaignExhausted(campaign) ? (
                                                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                                                        tukendi
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="mt-1 font-mono text-xs text-muted-foreground">{campaign.code}</div>
                                            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                                                {campaign.description || "Bu campaign icin ayri bir aciklama girilmemis."}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => toggleCampaignDetails(campaign.id)}>
                                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                <span>{isExpanded ? "Detayi kapat" : "Detayi ac"}</span>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={Boolean(campaign.archivedAt)}
                                                onClick={() => editCampaign(campaign)}
                                            >
                                                Duzenle
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={deactivatingCampaignId === campaign.id || !campaign.isActive || Boolean(campaign.archivedAt)}
                                                onClick={() => void deactivateCampaign(campaign)}
                                            >
                                                <Trash2 size={14} />
                                                <span className="ml-2">{campaign.isActive ? "Pasife al" : "Pasif"}</span>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={archivingCampaignId === campaign.id || campaign.isActive || Boolean(campaign.archivedAt)}
                                                onClick={() => void archiveCampaign(campaign)}
                                            >
                                                <Archive size={14} />
                                                <span className="ml-2">{campaign.archivedAt ? "Arsivde" : archivingCampaignId === campaign.id ? "Arsivleniyor" : "Arsivle"}</span>
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid gap-3 md:grid-cols-4">
                                        <StatChip icon={BadgeDollarSign} label="coin / claim" value={campaign.coinAmount.toLocaleString("tr-TR")} />
                                        <StatChip
                                            icon={Gift}
                                            label="dagitilan / butce"
                                            value={`${campaign.totalGrantedCoin.toLocaleString("tr-TR")} / ${campaign.totalBudgetCoin !== null ? campaign.totalBudgetCoin.toLocaleString("tr-TR") : "limitsiz"}`}
                                        />
                                        <StatChip
                                            icon={Hash}
                                            label="claim / limit"
                                            value={`${campaign.totalClaimCount.toLocaleString("tr-TR")} / ${campaign.totalClaimLimit !== null ? campaign.totalClaimLimit.toLocaleString("tr-TR") : "limitsiz"}`}
                                        />
                                        <StatChip icon={Users} label="kullanici basi" value={String(campaign.perUserClaimLimit)} />
                                    </div>

                                    <div className="mt-3 text-sm text-muted-foreground">
                                        {visibleCodes.length} gorunen kod
                                        {archivedCodeCount > 0 ? ` | ${archivedCodeCount} arsivli` : ""}
                                    </div>

                                    {isExpanded ? (
                                        <>
                                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                                <div className="rounded-2xl border border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
                                                    <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                                                        <Clock3 className="h-3.5 w-3.5" />
                                                        Campaign takvimi
                                                    </div>
                                                    <div>Baslangic: {formatDateTime(campaign.startsAt)}</div>
                                                    <div>Bitis: {formatDateTime(campaign.endsAt)}</div>
                                                </div>
                                                <div className="rounded-2xl border border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
                                                    <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                                                        <ShieldCheck className="h-3.5 w-3.5" />
                                                        Dagitim notu
                                                    </div>
                                                    <div>Campaign claim, budget ve user limiti server transaction&apos;i icinde enforce edilir.</div>
                                                </div>
                                            </div>

                                            <div className="mt-4 rounded-2xl border border-border/70 bg-muted/15 p-3">
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                                                    <Sparkles className="h-3.5 w-3.5" />
                                                    Dagitim kodlari
                                                </div>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {visibleCodes.length === 0 ? (
                                                        <span className="text-sm text-muted-foreground">Bu campaign icin henuz kod uretilmemis.</span>
                                                    ) : (
                                                        visibleCodes.map((code) => (
                                                            <div key={code.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/20 px-3 py-1.5 text-xs text-foreground">
                                                                <span className="font-mono font-semibold">{code.code}</span>
                                                                <span className="text-muted-foreground">
                                                                    {code.claimCount}{code.maxClaims !== null ? ` / ${code.maxClaims}` : " / limitsiz"}
                                                                </span>
                                                                {code.label ? <span className="text-muted-foreground">{code.label}</span> : null}
                                                                {!code.isActive ? <span className="text-amber-600">pasif</span> : null}
                                                                {code.archivedAt ? <span className="text-violet-600">arsiv</span> : null}
                                                                {!code.archivedAt ? (
                                                                    <>
                                                                        {code.isActive ? (
                                                                            <button
                                                                                type="button"
                                                                                disabled={deactivatingCodeId === code.id}
                                                                                onClick={() => void deactivateCode(campaign.id, code.id)}
                                                                                className="font-semibold text-red-500 disabled:cursor-not-allowed disabled:text-zinc-400"
                                                                            >
                                                                                {deactivatingCodeId === code.id ? "kapatiliyor" : "kapat"}
                                                                            </button>
                                                                        ) : (
                                                                            <button
                                                                                type="button"
                                                                                disabled={archivingCodeId === code.id}
                                                                                onClick={() => void archiveCode(campaign.id, code.id)}
                                                                                className="font-semibold text-violet-600 disabled:cursor-not-allowed disabled:text-zinc-400"
                                                                            >
                                                                                {archivingCodeId === code.id ? "arsivleniyor" : "arsivle"}
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                ) : null}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    ) : null}
                                </article>
                            );
                        })}
                    </div>
                </AdminTableShell>

                <div className="space-y-6">
                    <div className="rounded-[30px] border border-border/80 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/80 p-5 shadow-sm dark:from-amber-950/20 dark:via-background dark:to-orange-950/10">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">
                                    {editingCampaignId ? "Campaign duzenle" : "Yeni campaign"}
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Burada coin miktarini, toplam butceyi ve campaign kapsamindaki claim kurallarini belirliyorsun.
                                </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => { setEditingCampaignId(null); setCampaignForm(emptyCampaignForm); }}>
                                <Plus size={14} className="mr-1" /> Yeni
                            </Button>
                        </div>

                        <div className="mt-5 space-y-4">
                            <div className={sectionClassName}>
                                <SectionLabel title="Kimlik" description="Kod audit log ve operasyon takibinde campaign'in ana referansi olur." />
                                <div className="grid gap-3 md:grid-cols-2">
                                    <input className={inputClassName} placeholder="Campaign kodu" value={campaignForm.code} onChange={(event) => setCampaignForm((current) => ({ ...current, code: event.target.value }))} />
                                    <input className={inputClassName} placeholder="Campaign ismi" value={campaignForm.name} onChange={(event) => setCampaignForm((current) => ({ ...current, name: event.target.value }))} />
                                </div>
                                <textarea className={`${inputClassName} min-h-[88px] resize-y`} placeholder="Bu campaign ne icin kullaniliyor?" value={campaignForm.description} onChange={(event) => setCampaignForm((current) => ({ ...current, description: event.target.value }))} />
                            </div>

                            <div className={sectionClassName}>
                                <SectionLabel title="Ekonomi kurallari" description="Coin miktari ve toplam dagitim ust limitleri burada tanimlanir." />
                                <div className="grid gap-3 md:grid-cols-2">
                                    <input className={inputClassName} type="number" min="1" placeholder="Claim basina coin" value={campaignForm.coinAmount} onChange={(event) => setCampaignForm((current) => ({ ...current, coinAmount: event.target.value }))} />
                                    <input className={inputClassName} type="number" min="1" placeholder="Kullanici basi claim limiti" value={campaignForm.perUserClaimLimit} onChange={(event) => setCampaignForm((current) => ({ ...current, perUserClaimLimit: event.target.value }))} />
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <input className={inputClassName} type="number" min="1" placeholder="Toplam budget coin (opsiyonel)" value={campaignForm.totalBudgetCoin} onChange={(event) => setCampaignForm((current) => ({ ...current, totalBudgetCoin: event.target.value }))} />
                                    <input className={inputClassName} type="number" min="1" placeholder="Toplam claim limiti (opsiyonel)" value={campaignForm.totalClaimLimit} onChange={(event) => setCampaignForm((current) => ({ ...current, totalClaimLimit: event.target.value }))} />
                                </div>
                            </div>

                            <div className={sectionClassName}>
                                <SectionLabel title="Takvim ve durum" description="Campaign'i zaman penceresiyle veya manuel aktif/pasif olarak yonetebilirsin." />
                                <div className="grid gap-3 md:grid-cols-2">
                                    <input className={inputClassName} type="datetime-local" value={campaignForm.startsAt} onChange={(event) => setCampaignForm((current) => ({ ...current, startsAt: event.target.value }))} />
                                    <input className={inputClassName} type="datetime-local" value={campaignForm.endsAt} onChange={(event) => setCampaignForm((current) => ({ ...current, endsAt: event.target.value }))} />
                                </div>
                                <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/20 px-3 py-3 text-sm text-foreground">
                                    <input type="checkbox" checked={campaignForm.isActive} onChange={(event) => setCampaignForm((current) => ({ ...current, isActive: event.target.checked }))} />
                                    Campaign aktif kalsin
                                </label>
                            </div>

                            <div className="flex gap-2">
                                <Button onClick={() => void submitCampaign()} disabled={saving}>{editingCampaignId ? "Campaign'i guncelle" : "Campaign olustur"}</Button>
                                {editingCampaignId !== null ? <Button variant="outline" onClick={() => { setEditingCampaignId(null); setCampaignForm(emptyCampaignForm); }}>Iptal</Button> : null}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[30px] border border-border/80 bg-background/95 p-5 shadow-sm">
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">Kod Uretim Merkezi</h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Tek kullanicilik influencer kodu ya da toplu etkinlik batch&apos;i buradan uretilir.
                                </p>
                        </div>

                        <div className="mt-5 space-y-4">
                            <div className={sectionClassName}>
                                <SectionLabel title="Hedef campaign" description="Kodlar claim oldugunda coin miktarini secilen campaign belirler." />
                                <select className={inputClassName} value={codeForm.campaignId} onChange={(event) => setCodeForm((current) => ({ ...current, campaignId: event.target.value }))}>
                                    <option value="">Campaign sec</option>
                                    {eligibleCodeCampaigns.map((campaign) => (
                                        <option key={campaign.id} value={campaign.id}>{campaign.name} ({campaign.code})</option>
                                    ))}
                                </select>
                                {eligibleCodeCampaigns.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                        Kod uretmek icin once aktif ve arsivlenmemis bir campaign olustur.
                                    </p>
                                ) : null}
                            </div>

                            <div className={sectionClassName}>
                                <SectionLabel title="Kod uretim modu" description="Tek bir manual code girebilir veya prefix ile batch uretebilirsin." />
                                <div className="grid gap-3 md:grid-cols-2">
                                    <input className={inputClassName} placeholder="Manual code (tekli kullanim)" value={codeForm.manualCode} onChange={(event) => setCodeForm((current) => ({ ...current, manualCode: event.target.value }))} />
                                    <input className={inputClassName} placeholder="Prefix (batch icin)" value={codeForm.prefix} onChange={(event) => setCodeForm((current) => ({ ...current, prefix: event.target.value }))} />
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <input className={inputClassName} placeholder="Label / not" value={codeForm.label} onChange={(event) => setCodeForm((current) => ({ ...current, label: event.target.value }))} />
                                    <input className={inputClassName} type="number" min="1" max="100" placeholder="Batch quantity" value={codeForm.quantity} onChange={(event) => setCodeForm((current) => ({ ...current, quantity: event.target.value }))} />
                                </div>
                            </div>

                            <div className={sectionClassName}>
                                <SectionLabel title="Kod guvenlik limitleri" description="Kod bazli claim limitini ve opsiyonel son kullanim tarihini ayarla." />
                                <div className="grid gap-3 md:grid-cols-2">
                                    <input className={inputClassName} type="number" min="1" placeholder="Kod claim limiti" value={codeForm.maxClaims} onChange={(event) => setCodeForm((current) => ({ ...current, maxClaims: event.target.value }))} />
                                    <input className={inputClassName} type="datetime-local" value={codeForm.expiresAt} onChange={(event) => setCodeForm((current) => ({ ...current, expiresAt: event.target.value }))} />
                                </div>
                                <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/20 px-3 py-3 text-sm text-foreground">
                                    <input type="checkbox" checked={codeForm.isActive} onChange={(event) => setCodeForm((current) => ({ ...current, isActive: event.target.checked }))} />
                                    Kodlar aktif olusturulsun
                                </label>
                            </div>

                            <Button
                                onClick={() => void submitCodes()}
                                disabled={saving || !codeForm.campaignId || eligibleCodeCampaigns.length === 0}
                            >
                                Kodlari uret
                            </Button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

