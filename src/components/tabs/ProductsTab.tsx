import { useState, useEffect } from "react";
import {
  clearFormDraft,
  listFormDrafts,
  usePersistentFormDraft,
  type FormDraftRecord,
} from "../../hooks/usePersistentFormDraft";
import { motion, AnimatePresence } from "framer-motion";
import {
  productsService,
  categoriesService,
  subcategoriesService,
} from "../../services/apiService";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../Toast";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
import { PhotoCarousel, ProductPhoto } from "../modular/products/PhotoCarousel";
import {
  Plus,
  Edit2,
  Trash2,
  Package,
  Layers,
  Grid3x3,
  FilePenLine,
  Clock3,
} from "lucide-react";
import ProductCard from "../modular/products/productCard";
import TabInnerContent from "../Layout/tabInnerlayout";
import { extractArrayPayload } from "../../utils/apiPayload";
import ProductInnerBlog from "../modular/products/tabInnerContent/ProductInnerBlog";
import RichTextEditor from "../ui/RichTextEditor";
import ResizableFloatingSidebar from "../ui/ResizableFloatingSidebar";
import { LiquidButton } from "../ui/liquid";

interface Category {
  id: string;
  title: string;
  description: string | null;
  keywords: string;
  photos: ProductPhoto[];
}

interface Subcategory {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  keywords: string;
  photos: ProductPhoto[];
}

const getReferenceId = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "object") {
    const reference = value as { _id?: string; id?: string };
    return String(reference._id || reference.id || "");
  }
  return String(value);
};

const getReferenceTitle = (value: unknown): string => {
  if (!value || typeof value !== "object") return "";
  const reference = value as { title?: string; name?: string };
  return String(reference.title || reference.name || "");
};

const emptyProductForm = () => ({
  title: "",
  description: "",
  price: 0,
  discountPrice: 0,
  dpPrice: 0,
  discountPriceStatus: false,
  discountPricePercentage: 0,
  photos: [] as ProductPhoto[],
  category: "",
  stock: 0,
  brand: "",
  ratings: 0,
  numberOfReviews: 0,
  slug: "",
  keywords: "",
  sku: "",
  gtin: "",
  mpn: "",
  googleProductCategory: "",
  productType: "",
  condition: "new",
  shippingWeight: "",
  identifierExists: true,
  merchantEnabled: true,
  is_active: true,
  category_id: "",
  subcategory_id: "",
});

type ProductForm = ReturnType<typeof emptyProductForm>;

const emptyCategoryForm = () => ({
  title: "",
  description: "",
  keywords: "",
  photos: [] as ProductPhoto[],
});

const emptySubcategoryForm = () => ({
  category_id: "",
  title: "",
  description: "",
  keywords: "",
  photos: [] as ProductPhoto[],
});

const formApiError = (response: any, fallback: string) => {
  const details = Array.isArray(response?.errors)
    ? response.errors
        .map((item: any) =>
          [item?.field, item?.message].filter(Boolean).join(": "),
        )
        .filter(Boolean)
    : [];

  return [response?.error || fallback, ...details]
    .filter((item, index, items) => item && items.indexOf(item) === index)
    .join(" • ");
};

const hasRichTextContent = (html: string) =>
  String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim().length > 0;

export type ProductViewMode =
  "products" | "categories" | "subcategories" | "blogs";

type ProductsTabProps = {
  viewMode: ProductViewMode;
};

