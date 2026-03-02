"use client";

import { useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { LogIn } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    const callbackUrl = useMemo(
        () => searchParams.get("callbackUrl") || "/dashboard",
        [searchParams]
    );

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await signIn("credentials", {
                username,
                password,
                portal: "user",
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
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
            <Card className="w-full max-w-sm shadow-xl">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                        <LogIn className="w-6 h-6 text-primary" />
                        Giris Yap
                    </CardTitle>
                    <CardDescription>Hesabinla giris yapip profil ve magazayi ac.</CardDescription>
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
                        {error && <div className="text-sm text-red-500 font-medium">{error}</div>}
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
