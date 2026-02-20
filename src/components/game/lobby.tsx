"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Settings,
    Trophy,
    Hash,
    Clock,
    Link2,
    Copy,
    Check,
    LayoutGrid,
    X,
    Shuffle,
    Users,
    EyeOff,
    Eye,
    ChevronDown,
    Square,
    CheckSquare,
    Play,
} from "lucide-react";
import type { Player, CategoryItem } from "@/types/game";

interface LobbyProps {
    roomCode: string;
    players: Player[];
    settings: { sure: number; mod: "tur" | "skor"; deger: number };
    selectedCategories: number[];
    selectedDifficulties: number[];
    categories: CategoryItem[];
    isHost: boolean;
    onUpdateSettings: (settings: {
        sure: number;
        mod: "tur" | "skor";
        deger: number;
    }) => void;
    onUpdateCategories: (ids: number[]) => void;
    onUpdateDifficulties: (ids: number[]) => void;
    onInitialSet?: (categories: number[], difficulties: number[]) => void;
    onShuffleTeams: () => void;
    onStartGame: () => void;
}

const difficultyLabels: Record<number, string> = {
    1: "Kolay",
    2: "Orta",
    3: "Zor",
};

export function Lobby({
    roomCode,
    players,
    settings,
    selectedCategories,
    selectedDifficulties,
    categories,
    isHost,
    onUpdateSettings,
    onUpdateCategories,
    onUpdateDifficulties,
    onInitialSet,
    onShuffleTeams,
    onStartGame,
}: LobbyProps) {
    const [copied, setCopied] = useState(false);
    const [hideUrl, setHideUrl] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [tempSelectedCategories, setTempSelectedCategories] = useState<number[]>(selectedCategories);
    const [tempSelectedDifficulties, setTempSelectedDifficulties] = useState<number[]>(selectedDifficulties);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const id = setTimeout(() => setMounted(true), 0);
        return () => clearTimeout(id);
    }, []);

    const copyRoomLink = () => {
        const link = `${window.location.origin}/room/${roomCode}`;
        navigator.clipboard?.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Flatten categories - memoize to avoid recomputation on every render
    const flatCategories = useMemo(() => {
        const result: CategoryItem[] = [];
        if (Array.isArray(categories)) {
            for (const cat of categories) {
                result.push(cat);
                if ((cat as { children?: CategoryItem[] }).children) {
                    for (const child of (cat as { children: CategoryItem[] }).children) {
                        result.push(child);
                    }
                }
            }
        }
        return result;
    }, [categories]);

    // Initialize categories and difficulties when first loaded (run once)
    useEffect(() => {
        // Only initialize if both are empty (first time loading)
        if (categories.length > 0 && selectedCategories.length === 0 && selectedDifficulties.length === 0) {
            // Select all categories by default
            const allCategoryIds = flatCategories.map(c => c.id);
            const allDifficulties = [1, 2, 3];
            // Use onInitialSet if available to avoid race condition
            if (onInitialSet) {
                onInitialSet(allCategoryIds, allDifficulties);
            } else if (onUpdateCategories && onUpdateDifficulties) {
                // Fallback to old API
                onUpdateCategories(allCategoryIds);
                setTimeout(() => onUpdateDifficulties(allDifficulties), 10);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categories.length, flatCategories.length]);

    // Memoize parent categories for accordion
    const parentCategories = useMemo(() =>
        categories.filter((c) => !(c as { parentId?: number }).parentId),
        [categories]
    );

    const toggleCategory = (id: number) => {
        setTempSelectedCategories((prev) =>
            prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
        );
    };

    const toggleDifficulty = (level: number) => {
        setTempSelectedDifficulties((prev) => {
            if (prev.includes(level)) {
                if (prev.length === 1) return prev; // Don't deselect last
                return prev.filter((d) => d !== level);
            }
            return [...prev, level];
        });
    };

    const toggleExpand = (key: string) => {
        setExpandedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const confirmCategories = () => {
        onUpdateCategories(tempSelectedCategories);
        onUpdateDifficulties(tempSelectedDifficulties);
        setShowCategoryModal(false);
    };

    const isAllSelected = flatCategories.length > 0 && flatCategories.every((c) => tempSelectedCategories.includes(c.id));

    const toggleAllCategories = () => {
        if (isAllSelected) {
            setTempSelectedCategories([]);
        } else {
            setTempSelectedCategories(flatCategories.map((c) => c.id));
        }
    };

    const getSelectedText = () => {
        if (selectedCategories.length === 0) return "Henüz kategori seçilmedi";
        if (flatCategories.length > 0 && selectedCategories.length === flatCategories.length) return "Tüm Kategoriler";
        const first = flatCategories.find((c) => c.id === selectedCategories[0]);
        if (selectedCategories.length === 1) return first?.name || "1 kategori";
        return `${first?.name || "?"} +${selectedCategories.length - 1} diğer`;
    };

    return (
        <div className="flex flex-col items-center w-full max-w-xl mx-auto p-4 sm:p-6 animate-fade-in">
            {/* Logo */}
            <div className="mb-6 sm:mb-8">
                <h1 className="font-black text-5xl sm:text-6xl">
                    <span className="text-red-500">TA</span>
                    <span className="text-blue-500">BU</span>
                </h1>
            </div>

            <div className="w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                {/* Header — URL Style Room Code */}
                <div className="bg-gray-50 dark:bg-slate-900 p-6 border-b border-gray-100 dark:border-slate-700 transition-all duration-300">
                    {!hideUrl ? (
                        <div className="animate-fade-in">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">
                                Davet Bağlantısı
                            </label>

                            <button
                                onClick={copyRoomLink}
                                className="w-full bg-slate-800 text-left rounded-lg p-3.5 flex items-center justify-between group hover:bg-slate-700 transition-colors shadow-inner ring-1 ring-white/10 mb-3"
                            >
                                <div className="flex items-center gap-2 overflow-hidden font-mono text-sm sm:text-base w-full">
                                    <Link2
                                        size={16}
                                        className="text-blue-400 flex-shrink-0"
                                    />
                                    <div className="flex items-center truncate">
                                        <span className="text-slate-400">
                                            {mounted ? `${window.location.origin}/room/` : "/room/"}
                                        </span>
                                        <span className="text-white font-bold tracking-wider">
                                            {roomCode}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex-shrink-0 ml-3">
                                    {copied ? (
                                        <Check
                                            size={18}
                                            className="text-green-400"
                                        />
                                    ) : (
                                        <Copy
                                            size={18}
                                            className="text-slate-400 group-hover:text-white transition-colors"
                                        />
                                    )}
                                </div>
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-2 animate-fade-in">
                            <span className="text-sm text-gray-400 italic">
                                Bağlantı ve Oda Kodu Gizlendi
                            </span>
                        </div>
                    )}

                    <button
                        onClick={() => setHideUrl(!hideUrl)}
                        className="flex items-center justify-center gap-2 w-full text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    >
                        {hideUrl ? <Eye size={14} /> : <EyeOff size={14} />}
                        {hideUrl
                            ? "Bağlantıyı Göster"
                            : "URL Ve Oda Kodunu Gizle"}
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8">
                    {/* Action Buttons Grid */}
                    <div>
                        <div className="grid grid-cols-3 gap-3">
                            {/* Categories Button */}
                            <button
                                onClick={() => {
                                    setTempSelectedCategories(selectedCategories);
                                    setTempSelectedDifficulties(selectedDifficulties);
                                    setShowCategoryModal(true);
                                }}
                                disabled={!isHost}
                                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 transition-all active:scale-95 disabled:opacity-50"
                            >
                                <LayoutGrid size={24} />
                                <span className="text-xs font-bold">
                                    Kategoriler
                                </span>
                            </button>

                            {/* Shuffle Teams Button */}
                            <button
                                onClick={onShuffleTeams}
                                disabled={!isHost}
                                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 transition-all active:scale-95 disabled:opacity-50"
                            >
                                <Shuffle size={24} />
                                <span className="text-xs font-bold">
                                    Takım Karıştır
                                </span>
                            </button>

                            {/* Change Team Button */}
                            <button
                                onClick={() => {
                                    /* emit handled from parent */
                                }}
                                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 transition-all active:scale-95"
                            >
                                <Users size={24} />
                                <span className="text-xs font-bold">
                                    Takım Değiştir
                                </span>
                            </button>
                        </div>

                        {/* Selected Categories Info */}
                        <div className="mt-4 text-center">
                            <span className="text-xs text-gray-400 uppercase font-semibold">
                                Seçili Kategoriler
                            </span>
                            <div className="flex items-center justify-center gap-2 mt-1">
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                    {getSelectedText()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 dark:bg-slate-700" />

                    {/* Game Settings */}
                    <div>
                        <div className="flex items-center gap-2 mb-4 text-gray-800 dark:text-gray-200">
                            <Settings size={18} />
                            <h3 className="font-semibold">Oyun Ayarları</h3>
                        </div>

                        {/* Game Mode Selection */}
                        <div className="mb-4">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                Oyun Modu
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() =>
                                        isHost &&
                                        onUpdateSettings({
                                            ...settings,
                                            mod: "tur",
                                        })
                                    }
                                    disabled={!isHost}
                                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${settings.mod === "tur"
                                        ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300 ring-1 ring-blue-500/20"
                                        : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                                        }`}
                                >
                                    <Hash size={16} />
                                    <span className="text-sm font-medium">
                                        Tur Sayısı
                                    </span>
                                </button>
                                <button
                                    onClick={() =>
                                        isHost &&
                                        onUpdateSettings({
                                            ...settings,
                                            mod: "skor",
                                        })
                                    }
                                    disabled={!isHost}
                                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${settings.mod === "skor"
                                        ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300 ring-1 ring-blue-500/20"
                                        : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                                        }`}
                                >
                                    <Trophy size={16} />
                                    <span className="text-sm font-medium">
                                        Hedef Skor
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                                    <Clock size={12} /> Süre (Saniye)
                                </label>
                                <select
                                    value={settings.sure}
                                    onChange={(e) =>
                                        onUpdateSettings({
                                            ...settings,
                                            sure: Number(e.target.value),
                                        })
                                    }
                                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    disabled={!isHost}
                                >
                                    <option value={30}>30 Saniye</option>
                                    <option value={45}>45 Saniye</option>
                                    <option value={60}>60 Saniye</option>
                                    <option value={90}>90 Saniye</option>
                                    <option value={120}>120 Saniye</option>
                                </select>
                            </div>

                            <div>
                                {settings.mod === "tur" ? (
                                    <>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                                            <Hash size={12} /> Toplam Tur
                                        </label>
                                        <select
                                            value={settings.deger}
                                            onChange={(e) =>
                                                onUpdateSettings({
                                                    ...settings,
                                                    deger: Number(
                                                        e.target.value
                                                    ),
                                                })
                                            }
                                            className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            disabled={!isHost}
                                        >
                                            <option value={1}>1 Tur</option>
                                            <option value={2}>2 Tur</option>
                                            <option value={3}>3 Tur</option>
                                            <option value={5}>5 Tur</option>
                                        </select>
                                    </>
                                ) : (
                                    <>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                                            <Trophy size={12} /> Hedef Skor
                                        </label>
                                        <input
                                            type="number"
                                            min={10}
                                            max={100}
                                            step={5}
                                            value={settings.deger}
                                            onChange={(e) =>
                                                onUpdateSettings({
                                                    ...settings,
                                                    deger:
                                                        Number(
                                                            e.target.value
                                                        ) || 10,
                                                })
                                            }
                                            className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            disabled={!isHost}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Start Action */}
                    <div className="pt-2">
                        {isHost ? (
                            <button
                                onClick={onStartGame}
                                disabled={
                                    selectedCategories.length === 0 ||
                                    selectedDifficulties.length === 0 ||
                                    players.filter(
                                        (p) => p.takim === "A" && p.online
                                    ).length < 2 ||
                                    players.filter(
                                        (p) => p.takim === "B" && p.online
                                    ).length < 2
                                }
                                className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold text-lg shadow-lg shadow-green-600/20 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2"
                            >
                                <Play size={22} />
                                Oyunu Başlat
                            </button>
                        ) : (
                            <div className="w-full py-4 text-gray-400 text-center text-sm animate-pulse bg-gray-50 dark:bg-slate-900/50 rounded-xl">
                                Yönetici oyunu başlatıyor...
                            </div>
                        )}

                        {/* Requirements notice */}
                        {isHost &&
                            (players.filter(
                                (p) => p.takim === "A" && p.online
                            ).length < 2 ||
                                players.filter(
                                    (p) => p.takim === "B" && p.online
                                ).length < 2) && (
                                <p className="text-xs text-muted-foreground text-center mt-2">
                                    Her takımda en az 2 çevrimiçi oyuncu
                                    gerekli.
                                </p>
                            )}
                    </div>
                </div>
            </div>

            {/* Category Selection Modal - ACCORDION STYLE */}
            {showCategoryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <LayoutGrid className="text-blue-500" />
                                    Kategoriler
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Ana kategoriyi seçerek tümünü
                                    ekleyebilirsin.
                                </p>

                                {/* Difficulty Selection */}
                                <div className="mt-3 flex items-center gap-2">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide mr-1">
                                        Zorluk:
                                    </span>
                                    {[1, 2, 3].map((diff) => {
                                        const isSelected =
                                            tempSelectedDifficulties.includes(
                                                diff
                                            );
                                        return (
                                            <button
                                                key={diff}
                                                onClick={() =>
                                                    toggleDifficulty(diff)
                                                }
                                                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${isSelected
                                                    ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900 border-transparent"
                                                    : "bg-transparent text-gray-400 border-gray-300 dark:border-slate-600"
                                                    }`}
                                            >
                                                {difficultyLabels[diff]}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCategoryModal(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-500 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="space-y-2">
                                {/* Select All Row */}
                                <div className="bg-gray-50 dark:bg-slate-900 rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700 mb-2">
                                    <div className="flex items-center p-3 gap-3 bg-blue-50/50 dark:bg-blue-900/10">
                                        <button
                                            onClick={toggleAllCategories}
                                            className={`flex-shrink-0 transition-colors ${isAllSelected ? "text-blue-600" : "text-gray-300 dark:text-gray-600"}`}
                                        >
                                            {isAllSelected ? (
                                                <CheckSquare size={24} />
                                            ) : (
                                                <Square size={24} />
                                            )}
                                        </button>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                                            Tüm Kategoriler
                                        </span>
                                    </div>
                                </div>

                                {/* Category Accordion */}
                                {parentCategories.map((mainCat) => {
                                    const children = (
                                        mainCat as {
                                            children?: CategoryItem[];
                                        }
                                    ).children || [];
                                    const allItems =
                                        children.length > 0
                                            ? children
                                            : [mainCat];
                                    const allSubSelected = allItems.every((c) =>
                                        tempSelectedCategories.includes(c.id)
                                    );
                                    const someSubSelected = allItems.some((c) =>
                                        tempSelectedCategories.includes(c.id)
                                    );
                                    const isExpanded = expandedCategories.has(
                                        String(mainCat.id)
                                    );

                                    return (
                                        <div
                                            key={mainCat.id}
                                            className="bg-gray-50 dark:bg-slate-900 rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700"
                                        >
                                            {/* Accordion Header */}
                                            <div className="flex items-center p-3 gap-3">
                                                <button
                                                    onClick={() => {
                                                        const ids =
                                                            allItems.map(
                                                                (c) => c.id
                                                            );
                                                        if (allSubSelected) {
                                                            setTempSelectedCategories(
                                                                (prev) =>
                                                                    prev.filter(
                                                                        (id) =>
                                                                            !ids.includes(
                                                                                id
                                                                            )
                                                                    )
                                                            );
                                                        } else {
                                                            setTempSelectedCategories(
                                                                (prev) => {
                                                                    const set =
                                                                        new Set(
                                                                            prev
                                                                        );
                                                                    ids.forEach(
                                                                        (id) =>
                                                                            set.add(
                                                                                id
                                                                            )
                                                                    );
                                                                    return Array.from(
                                                                        set
                                                                    );
                                                                }
                                                            );
                                                        }
                                                    }}
                                                    className={`flex-shrink-0 transition-colors ${allSubSelected || someSubSelected ? "text-blue-600" : "text-gray-300 dark:text-gray-600"}`}
                                                >
                                                    {allSubSelected ? (
                                                        <CheckSquare
                                                            size={24}
                                                        />
                                                    ) : someSubSelected ? (
                                                        <div className="relative">
                                                            <Square size={24} />
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <div className="w-3 h-3 bg-blue-600 rounded-sm" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <Square size={24} />
                                                    )}
                                                </button>

                                                <button
                                                    onClick={() =>
                                                        toggleExpand(
                                                            String(mainCat.id)
                                                        )
                                                    }
                                                    className="flex-1 flex items-center justify-between group"
                                                >
                                                    <div className="flex flex-col items-start">
                                                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                                                            {mainCat.name}
                                                        </span>
                                                        <span className="text-xs text-gray-400">
                                                            {
                                                                allItems.filter(
                                                                    (c) =>
                                                                        tempSelectedCategories.includes(
                                                                            c.id
                                                                        )
                                                                ).length
                                                            }{" "}
                                                            / {allItems.length}{" "}
                                                            seçili
                                                        </span>
                                                    </div>
                                                    <div
                                                        className={`p-1.5 rounded-full text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-slate-700 transition-all duration-200 ${isExpanded ? "rotate-180" : ""}`}
                                                    >
                                                        <ChevronDown
                                                            size={20}
                                                        />
                                                    </div>
                                                </button>
                                            </div>

                                            {/* Accordion Body - Responsive Grid */}
                                            <div
                                                className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded
                                                    ? "max-h-96 opacity-100"
                                                    : "max-h-0 opacity-0"
                                                    }`}
                                            >
                                                <div className="p-3 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 border-t border-gray-100 dark:border-slate-800 mt-1">
                                                    {allItems.map((subCat) => {
                                                        const isSelected =
                                                            tempSelectedCategories.includes(
                                                                subCat.id
                                                            );
                                                        return (
                                                            <button
                                                                key={subCat.id}
                                                                onClick={() =>
                                                                    toggleCategory(
                                                                        subCat.id
                                                                    )
                                                                }
                                                                className={`p-2.5 rounded-lg border text-left transition-all flex items-center justify-between ${isSelected
                                                                    ? "border-blue-500 bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/50 shadow-sm"
                                                                    : "border-gray-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                                                                    }`}
                                                            >
                                                                <span className="text-xs sm:text-sm font-medium truncate">
                                                                    {
                                                                        subCat.name
                                                                    }
                                                                </span>
                                                                {isSelected && (
                                                                    <Check
                                                                        size={
                                                                            14
                                                                        }
                                                                        className="text-blue-600 dark:text-blue-400 flex-shrink-0"
                                                                    />
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* If no parent categories, show flat list */}
                                {parentCategories.length === 0 &&
                                    flatCategories.length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {flatCategories.map((cat) => {
                                                const isSelected =
                                                    tempSelectedCategories.includes(
                                                        cat.id
                                                    );
                                                return (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() =>
                                                            toggleCategory(
                                                                cat.id
                                                            )
                                                        }
                                                        className={`p-2.5 rounded-lg border text-left transition-all flex items-center justify-between ${isSelected
                                                            ? "border-blue-500 bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/50 shadow-sm"
                                                            : "border-gray-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                                                            }`}
                                                    >
                                                        <span className="text-xs sm:text-sm font-medium truncate">
                                                            {cat.name}
                                                        </span>
                                                        {isSelected && (
                                                            <Check
                                                                size={14}
                                                                className="flex-shrink-0"
                                                            />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                {flatCategories.length === 0 && (
                                    <div className="text-center py-8 text-gray-400">
                                        Kategoriler yükleniyor...
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                            <button
                                onClick={confirmCategories}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-[0.99]"
                            >
                                Seçimi Onayla ({tempSelectedCategories.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
