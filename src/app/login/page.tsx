"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { LogIn, User } from "lucide-react";
import Link from "next/link";

function LoginForm() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [guestName, setGuestName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [guestLoading, setGuestLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await signIn("credentials", {
                username,
                password,
                redirect: false,
            });

            if (res?.error) {
                setError("Giriş başarısız. Kullanıcı adı veya şifre hatalı.");
            } else {
                if (callbackUrl) {
                    router.push(callbackUrl);
                } else {
                    router.push("/");
                }
                router.refresh();
            }
        } catch {
            setError("Bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const handleGuestLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setGuestLoading(true);
        setError("");

        try {
            const res = await signIn("guest-login", {
                guestName,
                redirect: false,
            });

            if (res?.error) {
                setError("Misafir girişi yapılamadı.");
            } else {
                if (callbackUrl) {
                    router.push(callbackUrl);
                } else {
                    router.push("/");
                }
                router.refresh();
            }
        } catch {
            setError("Bir hata oluştu.");
        } finally {
            setGuestLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-sm shadow-xl">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    <LogIn className="w-6 h-6 text-primary" />
                    Giriş Yap
                </CardTitle>
                <CardDescription>
                    Tabu hesabınıza giriş yapın
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            type="text"
                            placeholder="Kullanıcı Adı"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Input
                            type="password"
                            placeholder="Şifre"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && (
                        <div className="text-sm text-red-500 font-medium">
                            {error}
                        </div>
                    )}
                    <Button type="submit" className="w-full" disabled={loading || guestLoading}>
                        {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                    </Button>
                </form>

                <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Veya</span>
                    </div>
                </div>

                <form onSubmit={handleGuestLogin} className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            type="text"
                            placeholder="Misafir Adı (İsteğe Bağlı)"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                        />
                    </div>
                    <Button
                        variant="outline"
                        type="submit"
                        className="w-full flex items-center gap-2"
                        disabled={loading || guestLoading}
                    >
                        <User className="w-4 h-4" />
                        {guestLoading ? "Misafir oturumu açılıyor..." : "Misafir Olarak Devam Et"}
                    </Button>
                </form>

            </CardContent>
            <CardFooter className="flex justify-center">
                <p className="text-sm text-muted-foreground">
                    Hesabın yok mu? <Link href="/register" className="text-primary hover:underline">Kayıt Ol</Link>
                </p>
            </CardFooter>
        </Card>
    );
}

export default function LoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
            <Suspense fallback={
                <Card className="w-full max-w-sm shadow-xl">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold flex items-center gap-2">
                            <LogIn className="w-6 h-6 text-primary" />
                            Giriş Yap
                        </CardTitle>
                        <CardDescription>Yükleniyor...</CardDescription>
                    </CardHeader>
                </Card>
            }>
                <LoginForm />
            </Suspense>
        </div>
    );
}
