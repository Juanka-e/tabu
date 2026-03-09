import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { requireAdminSession } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

export async function POST(request: NextRequest) {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const category = (formData.get("category") as string) || "general";

        if (!file) {
            return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 400 });
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: "Geçersiz dosya türü. PNG, JPEG, WebP veya GIF olmalı." },
                { status: 400 }
            );
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { error: "Dosya boyutu 2MB'ı aşamaz." },
                { status: 400 }
            );
        }

        const normalizedCategory = category.replace(/[^a-z0-9-_]/gi, "").slice(0, 40) || "general";
        const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
        const fileName = `${randomUUID()}.${ext}`;
        const uploadDir = path.join(process.cwd(), "public", "cosmetics", normalizedCategory);

        await mkdir(uploadDir, { recursive: true });

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filePath = path.join(uploadDir, fileName);

        await writeFile(filePath, buffer);

        const publicUrl = `/cosmetics/${normalizedCategory}/${fileName}`;

        return NextResponse.json({ url: publicUrl, fileName });
    } catch (error) {
        console.error("Failed to upload file:", error);
        return NextResponse.json(
            { error: "Dosya yüklenemedi." },
            { status: 500 }
        );
    }
}
