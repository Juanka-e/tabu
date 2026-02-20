"use client";

import { useState } from "react";

interface UsernamePromptProps {
    onConfirm: (username: string) => void;
}

export function UsernamePrompt({ onConfirm }: UsernamePromptProps) {
    const [value, setValue] = useState("");

    const handleConfirm = () => {
        const trimmed = value.trim();
        if (trimmed.length >= 2) {
            onConfirm(trimmed);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in zoom-in-95">
                <h2 className="text-2xl font-bold text-center mb-2 text-slate-800 dark:text-white">
                    Hoş Geldiniz! 👋
                </h2>
                <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                    Oyuna katılmak için bir kullanıcı adı girin
                </p>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value.slice(0, 20))}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && value.trim().length >= 2) {
                            handleConfirm();
                        }
                    }}
                    placeholder="Kullanıcı adınız..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:border-blue-500 focus:outline-none transition-colors mb-4"
                    autoFocus
                    maxLength={20}
                />
                <button
                    onClick={handleConfirm}
                    disabled={value.trim().length < 2}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.99]"
                >
                    Oyuna Katıl
                </button>
                <p className="text-xs text-center text-gray-400 mt-3">En az 2 karakter giriniz</p>
            </div>
        </div>
    );
}
