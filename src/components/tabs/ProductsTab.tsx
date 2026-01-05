import { useState, useEffect } from "react";
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
  BookOpen,
} from "lucide-react";
import ProductCard from "../modular/products/productCard";
import TabInnerContent from "../Layout/tabInnerlayout";
import ProductInnerBlog from "../modular/products/tabInnerContent/ProductInnerBlog";

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

type ViewMode = "products" | "categories" | "subcategories" | "blogs";

export default function ProductsTab() {
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("products");
  const [products, setProducts] = useState<Product[]>([]);
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
        resetProductForm();
      } else if (showCategoryModal) {
        resetCategoryForm();
      } else if (showSubcategoryModal) {
        resetSubcategoryForm();
      }
    },
    showProductModal || showCategoryModal || showSubcategoryModal,
  );

  useEffect(() => {
    fetchAll();
  }, []);

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
      setProducts(data?.data);
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await categoriesService.getAll();

    if (!error && data) {
      // Map API response to match interface if needed
      const mappedCategories = data?.data?.map((cat: any) => ({
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
      const mappedSubcategories = data?.data?.map((sub: any) => ({
        ...sub,
        id: sub._id || sub.id,
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

    const productData = {
      ...productForm,
      category_id: productForm.category_id || null,
      subcategory_id: productForm.subcategory_id || null,
      user_id: user?.id,
    };

    try {
      if (editingProduct) {
        const { error } = await productsService.update(
          editingProduct?._id,
          productData,
        );

        if (error) throw error;

        showToast("Product updated successfully", "success");
        fetchProducts();
        resetProductForm();
      } else {
        const { error } = await productsService.create(productData);

        if (error) throw error;

        showToast("Product created successfully", "success");
        fetchProducts();
        resetProductForm();
      }
    } catch (error) {
      showToast("Failed to save product", "error");
    }
  };

  const handleCategorySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const categoryData = {
      ...categoryForm,
      user_id: user?.id,
    };

    try {
      if (editingCategory) {
        const { error } = await categoriesService.update(
          editingCategory.id,
          categoryData,
        );

        if (error) throw error;

        showToast("Category updated successfully", "success");
        fetchCategories();
        resetCategoryForm();
      } else {
        const { error } = await categoriesService.create(categoryData);

        if (error) throw error;

        showToast("Category created successfully", "success");
        fetchCategories();
        resetCategoryForm();
      }
    } catch (error) {
      showToast("Failed to save category", "error");
    }
  };

  const handleSubcategorySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const subcategoryData = {
      ...subcategoryForm,
      user_id: user?.id,
    };

    try {
      if (editingSubcategory) {
        const { error } = await subcategoriesService.update(
          editingSubcategory.id,
          subcategoryData,
        );

        if (error) throw error;

        showToast("Subcategory updated successfully", "success");
        fetchSubcategories();
        resetSubcategoryForm();
      } else {
        const { error } = await subcategoriesService.create(subcategoryData);

        if (error) throw error;

        showToast("Subcategory created successfully", "success");
        fetchSubcategories();
        resetSubcategoryForm();
      }
    } catch (error) {
      showToast("Failed to save subcategory", "error");
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (
      confirm(
        `Are you sure you want to delete Product: "${product.title}" (ID: ${product.id})?`,
      )
    ) {
      try {
        const { error } = await productsService.delete(product.id);

        if (error) throw error;

        showToast("Product deleted successfully", "success");
        fetchProducts();
      } catch (error) {
        showToast("Failed to delete product", "error");
      }
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

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      title: product.title || "", // Fallback if migrating
      description: product.description || "",
      sku: product.sku || "",
      price: product.price || 0,
      discountPrice: product.discountPrice || 0,
      dpPrice: product.dpPrice || 0,
      discountPriceStatus: product.discountPriceStatus || false,
      discountPricePercentage: product.discountPricePercentage || 0,
      photos: product.photos || [],
      category: product.category || "",
      stock: product.stock || 0,
      brand: product.brand || "",
      ratings: product.ratings || 0,
      numberOfReviews: product.numberOfReviews || 0,
      slug: product.slug || "",
      keywords: product.keywords || "",
      is_active: product.is_active,
      category_id: product.category_id || "",
      subcategory_id: product.subcategory_id || "",
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
    setCategoryForm({
      title: "",
      description: "",
      keywords: "",
      photos: [],
    });
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
        <div className="flex gap-2 mb-6 bg-slate-100 dark:bg-white/10 p-1 rounded-xl w-fit">
          <button
            onClick={() => setViewMode("products")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "products"
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Products
          </button>
          <button
            onClick={() => setViewMode("categories")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "categories"
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4 inline mr-2" />
            Categories
          </button>
          <button
            onClick={() => setViewMode("subcategories")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "subcategories"
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Grid3x3 className="w-4 h-4 inline mr-2" />
            Subcategories
          </button>
          <button
            onClick={() => setViewMode("blogs")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "subcategories"
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <BookOpen className="w-4 h-4 inline mr-2" />
            Blogs
          </button>
        </div>

        {viewMode === "products" && (
          <>
            <div className="flex justify-end mb-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowProductModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Add Product
              </motion.button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                className="text-center py-12"
              >
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-950 mb-2">
                  No products yet
                </h3>
                <p className="text-black">
                  Add your first product to get started
                </p>
              </motion.div>
            )}
          </>
        )}

        {viewMode === "categories" && (
          <>
            <div className="flex justify-end mb-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCategoryModal(true)}
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
                onClick={() => setShowSubcategoryModal(true)}
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 overlay-blur flex items-center justify-center z-50 p-4"
              onClick={resetProductForm}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-card shadow-2xl max-w-3xl w-full max-h-[90vh] !overflow-y-auto p-8 border-white/20 dark:border-white/10"
              >
                <h3 className="text-2xl font-bold text-neutral-950 dark:text-white mb-6">
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </h3>

                <form onSubmit={handleProductSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
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

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        Description (HTML supported)
                      </label>
                      <textarea
                        value={productForm.description}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            description: e.target.value,
                          })
                        }
                        rows={4}
                        className="glass-input w-full font-mono text-sm"
                      />
                    </div>

                    <div className="col-span-2 space-y-2">
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
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                        Subcategory
                      </label>
                      <select
                        value={productForm.subcategory_id}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            subcategory_id: e.target.value,
                          })
                        }
                        className="glass-input w-full"
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

                    <div className="col-span-2">
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

                    <div className="col-span-2">
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

                  <div className="flex gap-3 pt-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-medium"
                    >
                      {editingProduct ? "Update Product" : "Add Product"}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={resetProductForm}
                      className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-black dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors font-medium"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCategoryModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 overlay-blur flex items-center justify-center z-50 p-4"
              onClick={resetCategoryForm}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-card shadow-2xl max-w-md w-full max-h-[90vh] !overflow-y-auto p-8 border-white/20 dark:border-white/10"
              >
                <h3 className="text-2xl font-bold text-neutral-950 dark:text-white mb-6">
                  {editingCategory ? "Edit Category" : "Add New Category"}
                </h3>

                <form onSubmit={handleCategorySubmit} className="space-y-4">
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
                      onClick={resetCategoryForm}
                      className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-black dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors font-medium"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSubcategoryModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 overlay-blur flex items-center justify-center z-50 p-4"
              onClick={resetSubcategoryForm}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-card shadow-2xl max-w-md w-full max-h-[90vh] !overflow-y-auto p-8 border-white/20 dark:border-white/10"
              >
                <h3 className="text-2xl font-bold text-neutral-950 dark:text-white mb-6">
                  {editingSubcategory
                    ? "Edit Subcategory"
                    : "Add New Subcategory"}
                </h3>

                <form onSubmit={handleSubcategorySubmit} className="space-y-4">
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
                      onClick={resetSubcategoryForm}
                      className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-black dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors font-medium"
                    >
                      Cancel
                    </motion.button>
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
