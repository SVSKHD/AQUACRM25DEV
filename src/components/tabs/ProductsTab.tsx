import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Edit2, Grid3x3, Layers, Package, Plus, Trash2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
import {
  categoriesService,
  productsService,
  subcategoriesService,
} from "../../services/apiService";
import TabInnerContent from "../Layout/tabInnerlayout";
import { PhotoCarousel, ProductPhoto } from "../modular/products/PhotoCarousel";
import ProductCard, { Product } from "../modular/products/productCard";
import ProductInnerBlog from "../modular/products/tabInnerContent/ProductInnerBlog";
import { useToast } from "../Toast";
import RichTextEditor from "../ui/RichTextEditor";

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

type PhotoUploadFieldProps = {
  label: string;
  photos: ProductPhoto[];
  alt: string;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
};

const PhotoUploadField = ({
  label,
  photos,
  alt,
  onUpload,
  onRemove,
}: PhotoUploadFieldProps) => (
  <div>
    <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">
      {label}
    </label>
    <label className="block cursor-pointer">
      <div className="w-full rounded-lg border-2 border-dashed border-slate-300 px-4 py-2 text-center transition-all hover:border-blue-500 hover:bg-slate-50 dark:border-white/10 dark:hover:border-blue-400 dark:hover:bg-white/5">
        <p className="text-sm text-black dark:text-white/60">
          Click to upload photo (max 5MB)
        </p>
        <input
          type="file"
          accept="image/png, image/jpeg, image/jpg, image/webp"
          className="hidden"
          onChange={onUpload}
        />
      </div>
    </label>
    {photos.length > 0 && (
      <div className="flex gap-2 overflow-x-auto py-2">
        {photos.map((photo, index) => (
          <div key={`${photo.id || photo.secure_url}-${index}`} className="group relative shrink-0">
            <img
              src={photo.secure_url}
              alt={alt}
              className="h-20 w-20 rounded-lg border border-gray-400 object-cover"
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
              aria-label={`Remove ${alt.toLowerCase()} photo`}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
);

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

export type ProductViewMode =
  | "products"
  | "categories"
  | "subcategories"
  | "blogs";

type ProductsTabProps = {
  viewMode: ProductViewMode;
};

export default function ProductsTab({ viewMode }: ProductsTabProps) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [loading, setLoading] = useState(true);

  const [productForm, setProductForm] = useState({
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
    is_active: true,
    category_id: "",
    subcategory_id: "",
  });

  const [categoryForm, setCategoryForm] = useState({
    title: "",
    description: "",
    keywords: "",
    photos: [] as ProductPhoto[],
  });

  const [subcategoryForm, setSubcategoryForm] = useState({
    category_id: "",
    title: "",
    description: "",
    keywords: "",
    photos: [] as ProductPhoto[],
  });

  const uploadPhoto = (
    event: React.ChangeEvent<HTMLInputElement>,
    currentPhotos: ProductPhoto[],
    updatePhotos: (photos: ProductPhoto[]) => void,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("File size should be less than 5MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      updatePhotos([
        ...currentPhotos,
        {
          id: Math.random().toString(36).slice(2, 11),
          secure_url: reader.result as string,
        },
      ]);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const fetchProducts = async () => {
    const { data, error } = await productsService.getAll();
    if (error || !data) return;

    const mappedProducts = (Array.isArray(data?.data) ? data.data : []).map(
      (product: any) => {
        const categoryReference = product.category ?? product.category_id;
        const subcategoryReference =
          product.subCategory ?? product.subcategory ?? product.subcategory_id;
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
  };

  const fetchCategories = async () => {
    const { data, error } = await categoriesService.getAll();
    if (error || !data) return;
    setCategories(
      (data?.data || []).map((category: any) => ({
        ...category,
        id: category._id || category.id,
        title: category.title || category.name,
        photos: Array.isArray(category.photos)
          ? category.photos.map((photo: any) =>
              typeof photo === "string"
                ? { id: Math.random().toString(), secure_url: photo }
                : photo,
            )
          : [],
        keywords: category.keywords || "",
      })),
    );
  };

  const fetchSubcategories = async () => {
    const { data, error } = await subcategoriesService.getAll();
    if (error || !data) return;
    setSubcategories(
      (data?.data || []).map((subcategory: any) => ({
        ...subcategory,
        id: subcategory._id || subcategory.id,
        category_id: getReferenceId(
          subcategory.category ?? subcategory.category_id,
        ),
        title: subcategory.title || subcategory.name,
        photos: Array.isArray(subcategory.photos)
          ? subcategory.photos.map((photo: any) =>
              typeof photo === "string"
                ? { id: Math.random().toString(), secure_url: photo }
                : photo,
            )
          : [],
        keywords: subcategory.keywords || "",
      })),
    );
  };

  const fetchAll = async () => {
    await Promise.all([fetchProducts(), fetchCategories(), fetchSubcategories()]);
    setLoading(false);
  };

  useEffect(() => {
    void fetchAll();
  }, []);

  const resetProductForm = () => {
    setProductForm({
      title: "",
      description: "",
      sku: "",
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
      is_active: true,
      category_id: "",
      subcategory_id: "",
    });
    setEditingProduct(null);
    setShowProductModal(false);
  };

  const resetCategoryForm = () => {
    setCategoryForm({ title: "", description: "", keywords: "", photos: [] });
    setEditingCategory(null);
    setShowCategoryModal(false);
  };

  const resetSubcategoryForm = () => {
    setSubcategoryForm({
      category_id: "",
      title: "",
      description: "",
      keywords: "",
      photos: [],
    });
    setEditingSubcategory(null);
    setShowSubcategoryModal(false);
  };

  useKeyboardShortcut(
    "Escape",
    () => {
      if (showProductModal) resetProductForm();
      else if (showCategoryModal) resetCategoryForm();
      else if (showSubcategoryModal) resetSubcategoryForm();
    },
    showProductModal || showCategoryModal || showSubcategoryModal,
  );

  const handleProductSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const productData = {
      ...productForm,
      category: productForm.category_id || null,
      subCategory: productForm.subcategory_id || null,
      category_id: productForm.category_id || null,
      subcategory_id: productForm.subcategory_id || null,
      user_id: user?.id,
    };

    try {
      const result = editingProduct
        ? await productsService.update(editingProduct._id || editingProduct.id, productData)
        : await productsService.create(productData);
      if (result.error) throw result.error;
      showToast(
        editingProduct ? "Product updated successfully" : "Product created successfully",
        "success",
      );
      await fetchProducts();
      resetProductForm();
    } catch {
      showToast("Failed to save product", "error");
    }
  };

  const handleCategorySubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    try {
      const payload = { ...categoryForm, user_id: user?.id };
      const result = editingCategory
        ? await categoriesService.update(editingCategory.id, payload)
        : await categoriesService.create(payload);
      if (result.error) throw result.error;
      showToast(
        editingCategory ? "Category updated successfully" : "Category created successfully",
        "success",
      );
      await fetchCategories();
      resetCategoryForm();
    } catch {
      showToast("Failed to save category", "error");
    }
  };

  const handleSubcategorySubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    try {
      const payload = {
        ...subcategoryForm,
        category: subcategoryForm.category_id,
        user_id: user?.id,
      };
      const result = editingSubcategory
        ? await subcategoriesService.update(editingSubcategory.id, payload)
        : await subcategoriesService.create(payload);
      if (result.error) throw result.error;
      showToast(
        editingSubcategory
          ? "Subcategory updated successfully"
          : "Subcategory created successfully",
        "success",
      );
      await fetchSubcategories();
      resetSubcategoryForm();
    } catch {
      showToast("Failed to save subcategory", "error");
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete Product: "${product.title}"?`)) return;
    const { error } = await productsService.delete(product._id || product.id);
    if (error) showToast("Failed to delete product", "error");
    else {
      showToast("Product deleted successfully", "success");
      await fetchProducts();
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!confirm(`Are you sure you want to delete Category: "${category.title}"?`)) return;
    const { error } = await categoriesService.delete(category.id);
    if (error) showToast("Failed to delete category", "error");
    else {
      showToast("Category deleted successfully", "success");
      await fetchCategories();
    }
  };

  const handleDeleteSubcategory = async (subcategory: Subcategory) => {
    if (!confirm(`Are you sure you want to delete Subcategory: "${subcategory.title}"?`)) return;
    const { error } = await subcategoriesService.delete(subcategory.id);
    if (error) showToast("Failed to delete subcategory", "error");
    else {
      showToast("Subcategory deleted successfully", "success");
      await fetchSubcategories();
    }
  };

  const handleEditProduct = (product: Product) => {
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

    setEditingProduct(product);
    setProductForm({
      title: product.title || "",
      description: product.description || "",
      sku: product.sku || "",
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
    });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const filteredSubcategories = subcategories.filter(
    (subcategory) => subcategory.category_id === productForm.category_id,
  );

  return (
    <div>
      <TabInnerContent
        title="Product Management"
        description="Manage products, categories, and subcategories"
      >
        {viewMode === "products" && (
          <>
            <div className="mb-4 flex justify-end">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowProductModal(true)}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-white shadow-lg transition-all hover:from-blue-700 hover:to-cyan-700"
              >
                <Plus className="h-5 w-5" /> Add Product
              </motion.button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {products.map((product, index) => (
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
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center">
                <Package className="mx-auto mb-4 h-16 w-16 text-slate-300" />
                <h3 className="mb-2 text-lg font-medium text-neutral-950">No products yet</h3>
                <p className="text-black">Add your first product to get started</p>
              </motion.div>
            )}
          </>
        )}

        {viewMode === "categories" && (
          <>
            <div className="mb-4 flex justify-end">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCategoryModal(true)}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-white shadow-lg transition-all hover:from-blue-700 hover:to-cyan-700"
              >
                <Plus className="h-5 w-5" /> Add Category
              </motion.button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                      <div className="flex h-32 flex-1 items-start gap-3">
                        <div className="h-32 w-32 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5">
                          <PhotoCarousel photos={category.photos} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-neutral-950 dark:text-white">{category.title}</h3>
                          {category.description && (
                            <p className="mt-1 line-clamp-3 text-sm text-black dark:text-white/60">{category.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleEditCategory(category)} className="rounded-lg bg-slate-100 p-2 text-black dark:bg-white/10 dark:text-white"><Edit2 className="h-4 w-4" /></button>
                        <button type="button" onClick={() => void handleDeleteCategory(category)} className="rounded-lg bg-red-50 p-2 text-red-600 dark:bg-red-500/10 dark:text-red-400"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {categories.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center">
                <Layers className="mx-auto mb-4 h-16 w-16 text-slate-300 dark:text-white/20" />
                <h3 className="mb-2 text-lg font-medium text-neutral-950 dark:text-white">No categories yet</h3>
                <p className="text-black dark:text-white/60">Add your first category to organize products</p>
              </motion.div>
            )}
          </>
        )}

        {viewMode === "subcategories" && (
          <>
            <div className="mb-4 flex justify-end">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSubcategoryModal(true)}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-white shadow-lg transition-all hover:from-blue-700 hover:to-cyan-700"
              >
                <Plus className="h-5 w-5" /> Add Subcategory
              </motion.button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <AnimatePresence>
                {subcategories.map((subcategory, index) => {
                  const category = categories.find((item) => item.id === subcategory.category_id);
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
                        <div className="flex h-32 flex-1 items-start gap-3">
                          <div className="h-32 w-32 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5">
                            <PhotoCarousel photos={subcategory.photos} />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-neutral-950 dark:text-white">{subcategory.title}</h3>
                            {category && <p className="mt-1 text-xs text-slate-500 dark:text-white/60">Category: {category.title}</p>}
                            {subcategory.description && <p className="mt-1 line-clamp-3 text-sm text-black dark:text-white/60">{subcategory.description}</p>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleEditSubcategory(subcategory)} className="rounded-lg bg-slate-100 p-2 text-black dark:bg-white/10 dark:text-white"><Edit2 className="h-4 w-4" /></button>
                          <button type="button" onClick={() => void handleDeleteSubcategory(subcategory)} className="rounded-lg bg-red-50 p-2 text-red-600 dark:bg-red-500/10 dark:text-red-400"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            {subcategories.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center">
                <Grid3x3 className="mx-auto mb-4 h-16 w-16 text-slate-300 dark:text-white/20" />
                <h3 className="mb-2 text-lg font-medium text-neutral-950 dark:text-white">No subcategories yet</h3>
                <p className="text-black dark:text-white/60">Add subcategories to further organize products</p>
              </motion.div>
            )}
          </>
        )}

        {viewMode === "blogs" && <ProductInnerBlog />}

        <AnimatePresence>
          {showProductModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 overlay-blur"
              onClick={resetProductForm}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(event) => event.stopPropagation()}
                className="glass-card max-h-[90vh] w-full max-w-4xl !overflow-y-auto border-white/20 p-8 shadow-2xl dark:border-white/10"
              >
                <h3 className="mb-6 text-2xl font-bold text-neutral-950 dark:text-white">
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </h3>
                <form onSubmit={handleProductSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">Product Title</label>
                      <input type="text" value={productForm.title} onChange={(event) => setProductForm({ ...productForm, title: event.target.value })} required placeholder="e.g. Kent Bathroom Water Softener 5.5L" className="glass-input w-full" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">Brand</label>
                      <input type="text" value={productForm.brand} onChange={(event) => setProductForm({ ...productForm, brand: event.target.value })} placeholder="e.g. Kent" className="glass-input w-full" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">Slug</label>
                      <input type="text" value={productForm.slug} onChange={(event) => setProductForm({ ...productForm, slug: event.target.value })} placeholder="url-friendly-slug" className="glass-input w-full" />
                    </div>
                    <div className="col-span-2">
                      <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">Product Description</label>
                      <RichTextEditor
                        value={productForm.description}
                        onChange={(description) => setProductForm((current) => ({ ...current, description }))}
                        placeholder="Write the product description, benefits, specifications and usage details..."
                        minHeight={260}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">Keywords</label>
                      <input type="text" value={productForm.keywords} onChange={(event) => setProductForm({ ...productForm, keywords: event.target.value })} placeholder="Comma separated keywords" className="glass-input w-full" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">Category</label>
                      <select value={productForm.category_id} onChange={(event) => setProductForm({ ...productForm, category_id: event.target.value, subcategory_id: "" })} className="glass-input w-full">
                        <option value="">Select category</option>
                        {categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}
                      </select>
                      {productForm.category_id && (
                        <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                          Selected: {categories.find((category) => category.id === productForm.category_id)?.title || "Current category"}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">Subcategory</label>
                      <select value={productForm.subcategory_id} disabled={!productForm.category_id} onChange={(event) => setProductForm({ ...productForm, subcategory_id: event.target.value })} className="glass-input w-full disabled:cursor-not-allowed disabled:opacity-50">
                        <option value="">Select subcategory</option>
                        {filteredSubcategories.map((subcategory) => <option key={subcategory.id} value={subcategory.id}>{subcategory.title}</option>)}
                      </select>
                      {!productForm.category_id ? (
                        <p className="mt-1 text-xs text-slate-500">Choose a category first.</p>
                      ) : productForm.subcategory_id ? (
                        <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                          Selected: {subcategories.find((subcategory) => subcategory.id === productForm.subcategory_id)?.title || "Current subcategory"}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">Price</label>
                      <input type="number" value={productForm.price || ""} onChange={(event) => setProductForm({ ...productForm, price: parseFloat(event.target.value) || 0 })} required min="0" className="glass-input w-full" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">Discount Price</label>
                      <div className="flex gap-2">
                        <input type="number" value={productForm.discountPrice || ""} onChange={(event) => setProductForm({ ...productForm, discountPrice: parseFloat(event.target.value) || 0 })} min="0" disabled={!productForm.discountPriceStatus} className="glass-input w-full disabled:opacity-50" />
                        <input type="checkbox" checked={productForm.discountPriceStatus} onChange={(event) => setProductForm({ ...productForm, discountPriceStatus: event.target.checked })} className="h-5 w-5 self-center accent-blue-600" aria-label="Enable discount price" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">DP Price</label>
                      <input type="number" value={productForm.dpPrice || ""} onChange={(event) => setProductForm({ ...productForm, dpPrice: parseFloat(event.target.value) || 0 })} min="0" className="glass-input w-full" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">Stock</label>
                      <input type="number" value={productForm.stock} onChange={(event) => setProductForm({ ...productForm, stock: parseInt(event.target.value, 10) || 0 })} min="0" className="glass-input w-full" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">SKU (Optional)</label>
                      <input type="text" value={productForm.sku} onChange={(event) => setProductForm({ ...productForm, sku: event.target.value })} className="glass-input w-full" />
                    </div>
                    <div className="col-span-2">
                      <PhotoUploadField
                        label="Photo URL (First image is primary)"
                        photos={productForm.photos}
                        alt="Product"
                        onUpload={(event) => uploadPhoto(event, productForm.photos, (photos) => setProductForm((current) => ({ ...current, photos })))}
                        onRemove={(index) => setProductForm((current) => ({ ...current, photos: current.photos.filter((_, photoIndex) => photoIndex !== index) }))}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={productForm.is_active} onChange={(event) => setProductForm({ ...productForm, is_active: event.target.checked })} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm font-medium text-black dark:text-white/70">Active Product</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="submit" className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 py-3 font-medium text-white transition-all hover:from-blue-700 hover:to-cyan-700">
                      {editingProduct ? "Update Product" : "Add Product"}
                    </button>
                    <button type="button" onClick={resetProductForm} className="flex-1 rounded-lg bg-slate-100 py-3 font-medium text-black transition-colors hover:bg-slate-200 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">Cancel</button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCategoryModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 overlay-blur" onClick={resetCategoryForm}>
              <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} onClick={(event) => event.stopPropagation()} className="glass-card max-h-[90vh] w-full max-w-md !overflow-y-auto border-white/20 p-8 shadow-2xl dark:border-white/10">
                <h3 className="mb-6 text-2xl font-bold text-neutral-950 dark:text-white">{editingCategory ? "Edit Category" : "Add New Category"}</h3>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">Category Title</label>
                    <input type="text" value={categoryForm.title} onChange={(event) => setCategoryForm({ ...categoryForm, title: event.target.value })} required className="glass-input w-full" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">Keywords</label>
                    <textarea value={categoryForm.keywords} onChange={(event) => setCategoryForm({ ...categoryForm, keywords: event.target.value })} rows={2} className="glass-input w-full" placeholder="Enter keywords separated by commas" />
                  </div>
                  <PhotoUploadField
                    label="Photos"
                    photos={categoryForm.photos}
                    alt="Category"
                    onUpload={(event) => uploadPhoto(event, categoryForm.photos, (photos) => setCategoryForm((current) => ({ ...current, photos })))}
                    onRemove={(index) => setCategoryForm((current) => ({ ...current, photos: current.photos.filter((_, photoIndex) => photoIndex !== index) }))}
                  />
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">Description</label>
                    <textarea value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} rows={3} className="glass-input w-full" />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="submit" className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 py-3 font-medium text-white transition-all hover:from-blue-700 hover:to-cyan-700">{editingCategory ? "Update Category" : "Add Category"}</button>
                    <button type="button" onClick={resetCategoryForm} className="flex-1 rounded-lg bg-slate-100 py-3 font-medium text-black dark:bg-white/5 dark:text-white">Cancel</button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSubcategoryModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 overlay-blur" onClick={resetSubcategoryForm}>
              <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} onClick={(event) => event.stopPropagation()} className="glass-card max-h-[90vh] w-full max-w-md !overflow-y-auto border-white/20 p-8 shadow-2xl dark:border-white/10">
                <h3 className="mb-6 text-2xl font-bold text-neutral-950 dark:text-white">{editingSubcategory ? "Edit Subcategory" : "Add New Subcategory"}</h3>
                <form onSubmit={handleSubcategorySubmit} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">Parent Category</label>
                    <select value={subcategoryForm.category_id} onChange={(event) => setSubcategoryForm({ ...subcategoryForm, category_id: event.target.value })} required className="glass-input w-full">
                      <option value="">Select category</option>
                      {categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">Subcategory Title</label>
                    <input type="text" value={subcategoryForm.title} onChange={(event) => setSubcategoryForm({ ...subcategoryForm, title: event.target.value })} required className="glass-input w-full" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">Keywords</label>
                    <textarea value={subcategoryForm.keywords} onChange={(event) => setSubcategoryForm({ ...subcategoryForm, keywords: event.target.value })} rows={2} className="glass-input w-full" placeholder="Enter keywords separated by commas" />
                  </div>
                  <PhotoUploadField
                    label="Photos"
                    photos={subcategoryForm.photos}
                    alt="Subcategory"
                    onUpload={(event) => uploadPhoto(event, subcategoryForm.photos, (photos) => setSubcategoryForm((current) => ({ ...current, photos })))}
                    onRemove={(index) => setSubcategoryForm((current) => ({ ...current, photos: current.photos.filter((_, photoIndex) => photoIndex !== index) }))}
                  />
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">Description</label>
                    <textarea value={subcategoryForm.description} onChange={(event) => setSubcategoryForm({ ...subcategoryForm, description: event.target.value })} rows={3} className="glass-input w-full" />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="submit" className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 py-3 font-medium text-white transition-all hover:from-blue-700 hover:to-cyan-700">{editingSubcategory ? "Update Subcategory" : "Add Subcategory"}</button>
                    <button type="button" onClick={resetSubcategoryForm} className="flex-1 rounded-lg bg-slate-100 py-3 font-medium text-black dark:bg-white/5 dark:text-white">Cancel</button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </TabInnerContent>
    </div>
  );
}
