import { Suspense } from "react";
import { VerifyEmailClient } from "./verify-email-client";

export default function VerifyEmailPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm font-semibold text-slate-300">
                    Doğrulama hazırlanıyor...
                </div>
            }
        >
            <VerifyEmailClient />
        </Suspense>
    );
}
