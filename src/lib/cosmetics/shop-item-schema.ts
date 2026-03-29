import {
    CosmeticRenderMode as PrismaCosmeticRenderMode,
    ItemRarity as PrismaItemRarity,
    Prisma,
    ShopItemType as PrismaShopItemType,
} from "@prisma/client";
import { z } from "zod";
import {
    STORE_ITEM_RARITIES,
    STORE_ITEM_RENDER_MODES,
    STORE_ITEM_TYPES,
    type StoreItemRarity,
    type StoreItemRenderMode,
    type StoreItemType,
    type TemplateConfig,
    type TemplateConfigScalar,
    type TemplateConfigValue,
} from "@/types/economy";

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

const templateScalarSchema: z.ZodType<TemplateConfigScalar> = z.union([
    z.string().max(160),
    z.number().finite().refine((value) => Math.abs(value) <= 10_000, "Number is out of supported range."),
    z.boolean(),
    z.null(),
]);

const templateArraySchema = z.array(templateScalarSchema).max(12);

const templateConfigValueSchema: z.ZodType<TemplateConfigValue> = z.lazy(() =>
    z.union([
        templateScalarSchema,
        templateArraySchema,
        z.record(z.string().trim().min(1).max(80), templateConfigValueSchema),
    ])
);

function validateTemplateNode(
    value: TemplateConfigValue,
    context: z.RefinementCtx,
    path: Array<string | number>,
    depth: number
) {
    if (depth > 3) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path,
            message: "Template config nesting is limited to 3 levels.",
        });
        return;
    }

    if (Array.isArray(value)) {
        if (value.length > 12) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path,
                message: "Template config arrays support at most 12 entries.",
            });
        }
        return;
    }

    if (value && typeof value === "object") {
        const entries = Object.entries(value);
        if (entries.length > 24) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path,
                message: "Template config objects support at most 24 keys.",
            });
        }

        for (const [key, entryValue] of entries) {
            validateTemplateNode(entryValue, context, [...path, key], depth + 1);
        }
    }
}

const safeTemplateConfigSchema: z.ZodType<TemplateConfig> = z
    .record(z.string().trim().min(1).max(80), templateConfigValueSchema)
    .superRefine((value, context) => {
        validateTemplateNode(value, context, [], 0);
    });

const shopItemBaseSchema = z.object({
    code: z
        .string()
        .trim()
        .min(1)
        .max(80)
        .regex(/^[a-z0-9_-]+$/i, "Code can only contain letters, numbers, dash and underscore."),
    type: z.enum(STORE_ITEM_TYPES),
    name: z.string().trim().min(1).max(120),
    rarity: z.enum(STORE_ITEM_RARITIES).default("common"),
    renderMode: z.enum(STORE_ITEM_RENDER_MODES).default("image"),
    priceCoin: z.number().int().min(0).max(1_000_000),
    imageUrl: safeImageUrlSchema.default(""),
    templateKey: z.string().trim().max(80).optional().nullable(),
    templateConfig: safeTemplateConfigSchema.optional().nullable(),
    badgeText: z.string().trim().max(24).optional().nullable(),
    isFeatured: z.boolean().default(false),
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

const PRISMA_SHOP_ITEM_TYPE_MAP: Record<StoreItemType, PrismaShopItemType> = {
    avatar: PrismaShopItemType.avatar,
    frame: PrismaShopItemType.frame,
    card_back: PrismaShopItemType.card_back,
    card_face: PrismaShopItemType.card_face,
};

const PRISMA_ITEM_RARITY_MAP: Record<StoreItemRarity, PrismaItemRarity> = {
    common: PrismaItemRarity.common,
    rare: PrismaItemRarity.rare,
    epic: PrismaItemRarity.epic,
    legendary: PrismaItemRarity.legendary,
};

const PRISMA_RENDER_MODE_MAP: Record<StoreItemRenderMode, PrismaCosmeticRenderMode> = {
    image: PrismaCosmeticRenderMode.image,
    template: PrismaCosmeticRenderMode.template,
};

export function toPrismaShopItemType(value: StoreItemType): PrismaShopItemType {
    return PRISMA_SHOP_ITEM_TYPE_MAP[value];
}

export function toPrismaItemRarity(value: StoreItemRarity): PrismaItemRarity {
    return PRISMA_ITEM_RARITY_MAP[value];
}

export function toPrismaShopItemCreateData(input: ShopItemWriteInput): Prisma.ShopItemCreateInput {
    return {
        code: input.code,
        type: PRISMA_SHOP_ITEM_TYPE_MAP[input.type],
        name: input.name,
        rarity: PRISMA_ITEM_RARITY_MAP[input.rarity],
        renderMode: PRISMA_RENDER_MODE_MAP[input.renderMode],
        priceCoin: input.priceCoin,
        imageUrl: input.imageUrl,
        templateKey: input.templateKey ?? null,
        templateConfig: input.templateConfig ?? Prisma.JsonNull,
        badgeText: input.badgeText ?? null,
        isFeatured: input.isFeatured,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
    };
}

export function toPrismaShopItemUpdateData(input: ShopItemUpdateInput): Prisma.ShopItemUpdateInput {
    return {
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.type !== undefined ? { type: PRISMA_SHOP_ITEM_TYPE_MAP[input.type] } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.rarity !== undefined ? { rarity: PRISMA_ITEM_RARITY_MAP[input.rarity] } : {}),
        ...(input.renderMode !== undefined ? { renderMode: PRISMA_RENDER_MODE_MAP[input.renderMode] } : {}),
        ...(input.priceCoin !== undefined ? { priceCoin: input.priceCoin } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
        ...(input.templateKey !== undefined ? { templateKey: input.templateKey ?? null } : {}),
        ...(input.templateConfig !== undefined
            ? { templateConfig: input.templateConfig ?? Prisma.JsonNull }
            : {}),
        ...(input.badgeText !== undefined ? { badgeText: input.badgeText ?? null } : {}),
        ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    };
}
