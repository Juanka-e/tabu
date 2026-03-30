"use client";

import { useRef, useState } from "react";
import {
    AlertCircle,
    CheckCircle2,
    Download,
    FileText,
    Loader2,
    Upload,
    X,
} from "lucide-react";

interface UploadResult {
    success: number;
    skipped: number;
    errors: string[];
    skippedRows?: string[];
}

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
        formData.append("mode", "csv_categories");

        try {
            const res = await fetch("/api/admin/words/bulk-upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => null);
                setError(err?.error || "Yükleme başarısız.");
                return;
            }

            const data = (await res.json()) as UploadResult;
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
        <div className="max-w-3xl space-y-5">
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                    <Upload className="h-6 w-6 text-emerald-500" />
                    Toplu Kelime Yükleme
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Bu hızlı ekran CSV içinden kategori okuyan akış içindir. Ortak kategori atamak istiyorsan Kelime Yönetimi içindeki `Toplu Yükle` modalını kullan.
                </p>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-900/10">
                <h3 className="mb-2 text-sm font-bold text-blue-700 dark:text-blue-400">CSV Formatı</h3>
                <p className="mb-3 text-xs text-blue-600 dark:text-blue-300">
                    Her satırda: <code>kelime,zorluk,kategori,alt_kategori,yasaklı1,yasaklı2,yasaklı3,...</code>
                </p>
                <div className="rounded-xl border border-blue-100 bg-white p-3 font-mono text-xs text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300">
                    <div className="text-gray-400">kelime,zorluk,kategori,alt_kategori,yasaklı1,yasaklı2,yasaklı3</div>
                    <div>armut,1,Meyveler,,yeşil,ağaç,bahçe</div>
                    <div>levrek,2,Yiyecek,Deniz Ürünleri,balık,ızgara,kılçık</div>
                    <div>kuantum,3,Bilim,Fizik,atom,parçacık,enerji</div>
                </div>
                <p className="mt-2 text-[11px] text-blue-500">
                    `alt_kategori` zorunlu değildir. Yoksa boş bırak. Kategori ve alt kategori adları sistemde önceden oluşturulmuş olmalıdır.
                </p>
                <p className="mt-1 text-[11px] text-blue-500">
                    Zorluk: `1=Kolay`, `2=Orta`, `3=Zor`. İlk satır başlıksa otomatik atlanır.
                </p>
            </div>

            <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center transition-all hover:border-emerald-400 hover:bg-emerald-50/30 dark:border-slate-700 dark:hover:bg-emerald-900/10"
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
                        <FileText size={24} className="text-emerald-500" />
                        <div className="text-left">
                            <p className="text-sm font-bold text-slate-800 dark:text-white">{file.name}</p>
                            <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setFile(null);
                                setResult(null);
                            }}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <>
                        <Download size={40} className="mx-auto mb-3 text-gray-300" />
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                            CSV dosyasını buraya sürükleyin veya tıklayın
                        </p>
                        <p className="mt-1 text-xs text-gray-400">Sadece .csv dosyaları kabul edilir</p>
                    </>
                )}
            </div>

            <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-bold text-white shadow-md transition-colors active:scale-[0.99] hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
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

            {error ? (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
                    <AlertCircle size={18} />
                    {error}
                </div>
            ) : null}

            {result ? (
                <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
                        <CheckCircle2 size={18} className="text-emerald-500" />
                        Yükleme Tamamlandı
                    </h3>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-emerald-50 p-3 text-center dark:bg-emerald-900/20">
                            <p className="text-2xl font-black text-emerald-600">{result.success}</p>
                            <p className="text-xs font-medium text-emerald-500">Eklendi</p>
                        </div>
                        <div className="rounded-xl bg-amber-50 p-3 text-center dark:bg-amber-900/20">
                            <p className="text-2xl font-black text-amber-600">{result.skipped}</p>
                            <p className="text-xs font-medium text-amber-500">Atlandı</p>
                        </div>
                        <div className="rounded-xl bg-red-50 p-3 text-center dark:bg-red-900/20">
                            <p className="text-2xl font-black text-red-600">{result.errors.length}</p>
                            <p className="text-xs font-medium text-red-500">Hata</p>
                        </div>
                    </div>

                    {result.skippedRows && result.skippedRows.length > 0 ? (
                        <div className="max-h-32 overflow-y-auto rounded-xl border border-border bg-muted/20 p-3">
                            <p className="mb-1 text-xs font-semibold text-gray-500">Atlanan satırlar</p>
                            {result.skippedRows.map((item) => (
                                <p key={item} className="py-0.5 text-xs text-amber-600 dark:text-amber-300">• {item}</p>
                            ))}
                        </div>
                    ) : null}

                    {result.errors.length > 0 ? (
                        <div className="max-h-40 overflow-y-auto rounded-xl border border-border bg-muted/20 p-3">
                            <p className="mb-1 text-xs font-semibold text-gray-500">Hatalı satırlar</p>
                            {result.errors.map((err) => (
                                <p key={err} className="py-0.5 text-xs text-red-500">• {err}</p>
                            ))}
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
