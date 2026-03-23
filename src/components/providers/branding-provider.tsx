"use client";

import { createContext, useContext } from "react";
import type { BrandingSettings } from "@/types/system-settings";

const BrandingContext = createContext<BrandingSettings | null>(null);

export function BrandingProvider({
    branding,
    children,
}: {
    branding: BrandingSettings;
    children: React.ReactNode;
}) {
    return (
        <BrandingContext.Provider value={branding}>
            {children}
        </BrandingContext.Provider>
    );
}

export function useBranding() {
    const context = useContext(BrandingContext);
    if (!context) {
        throw new Error("useBranding must be used within a BrandingProvider");
    }

    return context;
}
