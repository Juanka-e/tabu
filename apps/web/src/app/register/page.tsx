"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
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

export default function RegisterPage() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const branding = useBranding();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const { token } = await getCaptchaTokenForAction("register");
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    captchaToken: token,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Kayit basarisiz.");
            } else {
                toast.success("Kayit basarili! Giris yapabilirsiniz.");
                router.push("/login");
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
                                <UserPlus className="h-6 w-6" />
                            </div>
                        )}
                        <div className="space-y-1">
                            <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold">
                                <UserPlus className="h-5 w-5 text-primary" />
                                Kayit Ol
                            </CardTitle>
                            {!branding.logoUrl ? (
                                <CardDescription>Yeni hesabini olustur.</CardDescription>
                            ) : null}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                        <Input
                            type="text"
                            placeholder="Kullanici Adi"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            minLength={3}
                        />
                        <Input
                            type="email"
                            placeholder="E-posta"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            maxLength={191}
                            autoComplete="email"
                        />
                        <Input
                            type="password"
                            placeholder="Sifre"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                        {error ? (
                            <div className="text-sm font-medium text-red-500">{error}</div>
                        ) : null}
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Kayit olusturuluyor..." : "Kayit Ol"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-sm text-muted-foreground">
                        Zaten hesabin var mi?{" "}
                        <Link href="/login" className="text-primary hover:underline">
                            Giris Yap
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
