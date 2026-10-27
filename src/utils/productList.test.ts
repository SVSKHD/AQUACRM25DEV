import { describe, expect, it } from "vitest";
import { UNCATEGORIZED } from "./catalogRefs";
import {
  discountPercent,
  effectivePrice,
  filterAndSortProducts,
  filterAndSortTaxonomy,
  productCounts,
  productsPerTaxonomy,
  stockState,
  type CatalogProduct,
  type CatalogTaxonomy,
  type ProductFilters,
} from "./productList";

const product = (overrides: Partial<CatalogProduct>): CatalogProduct => ({
  id: "x",
  title: "",
  description: null,
  price: 0,
  discountPrice: 0,
  dpPrice: 0,
  discountPriceStatus: false,
  discountPricePercentage: 0,
  photos: [],
  category: "",
  stock: 0,
  brand: "",
  ratings: 0,
  numberOfReviews: 0,
  slug: "",
  keywords: "",
  sku: null,
  is_active: true,
  category_id: null,
  subcategory_id: null,
  ...overrides,
});

const products = [
  product({
    id: "1",
    title: "Kent softener",
    brand: "Kent",
    price: 20000,
    discountPrice: 15000,
    discountPriceStatus: true,
    stock: 12,
    category_id: "c1",
    subcategory_id: "s1",
  }),
  product({
    id: "2",
    title: "Aqua RO",
    brand: "Aquakart",
    price: 9000,
    discountPrice: 0,
    stock: 3,
    category_id: "c2",
    sku: "RO-9",
  }),
  product({
    id: "3",
    title: "Filter cartridge",
    price: 500,
    discountPrice: 450,
    discountPriceStatus: false,
    stock: 0,
    is_active: false,
  }),
];

const base: ProductFilters = {
  query: "",
  active: "all",
  stock: "all",
  excludedCategories: [],
  sort: "title-asc",
};
const ids = (list: { id: string }[]) => list.map((item) => item.id);

describe("productList", () => {
  it("classifies stock", () => {
    expect([stockState(0), stockState(5), stockState(6)]).toEqual([
      "out",
      "low",
      "in",
    ]);
  });

  it("uses the discount price only when the discount is on", () => {
    expect(effectivePrice(products[0])).toBe(15000);
    expect(effectivePrice(products[1])).toBe(9000);
    expect(effectivePrice(products[2])).toBe(500);
    expect(discountPercent(products[0])).toBe(25);
    expect(discountPercent(products[2])).toBe(0);
  });

  it("counts active, inactive, low and out of stock", () => {
    expect(productCounts(products)).toEqual({
      total: 3,
      active: 2,
      inactive: 1,
      low: 1,
      out: 1,
    });
  });

  it("filters by status, stock, category and search terms", () => {
    expect(
      ids(filterAndSortProducts(products, { ...base, active: "inactive" })),
    ).toEqual(["3"]);
    expect(
      ids(filterAndSortProducts(products, { ...base, stock: "low" })),
    ).toEqual(["2"]);
    expect(
      ids(
        filterAndSortProducts(products, {
          ...base,
          excludedCategories: ["c1", UNCATEGORIZED],
        }),
      ),
    ).toEqual(["2"]);
    expect(
      ids(filterAndSortProducts(products, { ...base, query: "ro-9" })),
    ).toEqual(["2"]);
    expect(
      ids(filterAndSortProducts(products, { ...base, query: "kent soft" })),
    ).toEqual(["1"]);
  });

  it("sorts by price and stock using the effective price", () => {
    expect(
      ids(filterAndSortProducts(products, { ...base, sort: "price-asc" })),
    ).toEqual(["3", "2", "1"]);
    expect(
      ids(filterAndSortProducts(products, { ...base, sort: "stock-desc" })),
    ).toEqual(["1", "2", "3"]);
  });

  it("counts products per category and subcategory", () => {
    const { byCategory, bySubcategory } = productsPerTaxonomy(products);
    expect(byCategory.get("c1")).toBe(1);
    expect(bySubcategory.get("s1")).toBe(1);
    expect(byCategory.has("c3")).toBe(false);
  });

  it("filters and sorts taxonomy", () => {
    const items: CatalogTaxonomy[] = [
      {
        id: "s1",
        title: "Softeners",
        description: null,
        keywords: "hard water",
        photos: [],
        category_id: "c1",
      },
      {
        id: "s2",
        title: "Alkaline",
        description: null,
        keywords: "",
        photos: [],
        category_id: "c2",
      },
    ];
    const count = (item: CatalogTaxonomy) => (item.id === "s2" ? 4 : 1);
    expect(
      ids(
        filterAndSortTaxonomy(items, { query: "", sort: "title-asc" }, count),
      ),
    ).toEqual(["s2", "s1"]);
    expect(
      ids(
        filterAndSortTaxonomy(
          items,
          { query: "hard", sort: "title-asc" },
          count,
        ),
      ),
    ).toEqual(["s1"]);
    expect(
      ids(
        filterAndSortTaxonomy(
          items,
          { query: "", sort: "products-desc" },
          count,
        ),
      ),
    ).toEqual(["s2", "s1"]);
    expect(
      ids(
        filterAndSortTaxonomy(
          items,
          { query: "", sort: "title-asc", excludedParents: ["c2"] },
          count,
        ),
      ),
    ).toEqual(["s1"]);
  });
});
