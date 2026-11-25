import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  categorySelectionPatch,
  emptyProductForm,
  makePrimary,
  mergeSelection,
  normalizeFormTaxonomy,
  productFormFromProduct,
  taxonomyPayload,
  validateProductForm,
} from "./productForm";
import SelectedTaxonomyList from "./SelectedTaxonomyList";
import { referenceList } from "../../../utils/catalogRefs";
import type { CatalogProduct } from "../../../utils/productList";

const subcategories = [
  {
    id: "s-a1",
    category_id: "cat-a",
    title: "A1",
    description: null,
    keywords: "",
    photos: [],
  },
  {
    id: "s-b1",
    category_id: "cat-b",
    title: "B1",
    description: null,
    keywords: "",
    photos: [],
  },
  {
    id: "s-b2",
    category_id: "cat-b",
    title: "B2",
    description: null,
    keywords: "",
    photos: [],
  },
];

describe("product drawer: several categories and subcategories", () => {
  it("keeps the order the user built (the primary stays first)", () => {
    // LiquidMultiSelect reports values in option (alphabetical) order.
    expect(mergeSelection(["cat-b"], ["cat-a", "cat-b"])).toEqual([
      "cat-b",
      "cat-a",
    ]);
    expect(mergeSelection(["cat-b", "cat-a"], ["cat-a"])).toEqual(["cat-a"]);
    expect(mergeSelection([], ["cat-a", "cat-c"])).toEqual(["cat-a", "cat-c"]);
  });

  it("makes another entry the primary", () => {
    expect(makePrimary(["cat-a", "cat-b", "cat-c"], "cat-c")).toEqual([
      "cat-c",
      "cat-a",
      "cat-b",
    ]);
    expect(makePrimary(["cat-a"], "missing")).toEqual(["cat-a"]);
  });

  it("dropping a category removes its subcategories and updates the primaries", () => {
    const form = {
      ...emptyProductForm(),
      category_ids: ["cat-b", "cat-a"],
      category_id: "cat-b",
      subcategory_ids: ["s-b1", "s-a1", "s-b2"],
      subcategory_id: "s-b1",
    };
    expect(categorySelectionPatch(form, ["cat-a"], subcategories)).toEqual({
      category_ids: ["cat-a"],
      category_id: "cat-a",
      subcategory_ids: ["s-a1"],
      subcategory_id: "s-a1",
    });
    expect(categorySelectionPatch(form, [], subcategories)).toEqual({
      category_ids: [],
      category_id: "",
      subcategory_ids: [],
      subcategory_id: "",
    });
  });

  it("sends the lists plus the primary single fields", () => {
    const form = {
      ...emptyProductForm(),
      category_ids: ["cat-b", "cat-a"],
      subcategory_ids: ["s-b2"],
    };
    expect(taxonomyPayload(form)).toEqual({
      category: "cat-b",
      subCategory: "s-b2",
      category_id: "cat-b",
      subcategory_id: "s-b2",
      category_ids: ["cat-b", "cat-a"],
      subcategory_ids: ["s-b2"],
    });
    expect(taxonomyPayload(emptyProductForm())).toMatchObject({
      category: null,
      category_ids: [],
      subcategory_ids: [],
    });
  });

  it("drafts saved before this change (single ids only) still open", () => {
    const old = { category_id: "cat-a", subcategory_id: "s-a1" };
    expect(normalizeFormTaxonomy(old)).toMatchObject({
      category_ids: ["cat-a"],
      subcategory_ids: ["s-a1"],
    });
    const cleared = normalizeFormTaxonomy({
      category_ids: [],
      category_id: "",
    });
    expect(cleared.category_ids).toEqual([]);
  });

  it("loads every category of a product, primary first", () => {
    const refs = referenceList(
      [
        { _id: "cat-a", title: "A" },
        { _id: "cat-b", title: "B" },
      ],
      { _id: "cat-b", title: "B" },
    );
    expect(refs).toEqual({ ids: ["cat-b", "cat-a"], titles: ["B", "A"] });

    const product = {
      id: "p1",
      title: "Softener",
      category_id: "cat-b",
      subcategory_id: "s-b1",
      category_ids: ["cat-b", "cat-a"],
      subcategory_ids: ["s-b1", "s-a1"],
    } as unknown as CatalogProduct;
    const form = productFormFromProduct(product, subcategories);
    expect(form.category_ids).toEqual(["cat-b", "cat-a"]);
    expect(form.category_id).toBe("cat-b");
    expect(form.subcategory_ids).toEqual(["s-b1", "s-a1"]);

    // Older product with only a subcategory: its parent becomes the category.
    const legacy = productFormFromProduct(
      {
        id: "p2",
        title: "x",
        subcategory_id: "s-b2",
      } as unknown as CatalogProduct,
      subcategories,
    );
    expect(legacy.category_ids).toEqual(["cat-b"]);
    expect(legacy.subcategory_ids).toEqual(["s-b2"]);
  });

  it("asks for a category when only subcategories are chosen", () => {
    const form = {
      ...emptyProductForm(),
      title: "t",
      brand: "b",
      description: "<p>d</p>",
      photos: [{ id: "1", secure_url: "https://x/y.jpg" }],
      subcategory_ids: ["s-a1"],
    };
    expect(validateProductForm(form)).toContain(
      "Select a category for the chosen subcategory",
    );
  });

  it("lists the selection with the primary marked once two are chosen", () => {
    const render = (count: number) =>
      renderToStaticMarkup(
        createElement(SelectedTaxonomyList, {
          noun: "category",
          items: [
            { id: "a", label: "Water Softeners" },
            { id: "b", label: "Bathroom" },
          ].slice(0, count),
          onMakePrimary: () => undefined,
          onRemove: () => undefined,
        }),
      );
    expect(render(1)).toBe("");
    const html = render(2);
    expect(html).toContain("Primary");
    expect(html).toContain('aria-label="Make Bathroom the primary category"');
    expect(html).toContain('aria-label="Remove category Water Softeners"');
    expect(html.match(/Make primary/g)).toHaveLength(1);
  });
});
