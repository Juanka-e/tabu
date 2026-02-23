import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap", // Prevent blocking if font fails to load
  fallback: ["system-ui", "-apple-system", "sans-serif"],
});

export const metadata: Metadata = {
  title: {
    default: "Tabu Oyunu — Online Sözcük Tahmin Oyunu",
    template: "%s | Tabu Oyunu",
  },
  description:
    "Arkadaşlarınla online Tabu oyna! Modern arayüzüyle yeni nesil Tabu deneyimi. Yasaklı kelimelere dikkat ederek anlatmaya çalış.",
  openGraph: {
    title: "Tabu Oyunu — Online Sözcük Tahmin Oyunu",
    description:
      "Arkadaşlarınla online Tabu oyna! Modern arayüzüyle yeni nesil Tabu deneyimi.",
    type: "website",
    locale: "tr_TR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tabu Oyunu — Online Sözcük Tahmin Oyunu",
    description:
      "Arkadaşlarınla online Tabu oyna! Yasaklı kelimelere dikkat ederek anlatmaya çalış.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head />
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider>
            {children}
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html >
  );
}
