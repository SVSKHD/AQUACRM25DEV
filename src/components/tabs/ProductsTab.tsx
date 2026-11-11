import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearFormDraft,
  listFormDrafts,
  usePersistentFormDraft,
  type FormDraftRecord,
} from "../../hooks/usePersistentFormDraft";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  productsService,
  categoriesService,
  subcategoriesService,
} from "../../services/apiService";
import {
  savedCategory,
  type CategorySaveResult,
} from "../../services/categoryPhotos";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../Toast";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
import {
  Plus,
  Package,
  Layers,
  Grid3x3,
  FilePenLine,
  Clock3,
  FilterX,
  RefreshCw,
  AlertCircle,
  XCircle,
} from "lucide-react";
import ProductCard, {
  CatalogCardSkeleton,
} from "../modular/products/productCard";
import TaxonomyCard from "../modular/products/TaxonomyCard";
import ProductFormPanel from "../modular/products/ProductFormPanel";
import TaxonomyFormPanel from "../modular/products/TaxonomyFormPanel";
import CatalogDeleteDialog from "../modular/products/CatalogDeleteDialog";
import CatalogEmptyState from "../modular/products/CatalogEmptyState";
import CatalogSearchField from "../modular/products/CatalogSearchField";
import {
  emptyProductForm,
  productFormFromProduct,
  validateProductForm,
  type ProductForm,
} from "../modular/products/productForm";
import TabInnerContent from "../Layout/tabInnerlayout";
import { extractArrayPayload } from "../../utils/apiPayload";
import {
  UNCATEGORIZED,
  referenceId,
  referenceTitle,
} from "../../utils/catalogRefs";
import {
  filterAndSortProducts,
  filterAndSortTaxonomy,
  productCategoryKey,
  productCounts,
  productsPerTaxonomy,
  type ActiveFilter,
  type CatalogPhoto,
  type CatalogProduct,
  type CatalogTaxonomy,
  type ProductSort,
  type StockFilter,
  type TaxonomySort,
} from "../../utils/productList";
import ProductInnerBlog from "../modular/products/tabInnerContent/ProductInnerBlog";
import {
  LiquidBadge,
  LiquidButton,
  LiquidDropdown,
  LiquidIconButton,
  LiquidMultiSelect,
} from "../ui/liquid";

type Product = CatalogProduct;
type Category = CatalogTaxonomy;
type Subcategory = CatalogTaxonomy & { category_id: string };
type ApiResult = { data?: unknown; error?: string; errors?: unknown };
type RawRecord = Record<string, unknown>;

const emptyCategoryForm = () => ({
  title: "",
  description: "",
  keywords: "",
  photos: [] as CatalogPhoto[],
});

const emptySubcategoryForm = () => ({
  category_id: "",
  title: "",
  description: "",
  keywords: "",
  photos: [] as CatalogPhoto[],
});

const formApiError = (response: ApiResult | undefined, fallback: string) => {
  const details = Array.isArray(response?.errors)
    ? response.errors
        .map((item: { field?: string; message?: string }) =>
          [item?.field, item?.message].filter(Boolean).join(": "),
        )
        .filter(Boolean)
    : [];

  return [response?.error || fallback, ...details]
    .filter((item, index, items) => item && items.indexOf(item) === index)
    .join(" • ");
};

const normalizePhotos = (photos: unknown): CatalogPhoto[] =>
  Array.isArray(photos)
    ? photos.map((photo) =>
        typeof photo === "string"
          ? { id: Math.random().toString(), secure_url: photo }
          : (photo as CatalogPhoto),
      )
    : [];

const toCategory = (cat: RawRecord): Category => ({
  ...(cat as unknown as Category),
  id: String(cat._id || cat.id || ""),
  title: String(cat.title || cat.name || ""),
  photos: normalizePhotos(cat.photos),
  keywords: String(cat.keywords || ""),
});

const ACTIVE_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const STOCK_OPTIONS = [
  { value: "all", label: "Any stock" },
  { value: "in", label: "In stock" },
  { value: "low", label: "Low stock (≤5)" },
  { value: "out", label: "Out of stock" },
];

const PRODUCT_SORT_OPTIONS = [
  { value: "title-asc", label: "Name A–Z" },
  { value: "title-desc", label: "Name Z–A" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "stock-asc", label: "Stock: low to high" },
  { value: "stock-desc", label: "Stock: high to low" },
];

const TAXONOMY_SORT_OPTIONS = [
  { value: "title-asc", label: "Name A–Z" },
  { value: "title-desc", label: "Name Z–A" },
  { value: "products-desc", label: "Most products" },
];

type PendingConfirm = {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  loadingLabel?: string;
  action: () => Promise<void>;
};

export type ProductViewMode =
  "products" | "categories" | "subcategories" | "blogs";

type ProductsTabProps = {
  viewMode: ProductViewMode;
};

