"use client";

import { Clock } from "lucide-react";
import type { TransitionData } from "@/types/game";

interface TransitionScreenProps {
    transition: TransitionData;
}

export function TransitionScreen({ transition }: TransitionScreenProps) {
    return (
        <div className="flex flex-col items-center justify-center flex-1 gap-6 animate-in fade-in zoom-in-95">
            <div className="text-center space-y-3">
                <h2 className="text-2xl font-bold text-foreground">Sıradaki Tur</h2>
                <div className="space-y-1">
                    <p className="text-lg">
                        <span className="text-muted-foreground">Anlatıcı:</span>{" "}
                        <span className="font-semibold text-foreground">
                            {transition.anlatici.ad}
                        </span>
                        <span
                            className={`ml-2 text-xs px-2 py-0.5 rounded ${transition.anlatici.takim === "A"
                                    ? "bg-red-500/20 text-red-400"
                                    : "bg-blue-500/20 text-blue-400"
                                }`}
                        >
                            {transition.anlatici.takim === "A" ? "Takım A" : "Takım B"}
                        </span>
                    </p>
                    {transition.gozetmen && (
                        <p className="text-base text-muted-foreground">
                            Gözetmen: {transition.gozetmen.ad}
                        </p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2 text-4xl font-mono font-bold text-primary">
                <Clock className="h-8 w-8" />
                {transition.kalanSure}
            </div>
            <p className="text-sm text-muted-foreground">Tura hazırlanın...</p>
        </div>
    );
}
