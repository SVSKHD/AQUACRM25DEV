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
import {
  Plus,
  Edit2,
  Trash2,
  Package,
  Tag,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Layers,
  Grid3x3,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  price: number;
  cost_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  category_id: string | null;
  subcategory_id: string | null;
  image_url: string | null;
  categories?: { name: string };
  subcategories?: { name: string };
}

type ViewMode = "products" | "categories" | "subcategories";

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
    name: "",
    description: "",
    sku: "",
    price: 0,
    cost_price: 0,
    stock_quantity: 0,
    low_stock_threshold: 10,
    is_active: true,
    category_id: "",
    subcategory_id: "",
    image_url: "",
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
  });

  const [subcategoryForm, setSubcategoryForm] = useState({
    category_id: "",
    name: "",
    description: "",
  });

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
      setProducts(data);
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await categoriesService.getAll();

    if (!error && data) {
      setCategories(data);
    }
  };

  const fetchSubcategories = async () => {
    const { data, error } = await subcategoriesService.getAll();

    if (!error && data) {
      setSubcategories(data);
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
          editingProduct.id,
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

  const handleDeleteProduct = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        const { error } = await productsService.delete(id);

        if (error) throw error;

        showToast("Product deleted successfully", "success");
        fetchProducts();
      } catch (error) {
        showToast("Failed to delete product", "error");
      }
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      try {
        const { error } = await categoriesService.delete(id);

        if (error) throw error;

        showToast("Category deleted successfully", "success");
        fetchCategories();
      } catch (error) {
        showToast("Failed to delete category", "error");
      }
    }
  };

  const handleDeleteSubcategory = async (id: string) => {
    if (confirm("Are you sure you want to delete this subcategory?")) {
      try {
        const { error } = await subcategoriesService.delete(id);

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
      name: product.name,
      description: product.description || "",
      sku: product.sku || "",
      price: product.price,
      cost_price: product.cost_price,
      stock_quantity: product.stock_quantity,
      low_stock_threshold: product.low_stock_threshold,
      is_active: product.is_active,
      category_id: product.category_id || "",
      subcategory_id: product.subcategory_id || "",
      image_url: product.image_url || "",
    });
    setShowProductModal(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || "",
    });
    setShowCategoryModal(true);
  };

  const handleEditSubcategory = (subcategory: Subcategory) => {
    setEditingSubcategory(subcategory);
    setSubcategoryForm({
      category_id: subcategory.category_id,
      name: subcategory.name,
      description: subcategory.description || "",
    });
    setShowSubcategoryModal(true);
  };

  const resetProductForm = () => {
    setProductForm({
      name: "",
      description: "",
      sku: "",
      price: 0,
      cost_price: 0,
      stock_quantity: 0,
      low_stock_threshold: 10,
      is_active: true,
      category_id: "",
      subcategory_id: "",
      image_url: "",
    });
    setEditingProduct(null);
    setShowProductModal(false);
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: "",
      description: "",
    });
    setEditingCategory(null);
    setShowCategoryModal(false);
  };

  const resetSubcategoryForm = () => {
    setSubcategoryForm({
      category_id: "",
      name: "",
      description: "",
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Product Management
          </h2>
          <p className="text-slate-600 mt-1">
            Manage products, categories, and subcategories
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setViewMode("products")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            viewMode === "products"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Package className="w-4 h-4 inline mr-2" />
          Products
        </button>
        <button
          onClick={() => setViewMode("categories")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            viewMode === "categories"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Layers className="w-4 h-4 inline mr-2" />
          Categories
        </button>
        <button
          onClick={() => setViewMode("subcategories")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            viewMode === "subcategories"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Grid3x3 className="w-4 h-4 inline mr-2" />
          Subcategories
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
              {products?.data?.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white border rounded-xl p-5 hover:shadow-lg transition-all ${
                    !product.is_active ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-lg">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleEditProduct(product)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>

                  <h3 className="font-bold text-lg text-slate-900 mb-1">
                    {product.name}
                  </h3>

                  <div className="space-y-2 mb-3">
                    {product.sku && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Tag className="w-4 h-4" />
                        <span>SKU: {product.sku}</span>
                      </div>
                    )}
                    {product.categories && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Layers className="w-4 h-4" />
                        <span>{product.categories.name}</span>
                        {product.subcategories && (
                          <span> / {product.subcategories.name}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                      <p className="text-lg font-bold text-green-600">
                        ₹{product.price}
                      </p>
                      <p className="text-xs text-slate-500">
                        Cost: ₹{product.cost_price}
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`flex items-center gap-1 text-sm font-medium ${
                          product.stock_quantity <= product.low_stock_threshold
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {product.stock_quantity <=
                        product.low_stock_threshold ? (
                          <AlertCircle className="w-4 h-4" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        <span>{product.stock_quantity} in stock</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
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
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No products yet
              </h3>
              <p className="text-slate-600">
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
                  className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-3 rounded-lg">
                        <Layers className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-slate-900">
                          {category.name}
                        </h3>
                        {category.description && (
                          <p className="text-sm text-slate-600 mt-1">
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
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDeleteCategory(category.id)}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
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
              <Layers className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No categories yet
              </h3>
              <p className="text-slate-600">
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
                    className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="bg-gradient-to-br from-teal-500 to-emerald-500 p-3 rounded-lg">
                          <Grid3x3 className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-slate-900">
                            {subcategory.name}
                          </h3>
                          {category && (
                            <p className="text-xs text-slate-500 mt-1">
                              Category: {category.name}
                            </p>
                          )}
                          {subcategory.description && (
                            <p className="text-sm text-slate-600 mt-1">
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
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() =>
                            handleDeleteSubcategory(subcategory.id)
                          }
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
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
              <Grid3x3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No subcategories yet
              </h3>
              <p className="text-slate-600">
                Add subcategories to further organize products
              </p>
            </motion.div>
          )}
        </>
      )}

      <AnimatePresence>
        {showProductModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={resetProductForm}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">
                {editingProduct ? "Edit Product" : "Add New Product"}
              </h3>

              <form onSubmit={handleProductSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Product Name
                    </label>
                    <input
                      type="text"
                      value={productForm.name}
                      onChange={(e) =>
                        setProductForm({ ...productForm, name: e.target.value })
                      }
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={productForm.description}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      SKU
                    </label>
                    <input
                      type="text"
                      value={productForm.sku}
                      onChange={(e) =>
                        setProductForm({ ...productForm, sku: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
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
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
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
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select subcategory</option>
                      {subcategories
                        .filter(
                          (sub) => sub.category_id === productForm.category_id,
                        )
                        .map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Sale Price
                    </label>
                    <input
                      type="number"
                      value={productForm.price}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Cost Price
                    </label>
                    <input
                      type="number"
                      value={productForm.cost_price}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          cost_price: parseFloat(e.target.value) || 0,
                        })
                      }
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Stock Quantity
                    </label>
                    <input
                      type="number"
                      value={productForm.stock_quantity}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          stock_quantity: parseInt(e.target.value) || 0,
                        })
                      }
                      min="0"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Low Stock Alert
                    </label>
                    <input
                      type="number"
                      value={productForm.low_stock_threshold}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          low_stock_threshold: parseInt(e.target.value) || 10,
                        })
                      }
                      min="0"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
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
                      <span className="text-sm font-medium text-slate-700">
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
                    className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={resetCategoryForm}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">
                {editingCategory ? "Edit Category" : "Add New Category"}
              </h3>

              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, name: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
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
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
                    className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={resetSubcategoryForm}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">
                {editingSubcategory
                  ? "Edit Subcategory"
                  : "Add New Subcategory"}
              </h3>

              <form onSubmit={handleSubcategorySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
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
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Subcategory Name
                  </label>
                  <input
                    type="text"
                    value={subcategoryForm.name}
                    onChange={(e) =>
                      setSubcategoryForm({
                        ...subcategoryForm,
                        name: e.target.value,
                      })
                    }
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
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
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
                    className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                  >
                    Cancel
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
