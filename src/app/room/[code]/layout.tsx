import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Oyun Odası | Tabu Oyunu",
    description:
        "Online Tabu oyun odası. Takımlarınla birlikte yasaklı kelimelere dikkat ederek anlatmaya çalış!",
    openGraph: {
        title: "Tabu Oyunu — Online Sözcük Tahmin Oyunu",
        description:
            "Arkadaşlarınla online Tabu oyna! Modern arayüzüyle yeni nesil Tabu deneyimi.",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Tabu Oyunu — Online Sözcük Tahmin Oyunu",
        description:
            "Arkadaşlarınla online Tabu oyna! Yasaklı kelimelere dikkat ederek anlatmaya çalış.",
    },
};

export default function RoomLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