const ResultLine = ({
  shown,
  total,
  noun,
  filtersActive,
  onClear,
}: {
  shown: number;
  total: number;
  noun: string;
  filtersActive: boolean;
  onClear: () => void;
}) => (
  <div className="mb-4 flex min-h-[2.75rem] flex-wrap items-center justify-between gap-2">
    <p
      className="text-sm font-semibold text-neutral-500 dark:text-white/55"
      aria-live="polite"
    >
      Showing {shown} of {total} {noun}
      {total === 1 ? "" : "s"}
    </p>
    {filtersActive && (
      <LiquidButton type="button" variant="ghost" onClick={onClear}>
        <FilterX className="h-4 w-4" aria-hidden="true" />
        Clear filters
      </LiquidButton>
    )}
  </div>
);

export default function ProductsTab({ viewMode }: ProductsTabProps) {
  const { showToast } = useToast();
  const reduceMotion = useReducedMotion();
  const [products, setProducts] = useState<Product[]>([]);
  const [productSection, setProductSection] = useState<
    "products" | "drafts" | "categories" | "subcategories"
  >("products");
  const [productDrafts, setProductDrafts] = useState<
    FormDraftRecord<ProductForm>[]
  >([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] =
    useState<Subcategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(
    null,
  );
  const [confirmBusy, setConfirmBusy] = useState(false);
  const { user } = useAuth();

  const [productForm, setProductForm] = useState(emptyProductForm);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [subcategoryForm, setSubcategoryForm] = useState(emptySubcategoryForm);

  const [productQuery, setProductQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [excludedProductCategories, setExcludedProductCategories] = useState<
    string[]
  >([]);
  const [productSort, setProductSort] = useState<ProductSort>("title-asc");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [categorySort, setCategorySort] = useState<TaxonomySort>("title-asc");
  const [subcategoryQuery, setSubcategoryQuery] = useState("");
  const [subcategorySort, setSubcategorySort] =
    useState<TaxonomySort>("title-asc");
  const [excludedParents, setExcludedParents] = useState<string[]>([]);

  const productDraft = usePersistentFormDraft({
    key: `products:${editingProduct?._id || editingProduct?.id || "create"}`,
    value: productForm,
    onRestore: setProductForm,
    enabled: showProductModal,
  });
  const categoryDraft = usePersistentFormDraft({
    key: `categories:${editingCategory?.id || "create"}`,
    value: categoryForm,
    onRestore: setCategoryForm,
    enabled: showCategoryModal,
  });
  const subcategoryDraft = usePersistentFormDraft({
    key: `subcategories:${editingSubcategory?.id || "create"}`,
    value: subcategoryForm,
    onRestore: setSubcategoryForm,
    enabled: showSubcategoryModal,
  });

  const refreshProductDrafts = useCallback(async () => {
    const drafts = await listFormDrafts<ProductForm>("products:");
    setProductDrafts(drafts);
  }, []);

  const showPhotoError = useCallback(
    (message: string) => showToast(message, "error"),
    [showToast],
  );

  useKeyboardShortcut(
    "Escape",
    () => {
      if (pendingConfirm) return;
      if (showProductModal) {
        setShowProductModal(false);
      } else if (showCategoryModal) {
        setShowCategoryModal(false);
      } else if (showSubcategoryModal) {
        setShowSubcategoryModal(false);
      }
    },
    showProductModal || showCategoryModal || showSubcategoryModal,
  );

  const fetchProducts = useCallback(async () => {
    const { data, error } = (await productsService.getAll()) as ApiResult;
    if (error) return error;

    setProducts(
      extractArrayPayload<RawRecord>(data).map((product) => {
        const categoryReference = product.category ?? product.category_id;
        const subcategoryReference =
          product.subCategory ?? product.subcategory ?? product.subcategory_id;

        return {
          ...(product as Product),
          id: String(product._id || product.id || ""),
          category_id: referenceId(categoryReference),
          subcategory_id: referenceId(subcategoryReference),
          categories: referenceTitle(categoryReference)
            ? { title: referenceTitle(categoryReference) }
            : undefined,
          subcategories: referenceTitle(subcategoryReference)
            ? { title: referenceTitle(subcategoryReference) }
            : undefined,
        };
      }),
    );
    return "";
  }, []);

  const fetchCategories = useCallback(async () => {
    const { data, error } = (await categoriesService.getAll()) as ApiResult;
    if (error) return error;
    setCategories(extractArrayPayload<RawRecord>(data).map(toCategory));
    return "";
  }, []);

  const fetchSubcategories = useCallback(async () => {
    const { data, error } = (await subcategoriesService.getAll()) as ApiResult;
    if (error) return error;
    setSubcategories(
      extractArrayPayload<RawRecord>(data).map((sub) => ({
        ...(sub as unknown as Subcategory),
        id: String(sub._id || sub.id || ""),
        category_id: referenceId(sub.category ?? sub.category_id),
        title: String(sub.title || sub.name || ""),
        photos: normalizePhotos(sub.photos),
        keywords: String(sub.keywords || ""),
      })),
    );
    return "";
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const errors = await Promise.all([
      fetchProducts(),
      fetchCategories(),
      fetchSubcategories(),
    ]);
    const message = errors.filter(Boolean).join(" • ");
    if (message) setLoadError(message);
    setLoading(false);
  }, [fetchProducts, fetchCategories, fetchSubcategories]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (viewMode === "products") {
      void refreshProductDrafts();
    }
  }, [viewMode, showProductModal, productDraft.savedAt, refreshProductDrafts]);

  // ---------- derived lists ----------
  const counts = useMemo(() => productCounts(products), [products]);
  const taxonomyCounts = useMemo(
    () => productsPerTaxonomy(products),
    [products],
  );
  const categoryTitle = useCallback(
    (id?: string) =>
      categories.find((category) => category.id === id)?.title || "",
    [categories],
  );
  const categoryOptions = useMemo(
    () =>
      [...categories]
        .sort((a, b) => (a.title || "").localeCompare(b.title || ""))
        .map((category) => ({
          value: category.id,
          label: category.title || "Untitled category",
        })),
    [categories],
  );
  const productCategoryFilterOptions = useMemo(() => {
    const options = categoryOptions.filter((option) =>
      products.some((product) => product.category_id === option.value),
    );
    return products.some(
      (product) => productCategoryKey(product) === UNCATEGORIZED,
    )
      ? [...options, { value: UNCATEGORIZED, label: "Uncategorized" }]
      : options;
  }, [categoryOptions, products]);
  const parentFilterOptions = useMemo(() => {
    const options = categoryOptions.filter((option) =>
      subcategories.some(
        (subcategory) => subcategory.category_id === option.value,
      ),
    );
    return subcategories.some((subcategory) => !subcategory.category_id)
      ? [...options, { value: UNCATEGORIZED, label: "No parent" }]
      : options;
  }, [categoryOptions, subcategories]);

  const visibleProducts = useMemo(
    () =>
      filterAndSortProducts(products, {
        query: productQuery,
        active: activeFilter,
        stock: stockFilter,
        excludedCategories: excludedProductCategories,
        sort: productSort,
      }),
    [
      products,
      productQuery,
      activeFilter,
      stockFilter,
      excludedProductCategories,
      productSort,
    ],
  );
  const visibleCategories = useMemo(
    () =>
      filterAndSortTaxonomy(
        categories,
        { query: categoryQuery, sort: categorySort },
        (category) => taxonomyCounts.byCategory.get(category.id) || 0,
      ),
    [categories, categoryQuery, categorySort, taxonomyCounts],
  );
  const visibleSubcategories = useMemo(
    () =>
      filterAndSortTaxonomy(
        subcategories,
        { query: subcategoryQuery, sort: subcategorySort, excludedParents },
        (subcategory) => taxonomyCounts.bySubcategory.get(subcategory.id) || 0,
        (subcategory) => categoryTitle(subcategory.category_id),
      ),
    [
      subcategories,
      subcategoryQuery,
      subcategorySort,
      excludedParents,
      taxonomyCounts,
      categoryTitle,
    ],
  );

  const productFiltersActive =
    Boolean(productQuery.trim()) ||
    activeFilter !== "all" ||
    stockFilter !== "all" ||
    excludedProductCategories.length > 0;
  const clearProductFilters = () => {
    setProductQuery("");
    setActiveFilter("all");
    setStockFilter("all");
    setExcludedProductCategories([]);
  };

  // ---------- saves ----------
  const handleProductSubmit = async () => {
    const validationErrors = validateProductForm(productForm);
    if (validationErrors.length) return validationErrors.join(" • ");

    const productData = {
      ...productForm,
      category: productForm.category_id || null,
      subCategory: productForm.subcategory_id || null,
      category_id: productForm.category_id || null,
      subcategory_id: productForm.subcategory_id || null,
      user_id: user?.id,
    };

    try {
      const response = (
        editingProduct
          ? await productsService.update(
              editingProduct._id || editingProduct.id,
              productData,
            )
          : await productsService.create(productData)
      ) as ApiResult;

      if (response.error)
        return formApiError(response, "Failed to save product");

      showToast(
        editingProduct
          ? "Product updated successfully"
          : "Product created successfully",
        "success",
      );
      setShowProductModal(false);
      await productDraft.clearDraft();
      setProductForm(emptyProductForm());
      setEditingProduct(null);
      setProductSection("products");
      await Promise.all([fetchProducts(), refreshProductDrafts()]);
      return "";
    } catch (error) {
      return error instanceof Error ? error.message : "Failed to save product";
    }
  };

  const handleCategorySubmit = async () => {
    const categoryData = { ...categoryForm, user_id: user?.id };
    try {
      const response = (
        editingCategory
          ? await categoriesService.update(editingCategory.id, categoryData)
          : await categoriesService.create(categoryData)
      ) as CategorySaveResult;

      if (response.error) {
        const message = formApiError(response, "Failed to save category");
        showToast(message, "error");
        // A timed-out upload may still have saved on the server.
        if (response.code === "TIMEOUT") void fetchCategories();
        return message;
      }

      showToast(
        editingCategory
          ? "Category updated successfully"
          : "Category created successfully",
        "success",
      );
      if (response.warning) showToast(response.warning, "info");
      setShowCategoryModal(false);
      await categoryDraft.clearDraft();
      setCategoryForm(emptyCategoryForm());
      setEditingCategory(null);
      // Update the list from the saved record; refetch only if it's missing.
      const saved = toCategory(savedCategory(response.data) as RawRecord);
      if (saved.id) {
        setCategories((current) =>
          current.some((category) => category.id === saved.id)
            ? current.map((category) =>
                category.id === saved.id ? saved : category,
              )
            : [saved, ...current],
        );
      } else {
        await fetchCategories();
      }
      return "";
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save category";
      showToast(message, "error");
      return message;
    }
  };

  const handleSubcategorySubmit = async () => {
    if (!subcategoryForm.category_id) return "Choose a parent category.";
    const subcategoryData = {
      ...subcategoryForm,
      category: subcategoryForm.category_id,
      user_id: user?.id,
    };

    try {
      const response = (
        editingSubcategory
          ? await subcategoriesService.update(
              editingSubcategory.id,
              subcategoryData,
            )
          : await subcategoriesService.create(subcategoryData)
      ) as ApiResult;

      if (response.error)
        return formApiError(response, "Failed to save subcategory");

      showToast(
        editingSubcategory
          ? "Subcategory updated successfully"
          : "Subcategory created successfully",
        "success",
      );
      setShowSubcategoryModal(false);
      await subcategoryDraft.clearDraft();
      setSubcategoryForm(emptySubcategoryForm());
      setEditingSubcategory(null);
      await fetchSubcategories();
      return "";
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Failed to save subcategory";
    }
  };

  // ---------- confirmations ----------
  const runPendingConfirm = async () => {
    if (!pendingConfirm || confirmBusy) return;
    setConfirmBusy(true);
    try {
      await pendingConfirm.action();
      setPendingConfirm(null);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Action failed",
        "error",
      );
    } finally {
      setConfirmBusy(false);
    }
  };

  const strong = (text: string) => (
    <span className="font-bold text-white">"{text}"</span>
  );

  const handleDeleteProduct = (product: Product) => {
    const productId = product._id || product.id;
    if (!productId) {
      showToast("Unable to delete product because its ID is missing", "error");
      return;
    }
    setPendingConfirm({
      title: "Delete product?",
      message: (
        <p>
          Delete {strong(product.title || "this product")}? This permanently
          removes the saved product. Any local edit draft for it will also be
          cleared.
        </p>
      ),
      action: async () => {
        const response = (await productsService.delete(productId)) as ApiResult;
        if (response.error)
          throw new Error(formApiError(response, "Failed to delete product"));
        await clearFormDraft(`products:${productId}`);
        await Promise.all([fetchProducts(), refreshProductDrafts()]);
        showToast("Product deleted successfully", "success");
      },
    });
  };

  const handleDeleteCategory = (category: Category) => {
    const used = taxonomyCounts.byCategory.get(category.id) || 0;
    setPendingConfirm({
      title: "Delete category?",
      message: (
        <div className="space-y-2">
          <p>Delete category {strong(category.title)}?</p>
          {used > 0 && (
            <p className="text-amber-300">
              {used} product{used === 1 ? " uses" : "s use"} this category.
            </p>
          )}
        </div>
      ),
      action: async () => {
        const response = (await categoriesService.delete(
          category.id,
        )) as ApiResult;
        if (response.error)
          throw new Error(formApiError(response, "Failed to delete category"));
        await fetchCategories();
        showToast("Category deleted successfully", "success");
      },
    });
  };

  const handleDeleteSubcategory = (subcategory: Subcategory) => {
    const used = taxonomyCounts.bySubcategory.get(subcategory.id) || 0;
    setPendingConfirm({
      title: "Delete subcategory?",
      message: (
        <div className="space-y-2">
          <p>Delete subcategory {strong(subcategory.title)}?</p>
          {used > 0 && (
            <p className="text-amber-300">
              {used} product{used === 1 ? " uses" : "s use"} this subcategory.
            </p>
          )}
        </div>
      ),
      action: async () => {
        const response = (await subcategoriesService.delete(
          subcategory.id,
        )) as ApiResult;
        if (response.error)
          throw new Error(
            formApiError(response, "Failed to delete subcategory"),
          );
        await fetchSubcategories();
        showToast("Subcategory deleted successfully", "success");
      },
    });
  };

  const handleDeleteProductDraft = (draft: FormDraftRecord<ProductForm>) => {
    const title = draft.value.title?.trim() || "Untitled product";
    setPendingConfirm({
      title: "Delete draft?",
      confirmLabel: "Delete draft",
      message: (
        <p>
          Delete draft {strong(title)}? This only removes the locally saved
          draft. It does not delete a published product.
        </p>
      ),
      action: async () => {
        await clearFormDraft(draft.key);
        await refreshProductDrafts();
        showToast("Product draft deleted", "success");
      },
    });
  };

  const clearProductForm = () => {
    const title = productForm.title?.trim() || "this product";
    setPendingConfirm({
      title: "Clear draft?",
      confirmLabel: "Clear draft",
      loadingLabel: "Clearing…",
      message: (
        <p>
          Clear the draft for {strong(title)}? Unsaved changes will be removed
          and the editor will close.
        </p>
      ),
      action: async () => {
        setShowProductModal(false);
        await productDraft.clearDraft();
        setProductForm(emptyProductForm());
        setEditingProduct(null);
        await refreshProductDrafts();
        showToast("Product draft cleared", "success");
      },
    });
  };

  // ---------- open editors ----------
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm(productFormFromProduct(product, subcategories));
    setShowProductModal(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      title: category.title,
      description: category.description || "",
      keywords: category.keywords || "",
      photos: category.photos || [],
    });
    setShowCategoryModal(true);
  };

  const handleEditSubcategory = (subcategory: Subcategory) => {
    setEditingSubcategory(subcategory);
    setSubcategoryForm({
      category_id: subcategory.category_id,
      title: subcategory.title,
      description: subcategory.description || "",
      keywords: subcategory.keywords || "",
      photos: subcategory.photos || [],
    });
    setShowSubcategoryModal(true);
  };

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProductForm(emptyProductForm());
    setShowProductModal(true);
  };

  const handleResumeProductDraft = (draft: FormDraftRecord<ProductForm>) => {
    const draftProductId = draft.key.replace(/^products:/, "");
    const product =
      draftProductId === "create"
        ? null
        : products.find(
            (item) => String(item._id || item.id) === String(draftProductId),
          ) || null;

    if (draftProductId !== "create" && !product) {
      showToast(
        "The original product no longer exists. Delete this stale draft or create a new product.",
        "error",
      );
      return;
    }

    const baseForm = product
      ? productFormFromProduct(product, subcategories)
      : emptyProductForm();

    setEditingProduct(product);
    setProductForm({
      ...baseForm,
      ...(draft.value || {}),
      photos: Array.isArray(draft.value?.photos)
        ? draft.value.photos
        : baseForm.photos,
      category_id: draft.value?.category_id || baseForm.category_id || "",
      subcategory_id:
        draft.value?.subcategory_id || baseForm.subcategory_id || "",
    });
    setShowProductModal(true);
  };

  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm(emptyCategoryForm());
    setShowCategoryModal(true);
  };

  const openCreateSubcategory = () => {
    setEditingSubcategory(null);
    setSubcategoryForm(emptySubcategoryForm());
    setShowSubcategoryModal(true);
  };

  const clearCategoryForm = async () => {
    await categoryDraft.clearDraft();
    setCategoryForm(emptyCategoryForm());
    setEditingCategory(null);
    showToast("Category draft cleared", "success");
  };

  const clearSubcategoryForm = async () => {
    await subcategoryDraft.clearDraft();
    setSubcategoryForm(emptySubcategoryForm());
    setEditingSubcategory(null);
    showToast("Subcategory draft cleared", "success");
  };

  // ---------- rendering ----------
  const skeletonGrid = (columns: string) => (
    <div className={`grid grid-cols-1 gap-5 ${columns}`}>
      {Array.from({ length: 6 }, (_, index) => (
        <CatalogCardSkeleton key={index} />
      ))}
    </div>
  );

  const addButton = (label: string, onClick: () => void) => (
    <LiquidButton type="button" variant="primary" onClick={onClick}>
      <Plus className="h-4 w-4" aria-hidden="true" />
      {label}
    </LiquidButton>
  );

  const sectionTabs = [
    { id: "products" as const, label: "Products", count: products.length },
    { id: "drafts" as const, label: "Drafts", count: productDrafts.length },
    {
      id: "categories" as const,
      label: "Categories",
      count: categories.length,
    },
    {
      id: "subcategories" as const,
      label: "Subcategories",
      count: subcategories.length,
    },
  ];

  const showCategories =
    viewMode === "categories" ||
    (viewMode === "products" && productSection === "categories");
  const showSubcategories =
    viewMode === "subcategories" ||
    (viewMode === "products" && productSection === "subcategories");

  return (
    <div className="min-w-0">
      <TabInnerContent
        title="Product Management"
        description="Manage products, categories, and subcategories"
      >
        {viewMode !== "blogs" && loadError && (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300"
          >
            <span className="min-w-0 flex-1 break-words">
              Some catalog data failed to load: {loadError}
            </span>
            <LiquidButton
              type="button"
              variant="soft"
              onClick={() => void fetchAll()}
              disabled={loading}
            >
              Retry
            </LiquidButton>
          </div>
        )}

        {viewMode === "products" && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Catalog section"
            >
              {sectionTabs.map((tab) => {
                const active = productSection === tab.id;
                return (
                  <LiquidButton
                    key={tab.id}
                    type="button"
                    variant={active ? "primary" : "soft"}
                    aria-pressed={active}
                    onClick={() => {
                      setProductSection(tab.id);
                      if (tab.id === "drafts") void refreshProductDrafts();
                    }}
                  >
                    {tab.label}
                    <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs tabular-nums dark:bg-white/15">
                      {tab.count}
                    </span>
                  </LiquidButton>
                );
              })}
            </div>
            <div className="flex shrink-0 gap-2">
              <LiquidIconButton
                type="button"
                aria-label="Refresh catalog"
                title="Refresh"
                onClick={() => void fetchAll()}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`}
                  aria-hidden="true"
                />
              </LiquidIconButton>
              {(productSection === "products" || productSection === "drafts") &&
                addButton("Add Product", openCreateProduct)}
            </div>
          </motion.div>
        )}

        {viewMode === "products" && productSection === "products" && (
          <>
            {(counts.low > 0 || counts.out > 0 || counts.inactive > 0) && (
              <div
                className="mb-4 flex flex-wrap gap-2"
                aria-label="Catalog health"
              >
                {counts.out > 0 && (
                  <LiquidButton
                    type="button"
                    variant="ghost"
                    aria-pressed={stockFilter === "out"}
                    onClick={() =>
                      setStockFilter(stockFilter === "out" ? "all" : "out")
                    }
                    className="text-rose-600 dark:text-rose-300"
                  >
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    {counts.out} out of stock
                  </LiquidButton>
                )}
                {counts.low > 0 && (
                  <LiquidButton
                    type="button"
                    variant="ghost"
                    aria-pressed={stockFilter === "low"}
                    onClick={() =>
                      setStockFilter(stockFilter === "low" ? "all" : "low")
                    }
                    className="text-amber-600 dark:text-amber-300"
                  >
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    {counts.low} low stock
                  </LiquidButton>
                )}
                {counts.inactive > 0 && (
                  <LiquidBadge className="self-center">
                    {counts.inactive} inactive
                  </LiquidBadge>
                )}
              </div>
            )}

            <div className="mb-3 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))] xl:items-end">
              <CatalogSearchField
                value={productQuery}
                onChange={setProductQuery}
                placeholder="Name, brand, SKU, keyword…"
                className="sm:col-span-2 xl:col-span-1"
              />
              <LiquidMultiSelect
                label="Categories"
                values={productCategoryFilterOptions
                  .map((option) => option.value)
                  .filter(
                    (value) => !excludedProductCategories.includes(value),
                  )}
                options={productCategoryFilterOptions}
                onChange={(values) =>
                  setExcludedProductCategories(
                    productCategoryFilterOptions
                      .map((option) => option.value)
                      .filter((value) => !values.includes(value)),
                  )
                }
                placeholder="No categories"
                allLabel="All categories"
                searchPlaceholder="Search categories…"
                disabled={productCategoryFilterOptions.length === 0}
                wrapperClassName="min-w-0"
              />
              <LiquidDropdown
                label="Status"
                value={activeFilter}
                options={ACTIVE_OPTIONS}
                onChange={(value) => setActiveFilter(value as ActiveFilter)}
                wrapperClassName="min-w-0"
              />
              <LiquidDropdown
                label="Stock"
                value={stockFilter}
                options={STOCK_OPTIONS}
                onChange={(value) => setStockFilter(value as StockFilter)}
                wrapperClassName="min-w-0"
              />
              <LiquidDropdown
                label="Sort"
                value={productSort}
                options={PRODUCT_SORT_OPTIONS}
                onChange={(value) => setProductSort(value as ProductSort)}
                wrapperClassName="min-w-0"
              />
            </div>

            {loading && products.length === 0 ? (
              skeletonGrid("sm:grid-cols-2 xl:grid-cols-3")
            ) : (
              <>
                <ResultLine
                  shown={visibleProducts.length}
                  total={products.length}
                  noun="product"
                  filtersActive={productFiltersActive}
                  onClear={clearProductFilters}
                />
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {visibleProducts.map((product, index) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        index={index}
                        onEdit={handleEditProduct}
                        onDelete={handleDeleteProduct}
                      />
                    ))}
                  </AnimatePresence>
                </div>
                {visibleProducts.length === 0 &&
                  (products.length === 0 ? (
                    <CatalogEmptyState
                      icon={Package}
                      title="No products yet"
                      description="Add your first product to get started."
                      action={addButton("Add Product", openCreateProduct)}
                    />
                  ) : (
                    <CatalogEmptyState
                      icon={Package}
                      title="No products match these filters"
                      action={
                        <LiquidButton
                          type="button"
                          variant="soft"
                          onClick={clearProductFilters}
                        >
                          <FilterX className="h-4 w-4" aria-hidden="true" />
                          Clear filters
                        </LiquidButton>
                      }
                    />
                  ))}
              </>
            )}
          </>
        )}

        {viewMode === "products" && productSection === "drafts" && (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {productDrafts.map((draft, index) => {
                const draftProductId = draft.key.replace(/^products:/, "");
                const isCreateDraft = draftProductId === "create";
                const sourceProduct = isCreateDraft
                  ? null
                  : products.find(
                      (item) =>
                        String(item._id || item.id) === String(draftProductId),
                    );
                const title =
                  draft.value.title?.trim() ||
                  sourceProduct?.title ||
                  "Untitled product";

                return (
                  <motion.div
                    key={draft.key}
                    layout={!reduceMotion}
                    initial={
                      reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      delay: reduceMotion ? 0 : Math.min(index, 10) * 0.03,
                    }}
                    className="flex flex-col gap-4 rounded-[1.5rem] border border-white/40 bg-white/40 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-300">
                        <FilePenLine className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-words font-bold text-neutral-950 dark:text-white">
                            {title}
                          </h3>
                          <LiquidBadge className="text-[11px]">
                            {isCreateDraft ? "New product" : "Product edit"}
                          </LiquidBadge>
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/50">
                          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                          Saved{" "}
                          {new Date(draft.savedAt).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                        {!isCreateDraft && !sourceProduct && (
                          <p className="mt-2 text-xs font-medium text-red-500">
                            Original product is no longer available.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <LiquidButton
                        type="button"
                        variant="primary"
                        disabled={!isCreateDraft && !sourceProduct}
                        onClick={() => handleResumeProductDraft(draft)}
                      >
                        Resume
                      </LiquidButton>
                      <LiquidButton
                        type="button"
                        variant="danger"
                        onClick={() => handleDeleteProductDraft(draft)}
                      >
                        Delete draft
                      </LiquidButton>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {productDrafts.length === 0 && (
              <CatalogEmptyState
                icon={FilePenLine}
                title="No product drafts"
                description="Close a product editor without clearing it and the draft will appear here automatically."
              />
            )}
          </div>
        )}

        {showCategories && (
          <>
            <div className="mb-3 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end">
              <CatalogSearchField
                value={categoryQuery}
                onChange={setCategoryQuery}
                placeholder="Name, keyword, description…"
              />
              <LiquidDropdown
                label="Sort"
                value={categorySort}
                options={TAXONOMY_SORT_OPTIONS}
                onChange={(value) => setCategorySort(value as TaxonomySort)}
                wrapperClassName="min-w-0"
              />
              {addButton("Add Category", openCreateCategory)}
            </div>

            {loading && categories.length === 0 ? (
              skeletonGrid("md:grid-cols-2")
            ) : (
              <>
                <ResultLine
                  shown={visibleCategories.length}
                  total={categories.length}
                  noun="category"
                  filtersActive={Boolean(categoryQuery.trim())}
                  onClear={() => setCategoryQuery("")}
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {visibleCategories.map((category, index) => (
                      <TaxonomyCard
                        key={category.id}
                        item={category}
                        index={index}
                        kindLabel="Category"
                        productCount={
                          taxonomyCounts.byCategory.get(category.id) || 0
                        }
                        onEdit={handleEditCategory}
                        onDelete={handleDeleteCategory}
                      />
                    ))}
                  </AnimatePresence>
                </div>
                {visibleCategories.length === 0 && (
                  <CatalogEmptyState
                    icon={Layers}
                    title={
                      categories.length
                        ? "No categories match your search"
                        : "No categories yet"
                    }
                    description={
                      categories.length
                        ? undefined
                        : "Add your first category to organize products."
                    }
                    action={
                      categories.length ? (
                        <LiquidButton
                          type="button"
                          variant="soft"
                          onClick={() => setCategoryQuery("")}
                        >
                          <FilterX className="h-4 w-4" aria-hidden="true" />
                          Clear search
                        </LiquidButton>
                      ) : (
                        addButton("Add Category", openCreateCategory)
                      )
                    }
                  />
                )}
              </>
            )}
          </>
        )}

        {showSubcategories && (
          <>
            <div className="mb-3 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
              <CatalogSearchField
                value={subcategoryQuery}
                onChange={setSubcategoryQuery}
                placeholder="Name, keyword, parent category…"
                className="sm:col-span-2 lg:col-span-1"
              />
              <LiquidMultiSelect
                label="Parent categories"
                values={parentFilterOptions
                  .map((option) => option.value)
                  .filter((value) => !excludedParents.includes(value))}
                options={parentFilterOptions}
                onChange={(values) =>
                  setExcludedParents(
                    parentFilterOptions
                      .map((option) => option.value)
                      .filter((value) => !values.includes(value)),
                  )
                }
                placeholder="No categories"
                allLabel="All categories"
                searchPlaceholder="Search categories…"
                disabled={parentFilterOptions.length === 0}
                wrapperClassName="min-w-0"
              />
              <LiquidDropdown
                label="Sort"
                value={subcategorySort}
                options={TAXONOMY_SORT_OPTIONS}
                onChange={(value) => setSubcategorySort(value as TaxonomySort)}
                wrapperClassName="min-w-0"
              />
              {addButton("Add Subcategory", openCreateSubcategory)}
            </div>

            {loading && subcategories.length === 0 ? (
              skeletonGrid("md:grid-cols-2")
            ) : (
              <>
                <ResultLine
                  shown={visibleSubcategories.length}
                  total={subcategories.length}
                  noun="subcategory"
                  filtersActive={
                    Boolean(subcategoryQuery.trim()) ||
                    excludedParents.length > 0
                  }
                  onClear={() => {
                    setSubcategoryQuery("");
                    setExcludedParents([]);
                  }}
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {visibleSubcategories.map((subcategory, index) => (
                      <TaxonomyCard
                        key={subcategory.id}
                        item={subcategory}
                        index={index}
                        kindLabel="Subcategory"
                        parentTitle={categoryTitle(subcategory.category_id)}
                        productCount={
                          taxonomyCounts.bySubcategory.get(subcategory.id) || 0
                        }
                        onEdit={handleEditSubcategory}
                        onDelete={handleDeleteSubcategory}
                      />
                    ))}
                  </AnimatePresence>
                </div>
                {visibleSubcategories.length === 0 && (
                  <CatalogEmptyState
                    icon={Grid3x3}
                    title={
                      subcategories.length
                        ? "No subcategories match these filters"
                        : "No subcategories yet"
                    }
                    description={
                      subcategories.length
                        ? undefined
                        : "Add subcategories to further organize products."
                    }
                    action={
                      subcategories.length ? (
                        <LiquidButton
                          type="button"
                          variant="soft"
                          onClick={() => {
                            setSubcategoryQuery("");
                            setExcludedParents([]);
                          }}
                        >
                          <FilterX className="h-4 w-4" aria-hidden="true" />
                          Clear filters
                        </LiquidButton>
                      ) : (
                        addButton("Add Subcategory", openCreateSubcategory)
                      )
                    }
                  />
                )}
              </>
            )}
          </>
        )}

        {viewMode === "blogs" && <ProductInnerBlog />}

        <AnimatePresence>
          {showProductModal && (
            <ProductFormPanel
              open={showProductModal}
              editing={Boolean(editingProduct)}
              form={productForm}
              savedAt={productDraft.savedAt}
              categoryOptions={categoryOptions}
              subcategoryOptions={subcategories
                .filter(
                  (subcategory) =>
                    subcategory.category_id === productForm.category_id,
                )
                .sort((a, b) => (a.title || "").localeCompare(b.title || ""))
                .map((subcategory) => ({
                  value: subcategory.id,
                  label: subcategory.title,
                }))}
              onChange={(patch) =>
                setProductForm((current) => ({ ...current, ...patch }))
              }
              onSubmit={handleProductSubmit}
              onClose={() => setShowProductModal(false)}
              onClearDraft={clearProductForm}
              onPhotoError={showPhotoError}
            />
          )}
        </AnimatePresence>

        <TaxonomyFormPanel
          kind="category"
          open={showCategoryModal}
          editing={Boolean(editingCategory)}
          form={categoryForm}
          onChange={(patch) =>
            setCategoryForm((current) => ({ ...current, ...patch }))
          }
          onSubmit={handleCategorySubmit}
          onClose={() => setShowCategoryModal(false)}
          onClearDraft={() => void clearCategoryForm()}
          onPhotoError={showPhotoError}
        />

        <TaxonomyFormPanel
          kind="subcategory"
          open={showSubcategoryModal}
          editing={Boolean(editingSubcategory)}
          form={subcategoryForm}
          parentOptions={categoryOptions}
          onChange={(patch) =>
            setSubcategoryForm((current) => ({ ...current, ...patch }))
          }
          onSubmit={handleSubcategorySubmit}
          onClose={() => setShowSubcategoryModal(false)}
          onClearDraft={() => void clearSubcategoryForm()}
          onPhotoError={showPhotoError}
        />

        <CatalogDeleteDialog
          open={Boolean(pendingConfirm)}
          title={pendingConfirm?.title || ""}
          message={pendingConfirm?.message}
          confirmLabel={pendingConfirm?.confirmLabel}
          loadingLabel={pendingConfirm?.loadingLabel}
          loading={confirmBusy}
          onClose={() => setPendingConfirm(null)}
          onConfirm={() => void runPendingConfirm()}
        />
      </TabInnerContent>
    </div>
  );
}
