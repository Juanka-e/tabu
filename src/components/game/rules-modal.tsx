"use client";

import {
    X,
    Book,
    Info,
    Users,
    User,
    Eye,
    Gamepad2,
    Timer,
    Hash,
    Trophy,
    Sparkles,
    Feather,
    Target,
    Flame,
} from "lucide-react";

interface RulesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function RulesModal({ isOpen, onClose }: RulesModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-700 flex flex-col max-h-[85vh]">
                {/* Modal Header */}
                <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800 sticky top-0 z-10">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <Book className="text-purple-500" size={24} /> OYUN
                        REHBERİ
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto space-y-8">
                    {/* 1. Oyun Amacı */}
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <Info className="text-blue-500" size={20} />
                            <h4 className="font-bold text-slate-800 dark:text-white text-lg">
                                Oyunun Amacı
                            </h4>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed ml-7">
                            Takım arkadaşlarına kartın en üstündeki{" "}
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                                hedef kelimeyi
                            </span>{" "}
                            anlatmaya çalış. Yasaklı kelimeleri kullanmadan en
                            çok kelimeyi anlatan takım oyunu kazanır.
                        </p>
                    </section>

                    <hr className="border-gray-100 dark:border-slate-700" />

                    {/* 2. Roller */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="text-purple-500" size={20} />
                            <h4 className="font-bold text-slate-800 dark:text-white text-lg">
                                Oyuncu Rolleri
                            </h4>
                        </div>
                        <div className="grid gap-3 ml-7">
                            <div className="flex gap-3 items-start">
                                <div className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 p-1.5 rounded-lg mt-0.5">
                                    <User size={16} />
                                </div>
                                <div>
                                    <h5 className="font-bold text-sm text-slate-800 dark:text-white">
                                        Anlatan
                                    </h5>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Kelimeyi takımına tarif eden kişidir.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 items-start">
                                <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 p-1.5 rounded-lg mt-0.5">
                                    <Users size={16} />
                                </div>
                                <div>
                                    <h5 className="font-bold text-sm text-slate-800 dark:text-white">
                                        Tahmin Edenler
                                    </h5>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Anlatanın takım arkadaşlarıdır. Hedef
                                        kelimeyi bulmaya çalışırlar.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 items-start">
                                <div className="bg-red-100 dark:bg-red-900/30 text-red-600 p-1.5 rounded-lg mt-0.5">
                                    <Eye size={16} />
                                </div>
                                <div>
                                    <h5 className="font-bold text-sm text-slate-800 dark:text-white">
                                        Gözetmen
                                    </h5>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Rakip takımdan bir oyuncudur. Anlatanın
                                        yasaklı kelime kullanıp kullanmadığını
                                        kontrol eder.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <hr className="border-gray-100 dark:border-slate-700" />

                    {/* 3. Oyun Modları */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <Gamepad2 className="text-indigo-500" size={20} />
                            <h4 className="font-bold text-slate-800 dark:text-white text-lg">
                                Oyun Modları
                            </h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ml-7">
                            <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                                <div className="flex items-center gap-2 mb-2">
                                    <Hash
                                        size={16}
                                        className="text-blue-500"
                                    />
                                    <span className="font-bold text-sm dark:text-white">
                                        Tur Sayısı
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">
                                    Belirlenen tur sayısı (Örn: 3 Tur)
                                    bittiğinde en yüksek puana sahip takım
                                    kazanır.
                                </p>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                                <div className="flex items-center gap-2 mb-2">
                                    <Trophy
                                        size={16}
                                        className="text-amber-500"
                                    />
                                    <span className="font-bold text-sm dark:text-white">
                                        Hedef Skor
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">
                                    Belirlenen puana (Örn: 50 Puan) ilk ulaşan
                                    takım kazanır.
                                </p>
                            </div>
                        </div>

                        {/* Altın Skor */}
                        <div className="mt-4 ml-7 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 p-3 rounded-xl flex gap-3">
                            <Sparkles
                                className="text-amber-500 flex-shrink-0"
                                size={20}
                            />
                            <div>
                                <h5 className="font-bold text-sm text-amber-700 dark:text-amber-400">
                                    Altın Skor Kuralı
                                </h5>
                                <p className="text-xs text-amber-600/80 dark:text-amber-500/80 mt-1">
                                    Eğer tur usulü oyunun sonunda puanlar
                                    eşitse, oyun &quot;Altın Skor&quot; moduna
                                    geçer. Sıradaki kartı bilen ilk takım oyunu
                                    anında kazanır!
                                </p>
                            </div>
                        </div>
                    </section>

                    <hr className="border-gray-100 dark:border-slate-700" />

                    {/* 4. Zorluk Seviyeleri */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <Target className="text-rose-500" size={20} />
                            <h4 className="font-bold text-slate-800 dark:text-white text-lg">
                                Kart Zorlukları
                            </h4>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 ml-7 mb-3">
                            Kartın sağ üst köşesindeki semboller kelimenin
                            zorluğunu belirtir:
                        </p>
                        <div className="flex flex-wrap gap-4 ml-7">
                            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800">
                                <Feather
                                    size={16}
                                    className="text-blue-500"
                                />
                                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                                    Kolay
                                </span>
                            </div>
                            <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 px-3 py-1.5 rounded-lg border border-purple-100 dark:border-purple-800">
                                <Target
                                    size={16}
                                    className="text-purple-500"
                                />
                                <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                                    Orta
                                </span>
                            </div>
                            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg border border-red-100 dark:border-red-800">
                                <Flame size={16} className="text-red-500" />
                                <span className="text-xs font-bold text-red-700 dark:text-red-300">
                                    Zor
                                </span>
                            </div>
                        </div>
                    </section>

                    <hr className="border-gray-100 dark:border-slate-700" />

                    {/* 5. Puanlama Tablosu */}
                    <section>
                        <h4 className="font-bold text-slate-800 dark:text-white text-lg mb-4 text-center">
                            Puanlama Tablosu
                        </h4>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                                <div className="text-green-500 font-black text-2xl">
                                    +1
                                </div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                                    Doğru
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                                <div className="text-red-500 font-black text-2xl">
                                    -1
                                </div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                                    Tabu / Hata
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                                <div className="text-amber-500 font-black text-2xl">
                                    0
                                </div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                                    Pas
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:opacity-90 transition-opacity"
                    >
                        Her Şey Anlaşıldı, Oyuna Dön
                    </button>
                </div>
            </div>
        </div>
    );
}
