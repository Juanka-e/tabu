import assert from "node:assert/strict";
import { validateAdminCategoryReorderUpdates } from "../src/lib/categories/admin-category-reorder";

const categories = [
    { id: 1, parentId: null },
    { id: 2, parentId: null },
    { id: 11, parentId: 1 },
];

assert.deepEqual(
    validateAdminCategoryReorderUpdates(
        [
            { id: 2, sortOrder: 10 },
            { id: 1, sortOrder: 0 },
        ],
        categories
    ),
    [
        { id: 1, sortOrder: 0 },
        { id: 2, sortOrder: 10 },
    ]
);

assert.throws(
    () =>
        validateAdminCategoryReorderUpdates(
            [
                { id: 1, sortOrder: 0 },
                { id: 1, sortOrder: 10 },
            ],
            categories
        ),
    /birden fazla/
);

assert.throws(
    () =>
        validateAdminCategoryReorderUpdates([{ id: 11, sortOrder: 0 }], categories),
    /Alt kategoriler/
);

assert.throws(
    () =>
        validateAdminCategoryReorderUpdates([{ id: 1, sortOrder: 0 }], categories),
    /tum ana kategorileri/
);

assert.throws(
    () =>
        validateAdminCategoryReorderUpdates(
            [
                { id: 1, sortOrder: 0 },
                { id: 999, sortOrder: 10 },
            ],
            categories
        ),
    /bulunamadi/
);

console.log("admin-category-reorder smoke test passed");
