import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { AuthProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { GlobalRuntimeBanner } from "@/components/system/global-runtime-banner";
import { getSystemSettings } from "@/lib/system-settings/service";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce") ?? undefined;
  const pathname = requestHeaders.get("x-pathname") ?? "/";
  const settings = await getSystemSettings();
  const isAdminPath = pathname.startsWith("/admin");
  const showMaintenanceBanner = settings.platform.maintenanceEnabled && !isAdminPath;
  const showMotdBanner =
    settings.platform.motdEnabled &&
    settings.platform.motdText.trim().length > 0 &&
    !isAdminPath;

  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <ThemeProvider nonce={nonce}>
            {showMaintenanceBanner ? (
              <GlobalRuntimeBanner
                tone="warning"
                message={settings.platform.maintenanceMessage}
              />
            ) : null}
            {showMotdBanner ? (
              <GlobalRuntimeBanner
                tone="info"
                message={settings.platform.motdText}
              />
            ) : null}
            {children}
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
