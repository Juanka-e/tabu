"use client";

import { useState } from "react";

interface UsernamePromptProps {
    onConfirm: (username: string) => void;
}

const WELCOME_LABEL = "Hoş Geldiniz";
const DESCRIPTION_LABEL = "Oyuna katılmak için bir kullanıcı adı girin";
const PLACEHOLDER_LABEL = "Kullanıcı adınız...";
const SUBMIT_LABEL = "Oyuna Katıl";
const MIN_LENGTH_LABEL = "En az 2 karakter giriniz";

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
            <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl animate-in zoom-in-95 dark:bg-slate-800">
                <h2 className="mb-2 text-center text-2xl font-bold text-slate-800 dark:text-white">
                    {WELCOME_LABEL}
                </h2>
                <p className="mb-6 text-center text-gray-600 dark:text-gray-400">
                    {DESCRIPTION_LABEL}
                </p>
                <input
                    type="text"
                    value={value}
                    onChange={(event) => setValue(event.target.value.slice(0, 20))}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" && value.trim().length >= 2) {
                            handleConfirm();
                        }
                    }}
                    placeholder={PLACEHOLDER_LABEL}
                    className="mb-4 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-slate-800 transition-colors focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    autoFocus
                    maxLength={20}
                />
                <button
                    onClick={handleConfirm}
                    disabled={value.trim().length < 2}
                    className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white shadow-lg transition-all active:scale-[0.99] hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                    {SUBMIT_LABEL}
                </button>
                <p className="mt-3 text-center text-xs text-gray-400">{MIN_LENGTH_LABEL}</p>
            </div>
        </div>
    );
}
