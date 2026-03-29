interface ContentSecurityPolicyOptions {
    nonce: string;
    isDev: boolean;
}

const YOUTUBE_FRAME_SOURCES = [
    "https://www.youtube.com",
    "https://www.youtube-nocookie.com",
];

export function generateCspNonce(): string {
    return Buffer.from(crypto.randomUUID()).toString("base64");
}

export function buildContentSecurityPolicy({
    nonce,
    isDev,
}: ContentSecurityPolicyOptions): string {
    const directives: Array<[string, string[]]> = [
        ["default-src", ["'self'"]],
        [
            "script-src",
            [
                "'self'",
                `'nonce-${nonce}'`,
                "'strict-dynamic'",
                ...(isDev ? ["'unsafe-eval'"] : []),
            ],
        ],
        ["script-src-attr", ["'none'"]],
        ["style-src", ["'self'", "'unsafe-inline'"]],
        ["style-src-attr", ["'unsafe-inline'"]],
        ["img-src", ["'self'", "data:", "blob:", "https:"]],
        ["font-src", ["'self'", "data:"]],
        ["connect-src", ["'self'", "ws:", "wss:"]],
        ["frame-src", ["'self'", ...YOUTUBE_FRAME_SOURCES]],
        ["media-src", ["'self'", "blob:", "https:"]],
        ["object-src", ["'none'"]],
        ["base-uri", ["'self'"]],
        ["form-action", ["'self'"]],
        ["frame-ancestors", ["'none'"]],
    ];

    if (!isDev) {
        directives.push(["upgrade-insecure-requests", []]);
    }

    return directives
        .map(([directive, values]) =>
            values.length > 0 ? `${directive} ${values.join(" ")}` : directive
        )
        .join("; ");
}
