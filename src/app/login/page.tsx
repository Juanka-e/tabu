"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogIn } from "lucide-react";
import Link from "next/link";

function LoginForm() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [guestName, setGuestName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

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

    const handleGuest = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await signIn("guest-login", {
                guestName: guestName.trim() || undefined,
                redirect: false,
            });

            if (res?.error) {
                setError("Oturum açılamadı. Lütfen tekrar deneyin.");
            } else {
                if (callbackUrl) {
                    router.push(callbackUrl);
                } else {
                    router.push("/");
                }
                router.refresh();
            }
        } catch {
            setError("Sunucuya bağlanılamadı.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-sm shadow-xl">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    <LogIn className="w-6 h-6 text-primary" />
                    Oyuna Katıl
                </CardTitle>
                <CardDescription>
                    Davet bağlantısıyla oynamak için misafir girişi yapın.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="guest" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="guest">Misafir</TabsTrigger>
                        <TabsTrigger value="login">Kullanıcı</TabsTrigger>
                    </TabsList>

                    <TabsContent value="guest">
                        <form onSubmit={handleGuest} className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    type="text"
                                    placeholder="Odada görünecek adınız"
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    maxLength={30}
                                    required
                                />
                            </div>
                            {error && (
                                <div className="text-sm text-red-500 font-medium">
                                    {error}
                                </div>
                            )}
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "Bağlanıyor..." : "Misafir Olarak Katıl"}
                            </Button>
                        </form>
                    </TabsContent>

                    <TabsContent value="login">
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
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                            </Button>
                        </form>
                    </TabsContent>
                </Tabs>
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
                            Yükleniyor...
                        </CardTitle>
                        <CardDescription>Oturum açma ekranı yükleniyor.</CardDescription>
                    </CardHeader>
                </Card>
            }>
                <LoginForm />
            </Suspense>
        </div>
    );
}
