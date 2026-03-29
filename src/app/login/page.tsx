"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { useBranding } from "@/components/providers/branding-provider";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCaptchaTokenForAction } from "@/lib/security/captcha-client";
import { resolveSafeCallbackUrl } from "@/lib/security/safe-callback-url";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const branding = useBranding();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const callbackUrl =
            typeof window !== "undefined"
                ? resolveSafeCallbackUrl(
                      new URLSearchParams(window.location.search).get("callbackUrl"),
                      "/dashboard"
                  )
                : "/dashboard";

        try {
            const { token } = await getCaptchaTokenForAction("login");
            const res = await signIn("credentials", {
                username,
                password,
                portal: "user",
                captchaToken: token,
                captchaAction: "login",
                redirect: false,
            });

            if (res?.error) {
                setError("Giris basarisiz. Kullanici adi veya sifre hatali.");
            } else {
                router.push(callbackUrl);
                router.refresh();
            }
        } catch {
            setError("Bir hata olustu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-slate-900">
            <Card className="w-full max-w-sm shadow-xl">
                <CardHeader className="space-y-4">
                    <div className="flex flex-col items-center gap-3 text-center">
                        {branding.logoUrl ? (
                            <div className="flex w-full max-w-[260px] items-center justify-center rounded-2xl border border-border/70 bg-background/90 px-3 py-2">
                                <Image
                                    src={branding.logoUrl}
                                    alt={`${branding.siteName} logo`}
                                    width={260}
                                    height={78}
                                    className="h-14 w-auto max-w-full object-contain sm:h-16"
                                    unoptimized
                                />
                            </div>
                        ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <LogIn className="h-6 w-6" />
                            </div>
                        )}
                        <div className="space-y-1">
                            <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold">
                                <LogIn className="h-5 w-5 text-primary" />
                                Giris Yap
                            </CardTitle>
                            {!branding.logoUrl ? (
                                <CardDescription>Hesabina giris yap.</CardDescription>
                            ) : null}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <Input
                            type="text"
                            placeholder="Kullanici Adi"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                        <Input
                            type="password"
                            placeholder="Sifre"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        {error ? (
                            <div className="text-sm font-medium text-red-500">{error}</div>
                        ) : null}
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Giris yapiliyor..." : "Giris Yap"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-sm text-muted-foreground">
                        Hesabin yok mu?{" "}
                        <Link href="/register" className="text-primary hover:underline">
                            Kayit Ol
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
