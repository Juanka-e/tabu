import { CosmeticRenderMode, ItemRarity, Prisma, ShopItemType } from "@prisma/client";
import { z } from "zod";

const safeImageUrlSchema = z
    .string()
    .trim()
    .max(2000)
    .refine(
        (value) =>
            value.length === 0 ||
            value.startsWith("/") ||
            value.startsWith("http://") ||
            value.startsWith("https://"),
        "Image URL must be relative or http(s)."
    );

const templatePrimitiveSchema = z.union([z.string().max(120), z.number(), z.boolean()]);
const safeTemplateConfigSchema = z.record(z.string().max(80), templatePrimitiveSchema);

const shopItemBaseSchema = z.object({
    code: z
        .string()
        .trim()
        .min(1)
        .max(80)
        .regex(/^[a-z0-9_-]+$/i, "Code can only contain letters, numbers, dash and underscore."),
    type: z.nativeEnum(ShopItemType),
    name: z.string().trim().min(1).max(120),
    rarity: z.nativeEnum(ItemRarity).default("common"),
    renderMode: z.nativeEnum(CosmeticRenderMode).default("image"),
    priceCoin: z.number().int().min(0).max(1_000_000),
    imageUrl: safeImageUrlSchema.default(""),
    templateKey: z.string().trim().max(80).optional().nullable(),
    templateConfig: safeTemplateConfigSchema.optional().nullable(),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().min(0).max(10_000).default(0),
});

const shopItemUpdateBaseSchema = shopItemBaseSchema.partial().extend({
    imageUrl: safeImageUrlSchema.optional(),
    templateKey: z.string().trim().max(80).optional().nullable(),
});

function applyCreateRefinements(value: ShopItemWriteInput, context: z.RefinementCtx) {
    if (value.renderMode === "image" && value.imageUrl.length === 0) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["imageUrl"],
            message: "Image items require an image URL.",
        });
    }

    if (value.renderMode === "template" && (!value.templateKey || value.templateKey.length === 0)) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["templateKey"],
            message: "Template items require a template key.",
        });
    }

    if (value.type === "avatar" && value.renderMode !== "image") {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["renderMode"],
            message: "Avatar items currently support image render mode only.",
        });
    }
}

function applyUpdateRefinements(value: ShopItemUpdateInput, context: z.RefinementCtx) {
    if (value.renderMode === "image" && value.imageUrl !== undefined && value.imageUrl.length === 0) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["imageUrl"],
            message: "Image items require an image URL.",
        });
    }

    if (value.renderMode === "template" && (!value.templateKey || value.templateKey.length === 0)) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["templateKey"],
            message: "Template items require a template key.",
        });
    }

    if (value.type === "avatar" && value.renderMode !== undefined && value.renderMode !== "image") {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["renderMode"],
            message: "Avatar items currently support image render mode only.",
        });
    }
}

export const shopItemWriteSchema = shopItemBaseSchema.superRefine((value, context) => {
    applyCreateRefinements(value, context);
});

export const shopItemUpdateSchema = shopItemUpdateBaseSchema.superRefine((value, context) => {
    applyUpdateRefinements(value, context);
});

export type ShopItemWriteInput = z.infer<typeof shopItemWriteSchema>;
export type ShopItemUpdateInput = z.infer<typeof shopItemUpdateSchema>;

export function toPrismaShopItemCreateData(input: ShopItemWriteInput): Prisma.ShopItemCreateInput {
    return {
        ...input,
        templateKey: input.templateKey ?? null,
        templateConfig: input.templateConfig ?? Prisma.JsonNull,
    };
}

export function toPrismaShopItemUpdateData(input: ShopItemUpdateInput): Prisma.ShopItemUpdateInput {
    return {
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.rarity !== undefined ? { rarity: input.rarity } : {}),
        ...(input.renderMode !== undefined ? { renderMode: input.renderMode } : {}),
        ...(input.priceCoin !== undefined ? { priceCoin: input.priceCoin } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
        ...(input.templateKey !== undefined ? { templateKey: input.templateKey ?? null } : {}),
        ...(input.templateConfig !== undefined
            ? { templateConfig: input.templateConfig ?? Prisma.JsonNull }
            : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    };
}
