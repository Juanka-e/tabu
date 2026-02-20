// Shared room metrics store — separated from game-socket.ts to avoid
// pulling socket.io into the Next.js page bundle at build time.

export interface RoomMetrics {
    aktifLobiSayisi: number;
    onlineKullaniciSayisi: number;
}

let metricsGetter: (() => RoomMetrics) | null = null;

/**
 * Register the metrics provider (called by game-socket.ts at startup).
 */
export function registerMetricsProvider(getter: () => RoomMetrics): void {
    metricsGetter = getter;
}

/**
 * Get current room metrics (safe to call even if socket not initialized).
 */
export function getRoomMetrics(): RoomMetrics {
    if (metricsGetter) {
        return metricsGetter();
    }
    return { aktifLobiSayisi: 0, onlineKullaniciSayisi: 0 };
}
