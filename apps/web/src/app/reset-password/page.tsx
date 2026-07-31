import { Suspense } from "react";
import { ResetPasswordClient } from "./reset-password-client";

export default function ResetPasswordPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
                    Parola ekranı hazırlanıyor...
                </div>
            }
        >
            <ResetPasswordClient />
        </Suspense>
    );
}