export default function ProductsTab({ viewMode }: ProductsTabProps) {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [productSection, setProductSection] = useState<"products" | "drafts">(
    "products",
  );
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
  const { user } = useAuth();

  const [productForm, setProductForm] = useState(emptyProductForm);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [subcategoryForm, setSubcategoryForm] = useState(emptySubcategoryForm);

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

  const refreshProductDrafts = async () => {
    const drafts = await listFormDrafts<ProductForm>("products:");
    setProductDrafts(drafts);
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    currentPhotos: ProductPhoto[],
    updatePhotos: (photos: ProductPhoto[]) => void,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast("File size should be less than 5MB", "error");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const newPhoto = {
          id: Math.random().toString(36).substr(2, 9),
          secure_url: reader.result as string,
        };
        updatePhotos([...currentPhotos, newPhoto]);
      };
      reader.readAsDataURL(file);
    }
  };

  useKeyboardShortcut(
    "Escape",
    () => {
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

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (viewMode === "products") {
      void refreshProductDrafts();
    }
  }, [viewMode, showProductModal, productDraft.savedAt]);

  const fetchAll = async () => {
    await Promise.all([
      fetchProducts(),
      fetchCategories(),
      fetchSubcategories(),
    ]);
    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data, error } = await productsService.getAll();

    if (!error && data) {
      const mappedProducts = extractArrayPayload<any>(data).map(
        (product: any) => {
          const categoryReference = product.category ?? product.category_id;
          const subcategoryReference =
            product.subCategory ??
            product.subcategory ??
            product.subcategory_id;

          return {
            ...product,
            id: product._id || product.id,
            category_id: getReferenceId(categoryReference),
            subcategory_id: getReferenceId(subcategoryReference),
            categories: getReferenceTitle(categoryReference)
              ? { title: getReferenceTitle(categoryReference) }
              : undefined,
            subcategories: getReferenceTitle(subcategoryReference)
              ? { title: getReferenceTitle(subcategoryReference) }
              : undefined,
          };
        },
      );
      setProducts(mappedProducts);
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await categoriesService.getAll();

    if (!error && data) {
      // Map API response to match interface if needed
      const mappedCategories = extractArrayPayload<any>(data).map((cat: any) => ({
        ...cat,
        id: cat._id || cat.id,
        title: cat.title || cat.name,
        photos: Array.isArray(cat.photos)
          ? cat.photos.map((p: any) =>
              typeof p === "string"
                ? { id: Math.random().toString(), secure_url: p }
                : p,
            )
          : [],
        keywords: cat.keywords || "",
      }));
      setCategories(mappedCategories);
    }
  };

  const fetchSubcategories = async () => {
    const { data, error } = await subcategoriesService.getAll();

    if (!error && data) {
      const mappedSubcategories = extractArrayPayload<any>(data).map((sub: any) => ({
        ...sub,
        id: sub._id || sub.id,
        category_id: getReferenceId(sub.category ?? sub.category_id),
        title: sub.title || sub.name,
        photos: Array.isArray(sub.photos)
          ? sub.photos.map((p: any) =>
              typeof p === "string"
                ? { id: Math.random().toString(), secure_url: p }
                : p,
            )
          : [],
        keywords: sub.keywords || "",
      }));
      setSubcategories(mappedSubcategories);
    }
  };

  const handleProductSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const validationErrors: string[] = [];
    if (!productForm.title.trim()) validationErrors.push("Product title is required");
    if (!productForm.brand.trim()) validationErrors.push("Brand is required");
    if (!hasRichTextContent(productForm.description)) {
      validationErrors.push("Product description is required");
    }
    if (!productForm.photos.some((photo) => Boolean(photo?.secure_url))) {
      validationErrors.push("At least one product image is required");
    }
    if (Number(productForm.price) < 0 || Number.isNaN(Number(productForm.price))) {
      validationErrors.push("Price must be a non-negative number");
    }
    if (Number(productForm.stock) < 0 || Number.isNaN(Number(productForm.stock))) {
      validationErrors.push("Stock must be a non-negative number");
    }
    if (productForm.subcategory_id && !productForm.category_id) {
      validationErrors.push("Select a category for the chosen subcategory");
    }

    if (validationErrors.length) {
      showToast(validationErrors.join(" • "), "error");
      return;
    }

    const productData = {
      ...productForm,
      category: productForm.category_id || null,
      subCategory: productForm.subcategory_id || null,
      category_id: productForm.category_id || null,
      subcategory_id: productForm.subcategory_id || null,
      user_id: user?.id,
    };

    try {
      const response = editingProduct
        ? await productsService.update(
            editingProduct._id || editingProduct.id,
            productData,
          )
        : await productsService.create(productData);

      if (response.error) {
        showToast(formApiError(response, "Failed to save product"), "error");
        return;
      }

      showToast(
        editingProduct ? "Product updated successfully" : "Product created successfully",
        "success",
      );
      setShowProductModal(false);
      await productDraft.clearDraft();
      setProductForm(emptyProductForm());
      setEditingProduct(null);
      setProductSection("products");
      await Promise.all([fetchProducts(), refreshProductDrafts()]);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Failed to save product",
        "error",
      );
    }
  };

  const handleCategorySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const categoryData = {
      ...categoryForm,
      user_id: user?.id,
    };

    try {
      const response = editingCategory
        ? await categoriesService.update(editingCategory.id, categoryData)
        : await categoriesService.create(categoryData);

      if (response.error) {
        showToast(formApiError(response, "Failed to save category"), "error");
        return;
      }

      showToast(
        editingCategory ? "Category updated successfully" : "Category created successfully",
        "success",
      );
      setShowCategoryModal(false);
      await categoryDraft.clearDraft();
      setCategoryForm(emptyCategoryForm());
      setEditingCategory(null);
      await fetchCategories();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Failed to save category",
        "error",
      );
    }
  };

  const handleSubcategorySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const subcategoryData = {
      ...subcategoryForm,
      category: subcategoryForm.category_id,
      user_id: user?.id,
    };

    try {
      const response = editingSubcategory
        ? await subcategoriesService.update(editingSubcategory.id, subcategoryData)
        : await subcategoriesService.create(subcategoryData);

      if (response.error) {
        showToast(formApiError(response, "Failed to save subcategory"), "error");
        return;
      }

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
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Failed to save subcategory",
        "error",
      );
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    const productId = product._id || product.id;

    if (!productId) {
      showToast("Unable to delete product because its ID is missing", "error");
      return;
    }

    const confirmed = window.confirm(
      `Delete "${product.title || "this product"}"?\n\nThis permanently removes the saved product. Any local edit draft for it will also be cleared.`,
    );

    if (!confirmed) return;

    try {
      const { error } = await productsService.delete(productId);

      if (error) throw error;

      await clearFormDraft(`products:${productId}`);
      await Promise.all([fetchProducts(), refreshProductDrafts()]);
      showToast("Product deleted successfully", "success");
    } catch (error) {
      showToast("Failed to delete product", "error");
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (
      confirm(
        `Are you sure you want to delete Category: "${category.title}" (ID: ${category.id})?`,
      )
    ) {
      try {
        const { error } = await categoriesService.delete(category.id);

        if (error) throw error;

        showToast("Category deleted successfully", "success");
        fetchCategories();
      } catch (error) {
        showToast("Failed to delete category", "error");
      }
    }
  };

  const handleDeleteSubcategory = async (subcategory: Subcategory) => {
    if (
      confirm(
        `Are you sure you want to delete Subcategory: "${subcategory.title}" (ID: ${subcategory.id})?`,
      )
    ) {
      try {
        const { error } = await subcategoriesService.delete(subcategory.id);

        if (error) throw error;

        showToast("Subcategory deleted successfully", "success");
        fetchSubcategories();
      } catch (error) {
        showToast("Failed to delete subcategory", "error");
      }
    }
  };

  const getProductFormFromProduct = (product: Product): ProductForm => {
    const subcategoryId = getReferenceId(
      product.subcategory_id ||
        (product as any).subCategory ||
        (product as any).subcategory,
    );
    const selectedSubcategory = subcategories.find(
      (subcategory) => subcategory.id === subcategoryId,
    );
    const categoryId =
      getReferenceId(product.category_id || (product as any).category) ||
      selectedSubcategory?.category_id ||
      "";

    return {
      ...emptyProductForm(),
      title: product.title || "",
      description: product.description || "",
      sku: product.sku || "",
      gtin: (product as any).gtin || "",
      mpn: (product as any).mpn || "",
      googleProductCategory: (product as any).googleProductCategory || "",
      productType: (product as any).productType || "",
      condition: (product as any).condition || "new",
      shippingWeight: (product as any).shippingWeight || "",
      identifierExists: (product as any).identifierExists !== false,
      merchantEnabled: (product as any).merchantEnabled !== false,
      price: product.price || 0,
      discountPrice: product.discountPrice || 0,
      dpPrice: product.dpPrice || 0,
      discountPriceStatus: product.discountPriceStatus || false,
      discountPricePercentage: product.discountPricePercentage || 0,
      photos: product.photos || [],
      category: categoryId,
      stock: product.stock || 0,
      brand: product.brand || "",
      ratings: product.ratings || 0,
      numberOfReviews: product.numberOfReviews || 0,
      slug: product.slug || "",
      keywords: product.keywords || "",
      is_active: product.is_active !== false,
      category_id: categoryId,
      subcategory_id: subcategoryId,
    };
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm(getProductFormFromProduct(product));
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
            (item) =>
              String(item._id || item.id) === String(draftProductId),
          ) || null;

    if (draftProductId !== "create" && !product) {
      showToast(
        "The original product no longer exists. Delete this stale draft or create a new product.",
        "error",
      );
      return;
    }

    const baseForm = product
      ? getProductFormFromProduct(product)
      : emptyProductForm();

    const hydratedDraft: ProductForm = {
      ...baseForm,
      ...(draft.value || {}),
      photos: Array.isArray(draft.value?.photos)
        ? draft.value.photos
        : baseForm.photos,
      category_id: draft.value?.category_id || baseForm.category_id || "",
      subcategory_id:
        draft.value?.subcategory_id || baseForm.subcategory_id || "",
    };

    setEditingProduct(product);
    setProductForm(hydratedDraft);
    setShowProductModal(true);
  };

  const handleDeleteProductDraft = async (
    draft: FormDraftRecord<ProductForm>,
  ) => {
    const title = draft.value.title?.trim() || "Untitled product";
    const confirmed = window.confirm(
      `Delete draft "${title}"?\n\nThis only removes the locally saved draft. It does not delete a published product.`,
    );

    if (!confirmed) return;

    await clearFormDraft(draft.key);
    await refreshProductDrafts();
    showToast("Product draft deleted", "success");
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

  const clearProductForm = async () => {
    const title = productForm.title?.trim() || "this product";
    const confirmed = window.confirm(
      `Clear the draft for "${title}"?\n\nUnsaved changes will be removed and the editor will close.`,
    );

    if (!confirmed) return;

    setShowProductModal(false);
    await productDraft.clearDraft();
    setProductForm(emptyProductForm());
    setEditingProduct(null);
    await refreshProductDrafts();
    showToast("Product draft cleared", "success");
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

  const closeProductForm = () => setShowProductModal(false);
  const closeCategoryForm = () => setShowCategoryModal(false);
  const closeSubcategoryForm = () => setShowSubcategoryModal(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <TabInnerContent
        title="Product Management"
        description="Manage products, categories, and subcategories"
      >
        {viewMode === "products" && (
          <>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex w-fit rounded-xl border border-slate-200 bg-white/70 p-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                <button
                  type="button"
                  onClick={() => setProductSection("products")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                    productSection === "products"
                      ? "bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950"
                      : "text-slate-600 hover:text-slate-950 dark:text-white/60 dark:hover:text-white"
                  }`}
                >
                  Products
                  <span className="ml-2 rounded-full bg-current/10 px-2 py-0.5 text-xs">
                    {products.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProductSection("drafts");
                    void refreshProductDrafts();
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                    productSection === "drafts"
                      ? "bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950"
                      : "text-slate-600 hover:text-slate-950 dark:text-white/60 dark:hover:text-white"
                  }`}
                >
                  Drafts
                  <span className="ml-2 rounded-full bg-current/10 px-2 py-0.5 text-xs">
                    {productDrafts.length}
                  </span>
                </button>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={openCreateProduct}
                className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-white shadow-lg transition-all hover:from-blue-700 hover:to-cyan-700"
              >
                <Plus className="h-5 w-5" />
                Add Product
              </motion.button>
            </div>

            {productSection === "products" ? (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence>
                    {products?.map((product, index) => (
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

                {products.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-12 text-center"
                  >
                    <Package className="mx-auto mb-4 h-16 w-16 text-slate-300" />
                    <h3 className="mb-2 text-lg font-medium text-neutral-950">
                      No products yet
                    </h3>
                    <p className="text-black">
                      Add your first product to get started
                    </p>
                  </motion.div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                {productDrafts.map((draft) => {
                  const draftProductId = draft.key.replace(/^products:/, "");
                  const isCreateDraft = draftProductId === "create";
                  const sourceProduct = isCreateDraft
                    ? null
                    : products.find(
                        (item) =>
                          String(item._id || item.id) ===
                          String(draftProductId),
                      );
                  const title =
                    draft.value.title?.trim() ||
                    sourceProduct?.title ||
                    "Untitled product";

                  return (
                    <motion.div
                      key={draft.key}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-300">
                          <FilePenLine className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate font-bold text-neutral-950 dark:text-white">
                              {title}
                            </h3>
                            <span className="rounded-full bg-slate-950/5 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-white/70">
                              {isCreateDraft ? "New product" : "Product edit"}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/50">
                            <Clock3 className="h-3.5 w-3.5" />
                            Saved{" "}
                            {new Date(draft.savedAt).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </div>
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
                          onClick={() => void handleDeleteProductDraft(draft)}
                        >
                          Delete draft
                        </LiquidButton>
                      </div>
                    </motion.div>
                  );
                })}

                {productDrafts.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-12 text-center"
                  >
                    <FilePenLine className="mx-auto mb-4 h-16 w-16 text-slate-300" />
                    <h3 className="mb-2 text-lg font-medium text-neutral-950 dark:text-white">
                      No product drafts
                    </h3>
                    <p className="text-black dark:text-white/60">
                      Close a product editor without clearing it and the draft
                      will appear here automatically.
                    </p>
                  </motion.div>
                )}
              </div>
            )}
          </>
        )}

        {viewMode === "categories" && (
          <>
            <div className="flex justify-end mb-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={openCreateCategory}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Add Category
              </motion.button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {categories.map((category, index) => (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass-card p-5 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 h-32">
                        <div className="w-32 h-32 flex-shrink-0 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden">
                          <PhotoCarousel photos={category.photos} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-neutral-950 dark:text-white">
                            {category.title}
                          </h3>
                          {category.description && (
                            <p className="text-sm text-black dark:text-white/60 mt-1 line-clamp-3">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleEditCategory(category)}
                          className="p-2 bg-slate-100 dark:bg-white/10 text-black dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDeleteCategory(category)}
                          className="p-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {categories.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Layers className="w-16 h-16 text-slate-300 dark:text-white/20 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-950 dark:text-white mb-2">
                  No categories yet
                </h3>
                <p className="text-black dark:text-white/60">
                  Add your first category to organize products
                </p>
              </motion.div>
            )}
          </>
        )}

        {viewMode === "subcategories" && (
          <>
            <div className="flex justify-end mb-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={openCreateSubcategory}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Add Subcategory
              </motion.button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {subcategories.map((subcategory, index) => {
                  const category = categories.find(
                    (c) => c.id === subcategory.category_id,
                  );
                  return (
                    <motion.div
                      key={subcategory.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                      className="glass-card p-5 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1 h-32">
                          <div className="w-32 h-32 flex-shrink-0 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden">
                            <PhotoCarousel photos={subcategory.photos} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-neutral-950 dark:text-white">
                              {subcategory.title}
                            </h3>
                            {category && (
                              <p className="text-xs text-slate-500 dark:text-white/60 mt-1">
                                Category: {category.title}
                              </p>
                            )}
                            {subcategory.description && (
                              <p className="text-sm text-black dark:text-white/60 mt-1 line-clamp-3">
                                {subcategory.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleEditSubcategory(subcategory)}
                            className="p-2 bg-slate-100 dark:bg-white/10 text-black dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDeleteSubcategory(subcategory)}
                            className="p-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {subcategories.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Grid3x3 className="w-16 h-16 text-slate-300 dark:text-white/20 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-950 dark:text-white mb-2">
                  No subcategories yet
                </h3>
                <p className="text-black dark:text-white/60">
                  Add subcategories to further organize products
                </p>
              </motion.div>
            )}
          </>
        )}
        {viewMode === "blogs" && (
          <>
            <ProductInnerBlog />
          </>
        )}

        <AnimatePresence>
          {showProductModal && (
            <ResizableFloatingSidebar
              open={showProductModal}
              onClose={closeProductForm}
              title={editingProduct ? "Edit Product" : "Add New Product"}
              subtitle="Drag the left grip to resize."
              widthStorageKey="aquacrm:product-editor-width"
              initialWidth={500}
              minWidth={420}
              maxWidth={960}
            >
              <form onSubmit={handleProductSubmit} className="space-y-4">
                <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3 text-xs font-semibold text-emerald-100">
                  Draft auto-saves locally{productDraft.savedAt ? ` · saved ${new Date(productDraft.savedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}. Closing keeps your work.
                </div>
                <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
                    <div className="col-span-full">
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        Product Title
                      </label>
                      <input
                        type="text"
                        value={productForm.title}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            title: e.target.value,
                          })
                        }
                        required
                        placeholder="e.g. Kent Bathroom Water Softener 5.5L"
                        className="glass-input w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        Brand
                      </label>
                      <input
                        type="text"
                        value={productForm.brand}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            brand: e.target.value,
                          })
                        }
                        placeholder="e.g. Kent"
                        required
                        className="glass-input w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        Slug
                      </label>
                      <input
                        type="text"
                        value={productForm.slug}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            slug: e.target.value,
                          })
                        }
                        placeholder="url-friendly-slug"
                        className="glass-input w-full"
                      />
                    </div>

                    <div className="col-span-full">
                      <RichTextEditor
                        label="Product Description"
                        value={productForm.description}
                        onChange={(description) =>
                          setProductForm((current) => ({
                            ...current,
                            description,
                          }))
                        }
                        placeholder="Write the product description here…"
                        minHeight={300}
                      />
                    </div>

                    <div className="col-span-full space-y-2">
                      <label className="block text-sm font-medium text-black dark:text-white/70">
                        Keywords
                      </label>
                      <input
                        type="text"
                        value={productForm.keywords}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            keywords: e.target.value,
                          })
                        }
                        placeholder="Comma separated keywords"
                        className="glass-input w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        Category
                      </label>
                      <select
                        value={productForm.category_id}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            category_id: e.target.value,
                            subcategory_id: "",
                          })
                        }
                        className="glass-input w-full"
                      >
                        <option value="">Select category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.title}
                          </option>
                        ))}
                      </select>
                      {productForm.category_id && (
                        <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                          Selected:{" "}
                          {categories.find(
                            (category) =>
                              category.id === productForm.category_id,
                          )?.title || "Current category"}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        Subcategory
                      </label>
                      <select
                        value={productForm.subcategory_id}
                        disabled={!productForm.category_id}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            subcategory_id: e.target.value,
                          })
                        }
                        className="glass-input w-full disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select subcategory</option>
                        {subcategories
                          .filter(
                            (sub) =>
                              sub.category_id === productForm.category_id,
                          )
                          .map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.title}
                            </option>
                          ))}
                      </select>
                      {!productForm.category_id ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Choose a category first.
                        </p>
                      ) : productForm.subcategory_id ? (
                        <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                          Selected:{" "}
                          {subcategories.find(
                            (subcategory) =>
                              subcategory.id === productForm.subcategory_id,
                          )?.title || "Current subcategory"}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        Price
                      </label>
                      <input
                        type="number"
                        value={productForm.price || ""}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            price: parseFloat(e.target.value) || 0,
                          })
                        }
                        required
                        min="0"
                        className="glass-input w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        Discount Price
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={productForm.discountPrice || ""}
                          onChange={(e) =>
                            setProductForm({
                              ...productForm,
                              discountPrice: parseFloat(e.target.value) || 0,
                            })
                          }
                          min="0"
                          disabled={!productForm.discountPriceStatus}
                          className="glass-input w-full disabled:opacity-50"
                        />
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={productForm.discountPriceStatus}
                            onChange={(e) =>
                              setProductForm({
                                ...productForm,
                                discountPriceStatus: e.target.checked,
                              })
                            }
                            className="w-5 h-5 accent-blue-600"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        DP Price
                      </label>
                      <input
                        type="number"
                        value={productForm.dpPrice || ""}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            dpPrice: parseFloat(e.target.value) || 0,
                          })
                        }
                        min="0"
                        className="glass-input w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        Stock
                      </label>
                      <input
                        type="number"
                        value={productForm.stock}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            stock: parseInt(e.target.value) || 0,
                          })
                        }
                        min="0"
                        className="glass-input w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        SKU (Optional)
                      </label>
                      <input
                        type="text"
                        value={productForm.sku}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            sku: e.target.value,
                          })
                        }
                        className="glass-input w-full"
                      />
                    </div>

                    <div className="col-span-full">
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        Photo URL (First image is primary)
                      </label>
                      <div className="flex gap-2 mb-2">
                        <label className="flex-1 cursor-pointer">
                          <div className="w-full px-4 py-2 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-center">
                            <p className="text-sm text-black dark:text-white/60">
                              Click to upload photo (max 5MB)
                            </p>
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/jpg, image/webp"
                              className="hidden"
                              onChange={(e) =>
                                handleFileUpload(
                                  e,
                                  productForm.photos,
                                  (photos) =>
                                    setProductForm({ ...productForm, photos }),
                                )
                              }
                            />
                          </div>
                        </label>
                      </div>
                      {productForm.photos.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto py-2">
                          {productForm.photos.map((photo, idx) => (
                            <div key={idx} className="relative group shrink-0">
                              <img
                                src={photo.secure_url}
                                alt="Product"
                                className="w-20 h-20 object-cover rounded-lg border border-gray-400"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setProductForm({
                                    ...productForm,
                                    photos: productForm.photos.filter(
                                      (_, i) => i !== idx,
                                    ),
                                  })
                                }
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="col-span-full border-t border-slate-200 dark:border-white/10 pt-4">
                      <h4 className="font-bold text-neutral-950 dark:text-white mb-3">
                        Google Merchant & product indexing
                      </h4>
                      <p className="text-xs text-slate-500 mb-4">
                        These fields feed Google Shopping/free listings and enrich Product schema for search and AI engines.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="block text-sm font-medium text-black dark:text-white/70">
                          GTIN / barcode
                          <input
                            type="text"
                            value={productForm.gtin}
                            onChange={(e) => setProductForm({ ...productForm, gtin: e.target.value })}
                            className="glass-input w-full mt-2"
                            placeholder="EAN / UPC / GTIN"
                          />
                        </label>
                        <label className="block text-sm font-medium text-black dark:text-white/70">
                          MPN
                          <input
                            type="text"
                            value={productForm.mpn}
                            onChange={(e) => setProductForm({ ...productForm, mpn: e.target.value })}
                            className="glass-input w-full mt-2"
                            placeholder="Manufacturer part number"
                          />
                        </label>
                        <label className="block text-sm font-medium text-black dark:text-white/70">
                          Google product category
                          <input
                            type="text"
                            value={productForm.googleProductCategory}
                            onChange={(e) => setProductForm({ ...productForm, googleProductCategory: e.target.value })}
                            className="glass-input w-full mt-2"
                            placeholder="Google taxonomy ID or path"
                          />
                        </label>
                        <label className="block text-sm font-medium text-black dark:text-white/70">
                          Product type
                          <input
                            type="text"
                            value={productForm.productType}
                            onChange={(e) => setProductForm({ ...productForm, productType: e.target.value })}
                            className="glass-input w-full mt-2"
                            placeholder="Water Treatment > Water Softeners"
                          />
                        </label>
                        <label className="block text-sm font-medium text-black dark:text-white/70">
                          Condition
                          <select
                            value={productForm.condition}
                            onChange={(e) => setProductForm({ ...productForm, condition: e.target.value })}
                            className="glass-input w-full mt-2"
                          >
                            <option value="new">New</option>
                            <option value="refurbished">Refurbished</option>
                            <option value="used">Used</option>
                          </select>
                        </label>
                        <label className="block text-sm font-medium text-black dark:text-white/70">
                          Shipping weight
                          <input
                            type="text"
                            value={productForm.shippingWeight}
                            onChange={(e) => setProductForm({ ...productForm, shippingWeight: e.target.value })}
                            className="glass-input w-full mt-2"
                            placeholder="25 kg"
                          />
                        </label>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-5">
                        <label className="flex items-center gap-2 text-sm font-medium text-black dark:text-white/70">
                          <input
                            type="checkbox"
                            checked={productForm.merchantEnabled}
                            onChange={(e) => setProductForm({ ...productForm, merchantEnabled: e.target.checked })}
                          />
                          Include in Google product feed
                        </label>
                        <label className="flex items-center gap-2 text-sm font-medium text-black dark:text-white/70">
                          <input
                            type="checkbox"
                            checked={productForm.identifierExists}
                            onChange={(e) => setProductForm({ ...productForm, identifierExists: e.target.checked })}
                          />
                          Product has standard identifiers
                        </label>
                      </div>
                    </div>

                    <div className="col-span-full">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={productForm.is_active}
                          onChange={(e) =>
                            setProductForm({
                              ...productForm,
                              is_active: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-black dark:text-white/70">
                          Active Product
                        </span>
                      </label>
                    </div>
                  </div>

                <div className="sticky bottom-0 z-20 -mx-5 mt-6 flex gap-3 border-t border-white/10 bg-slate-950/95 px-5 py-4 backdrop-blur-2xl">
                  <LiquidButton type="submit" variant="primary" className="flex-1">
                    {editingProduct ? "Update Product" : "Add Product"}
                  </LiquidButton>
                  <LiquidButton
                    type="button"
                    variant="soft"
                    onClick={closeProductForm}
                    className="flex-1"
                  >
                    Close
                  </LiquidButton>
                  <LiquidButton
                    type="button"
                    variant="danger"
                    onClick={() => void clearProductForm()}
                    className="flex-1"
                  >
                    Clear draft
                  </LiquidButton>
                </div>
              </form>
            </ResizableFloatingSidebar>
          )}
        </AnimatePresence>

        <ResizableFloatingSidebar
          open={showCategoryModal}
          onClose={closeCategoryForm}
          title={editingCategory ? "Edit Category" : "Add New Category"}
          subtitle="Manage category details, keywords, photos, and description."
          widthStorageKey="aquacrm:category-editor-width"
          initialWidth={500}
          minWidth={420}
          maxWidth={760}
        >
<form onSubmit={handleCategorySubmit} className="space-y-4">
        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3 text-xs font-semibold text-emerald-100">
          Draft auto-saves locally. Closing keeps your work.
        </div>
        <div>
          <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
            Category Title
          </label>
          <input
            type="text"
            value={categoryForm.title}
            onChange={(e) =>
              setCategoryForm({
      ...categoryForm,
      title: e.target.value,
              })
            }
            required
            className="glass-input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
            Keywords
          </label>
          <textarea
            value={categoryForm.keywords}
            onChange={(e) =>
              setCategoryForm({
      ...categoryForm,
      keywords: e.target.value,
              })
            }
            rows={2}
            className="glass-input w-full"
            placeholder="Enter keywords separated by commas"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
            Photos
          </label>
          <div className="flex gap-2 mb-2">
            <label className="flex-1 cursor-pointer">
              <div className="w-full px-4 py-2 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-center">
      <p className="text-sm text-black dark:text-white/60">
        Click to upload photo (max 5MB)
      </p>
      <input
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp"
        className="hidden"
        onChange={(e) =>
          handleFileUpload(
            e,
            categoryForm.photos,
            (photos) =>
              setCategoryForm({ ...categoryForm, photos }),
          )
        }
      />
              </div>
            </label>
          </div>
          {categoryForm.photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto py-2">
              {categoryForm.photos.map((photo, idx) => (
      <div key={idx} className="relative group shrink-0">
        <img
          src={photo.secure_url}
          alt="Category"
          className="w-20 h-20 object-cover rounded-lg border border-gray-400"
        />
        <button
          type="button"
          onClick={() =>
            setCategoryForm({
              ...categoryForm,
              photos: categoryForm.photos.filter(
                (_, i) => i !== idx,
              ),
            })
          }
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
            Description
          </label>
          <textarea
            value={categoryForm.description}
            onChange={(e) =>
              setCategoryForm({
      ...categoryForm,
      description: e.target.value,
              })
            }
            rows={3}
            className="glass-input w-full"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-medium"
          >
            {editingCategory ? "Update Category" : "Add Category"}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={closeCategoryForm}
            className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-black dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors font-medium"
          >
            Close
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => void clearCategoryForm()}
            className="flex-1 py-3 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors font-medium"
          >
            Clear draft
          </motion.button>
        </div>
      </form>
        </ResizableFloatingSidebar>

        <ResizableFloatingSidebar
          open={showSubcategoryModal}
          onClose={closeSubcategoryForm}
          title={editingSubcategory ? "Edit Subcategory" : "Add New Subcategory"}
          subtitle="Manage parent category, keywords, photos, and description."
          widthStorageKey="aquacrm:subcategory-editor-width"
          initialWidth={500}
          minWidth={420}
          maxWidth={760}
        >
<form onSubmit={handleSubcategorySubmit} className="space-y-4">
        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3 text-xs font-semibold text-emerald-100">
          Draft auto-saves locally. Closing keeps your work.
        </div>
        <div>
          <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
            Parent Category
          </label>
          <select
            value={subcategoryForm.category_id}
            onChange={(e) =>
              setSubcategoryForm({
      ...subcategoryForm,
      category_id: e.target.value,
              })
            }
            required
            className="glass-input w-full"
          >
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
      {cat.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
            Subcategory Title
          </label>
          <input
            type="text"
            value={subcategoryForm.title}
            onChange={(e) =>
              setSubcategoryForm({
      ...subcategoryForm,
      title: e.target.value,
              })
            }
            required
            className="glass-input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
            Keywords
          </label>
          <textarea
            value={subcategoryForm.keywords}
            onChange={(e) =>
              setSubcategoryForm({
      ...subcategoryForm,
      keywords: e.target.value,
              })
            }
            rows={2}
            className="glass-input w-full"
            placeholder="Enter keywords separated by commas"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
            Photos
          </label>
          <div className="flex gap-2 mb-2">
            <label className="flex-1 cursor-pointer">
              <div className="w-full px-4 py-2 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-center">
      <p className="text-sm text-black dark:text-white/60">
        Click to upload photo (max 5MB)
      </p>
      <input
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp"
        className="hidden"
        onChange={(e) =>
          handleFileUpload(
            e,
            subcategoryForm.photos,
            (photos) =>
              setSubcategoryForm({
                ...subcategoryForm,
                photos,
              }),
          )
        }
      />
              </div>
            </label>
          </div>
          {subcategoryForm.photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto py-2">
              {subcategoryForm.photos.map((photo, idx) => (
      <div key={idx} className="relative group shrink-0">
        <img
          src={photo.secure_url}
          alt="Subcategory"
          className="w-20 h-20 object-cover rounded-lg border border-gray-400"
        />
        <button
          type="button"
          onClick={() =>
            setSubcategoryForm({
              ...subcategoryForm,
              photos: subcategoryForm.photos.filter(
                (_, i) => i !== idx,
              ),
            })
          }
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
            Description
          </label>
          <textarea
            value={subcategoryForm.description}
            onChange={(e) =>
              setSubcategoryForm({
      ...subcategoryForm,
      description: e.target.value,
              })
            }
            rows={3}
            className="glass-input w-full"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-medium"
          >
            {editingSubcategory
              ? "Update Subcategory"
              : "Add Subcategory"}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={closeSubcategoryForm}
            className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-black dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors font-medium"
          >
            Close
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => void clearSubcategoryForm()}
            className="flex-1 py-3 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors font-medium"
          >
            Clear draft
          </motion.button>
        </div>
      </form>
        </ResizableFloatingSidebar>
      </TabInnerContent>
    </div>
  );
}
