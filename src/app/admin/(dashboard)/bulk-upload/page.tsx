"use client";

import { useState, useRef } from "react";
import {
    Upload,
    FileText,
    CheckCircle2,
    AlertCircle,
    Loader2,
    X,
    Download,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────── */

interface UploadResult {
    success: number;
    skipped: number;
    errors: string[];
}

/* ─── Page ───────────────────────────────────────────────────── */

export default function AdminBulkUploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<UploadResult | null>(null);
    const [error, setError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            setResult(null);
            setError("");
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setResult(null);
        setError("");

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/admin/words/bulk-upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                setError(err.error || "Yükleme başarısız.");
                return;
            }

            const data = await res.json();
            setResult(data);
        } catch {
            setError("Ağ hatası.");
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile && droppedFile.name.endsWith(".csv")) {
            setFile(droppedFile);
            setResult(null);
            setError("");
        }
    };

    return (
        <div className="space-y-5 max-w-2xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Upload className="h-6 w-6 text-emerald-500" />
                    Toplu Kelime Yükleme
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    CSV dosyasından toplu kelime ekleyin
                </p>
            </div>

            {/* CSV Format Info */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-blue-700 dark:text-blue-400 mb-2">
                    CSV Formatı
                </h3>
                <p className="text-xs text-blue-600 dark:text-blue-300 mb-3">
                    Her satırda: <code>kelime,zorluk,yasaklı1,yasaklı2,yasaklı3,...</code>
                </p>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-3 font-mono text-xs text-gray-600 dark:text-gray-300 border border-blue-100 dark:border-slate-700">
                    <div className="text-gray-400">
                        kelime,zorluk,yasak1,yasak2,yasak3,yasak4,yasak5
                    </div>
                    <div>armut,1,meyve,yeşil,ağaç,bahçe,dal</div>
                    <div>bilgisayar,2,ekran,klavye,mouse,teknoloji,yazılım</div>
                    <div>kuantum,3,fizik,atom,parçacık,dalga,enerji</div>
                </div>
                <p className="text-[10px] text-blue-500 mt-2">
                    Zorluk: 1=Kolay, 2=Orta, 3=Zor — İlk satır başlık ise otomatik atlanır
                </p>
            </div>

            {/* Drop Zone */}
            <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-10 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-all"
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                />
                {file ? (
                    <div className="flex items-center justify-center gap-3">
                        <FileText
                            size={24}
                            className="text-emerald-500"
                        />
                        <div className="text-left">
                            <p className="text-sm font-bold text-slate-800 dark:text-white">
                                {file.name}
                            </p>
                            <p className="text-xs text-gray-400">
                                {(file.size / 1024).toFixed(1)} KB
                            </p>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setFile(null);
                                setResult(null);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <>
                        <Download
                            size={40}
                            className="mx-auto mb-3 text-gray-300"
                        />
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                            CSV dosyasını buraya sürükleyin veya tıklayın
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Sadece .csv dosyaları kabul edilir
                        </p>
                    </>
                )}
            </div>

            {/* Upload Button */}
            <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-md transition-colors active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {uploading ? (
                    <>
                        <Loader2 size={18} className="animate-spin" />
                        Yükleniyor...
                    </>
                ) : (
                    <>
                        <Upload size={18} />
                        Yükle
                    </>
                )}
            </button>

            {/* Error */}
            {error && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 space-y-3">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-500" />
                        Yükleme Tamamlandı
                    </h3>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
                            <p className="text-2xl font-black text-emerald-600">
                                {result.success}
                            </p>
                            <p className="text-xs text-emerald-500 font-medium">
                                Eklendi
                            </p>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center">
                            <p className="text-2xl font-black text-amber-600">
                                {result.skipped}
                            </p>
                            <p className="text-xs text-amber-500 font-medium">
                                Atlandı (Mevcut)
                            </p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
                            <p className="text-2xl font-black text-red-600">
                                {result.errors.length}
                            </p>
                            <p className="text-xs text-red-500 font-medium">
                                Hata
                            </p>
                        </div>
                    </div>

                    {result.errors.length > 0 && (
                        <div className="mt-3 max-h-40 overflow-y-auto">
                            <p className="text-xs font-semibold text-gray-500 mb-1">
                                Hatalar:
                            </p>
                            {result.errors.map((err, i) => (
                                <p
                                    key={i}
                                    className="text-xs text-red-500 py-0.5"
                                >
                                    • {err}
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
