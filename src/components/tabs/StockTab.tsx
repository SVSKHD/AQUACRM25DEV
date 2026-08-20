import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Plus,
  Edit2,
  Trash2,
} from "lucide-react";
import { productsService, stockService } from "../../services/apiService";
import { useToast } from "../Toast";
import StockFormDialog from "../modular/stock/stockFormDialog";
import DeletePrompt from "../modular/stock/stockDeleteDialog";
import StockStatusSendDialog from "../modular/stock/StockStatusSendDialog";
import TabInnerContent from "../Layout/tabInnerlayout";

interface StockItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  dpPrice: number;
  totalValue: number;
  lastUpdated: string;
  history?: { date: string; change: number; note: string }[];
  price?: number;
  source?: string;
}

interface ProductOption {
  id: string;
  stockId?: string;
  name: string;
  price: number;
  stock: number;
  sku?: string | null;
  source?: "product" | "stock";
}

const formatCurrency = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const normalizeId = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object")
    return value._id || value.id || value.$oid || "";
  return String(value);
};

const extractList = (data: any) => {
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.stocks)) return data.stocks;
  return [];
};

const extractProductList = (data: any) => {
  const candidates = [
    data?.data?.products,
    data?.data?.data,
    data?.data,
    data?.products,
    data?.items,
    data?.result,
    data,
  ];
  return candidates.find((item) => Array.isArray(item)) || [];
};

const getStockQuantity = (item: any) => Number(item?.quantity ?? 0);

const getDpPrice = (item: any) =>
  Number(
    item?.dpPrice ??
      item?.DPPrice ??
      item?.dealerPrice ??
      item?.distributorPrice ??
      item?.dp_price ??
      item?.price ??
      item?.mrp ??
      0,
  );

const getProductName = (item: any) =>
  item?.productName ||
  item?.name ||
  item?.title ||
  item?.product_name ||
  item?.product?.title ||
  "Product";

const mapStock = (item: any): StockItem => {
  const productId =
    normalizeId(item?.productId) ||
    normalizeId(item?.product?._id) ||
    normalizeId(item?.product?.id) ||
    normalizeId(item?.id) ||
    normalizeId(item?._id) ||
    item?.sku ||
    item?.code ||
    `stock-${Math.random().toString(36).slice(2, 8)}`;
  const id =
    normalizeId(item?.stockId) ||
    normalizeId(item?.id) ||
    normalizeId(item?._id) ||
    productId;
  const quantity = getStockQuantity(item);
  const dpPrice = getDpPrice(item);
  const totalValue = quantity * dpPrice;

  return {
    id,
    productId,
    name: getProductName(item),
    quantity,
    dpPrice,
    totalValue,
    lastUpdated: item?.lastUpdated || item?.updatedAt || item?.createdAt || "",
    history: item?.history || [],
    price: Number(item?.price || 0),
    source: item?.source,
  };
};

const mapProductOption = (
  product: any,
  stockByProductId: Map<string, StockItem>,
  index: number,
): ProductOption | null => {
  const productId =
    normalizeId(product?._id) ||
    normalizeId(product?.id) ||
    normalizeId(product?.product_id) ||
    normalizeId(product?.productId) ||
    normalizeId(product?.sku) ||
    `product-${index}`;

  const name = getProductName(product);
  if (!productId || !name || name === "Product") return null;

  const existingStock = stockByProductId.get(productId);
  const dpPrice = getDpPrice(product) || existingStock?.dpPrice || 0;

  return {
    id: productId,
    stockId: existingStock?.id,
    name,
    price: dpPrice,
    stock: existingStock?.quantity ?? 0,
    sku:
      product?.sku ||
      product?.sku_code ||
      product?.skuCode ||
      product?.code ||
      null,
    source: "product",
  };
};

export default function StockTab() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<StockItem[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sendStatusOpen, setSendStatusOpen] = useState(false);
  const [sendingStockStatus, setSendingStockStatus] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StockItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StockItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totals = useMemo(() => {
    const totalUnits = products.reduce(
      (sum, p) => sum + Number(p.quantity || 0),
      0,
    );
    const totalValue = products.reduce(
      (sum, p) => sum + Number(p.quantity || 0) * Number(p.dpPrice || 0),
      0,
    );
    return { totalUnits, totalValue };
  }, [products]);
  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
  const paginatedProducts = products.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const firstResult = products.length ? (currentPage - 1) * pageSize + 1 : 0;
  const lastResult = Math.min(currentPage * pageSize, products.length);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const [stockResponse, productResponse] = await Promise.all([
        stockService.getAllStock(),
        productsService.getAll(),
      ]);

      if (stockResponse.error || !stockResponse.data) {
        throw stockResponse.error || new Error("Failed to load stock");
      }

      const stockList = extractList(stockResponse.data).map(mapStock);
      const stockByProductId = new Map(
        stockList.map((item) => [item.productId, item]),
      );
      setProducts(stockList);

      const rawProducts =
        productResponse.error || !productResponse.data
          ? []
          : extractProductList(productResponse.data);
      const allProductOptions = rawProducts
        .map((product: any, index: number) =>
          mapProductOption(product, stockByProductId, index),
        )
        .filter(Boolean) as ProductOption[];

      const stockOnlyOptions = stockList
        .filter(
          (stock) =>
            !allProductOptions.some(
              (product) => product.id === stock.productId,
            ),
        )
        .map((stock) => ({
          id: stock.productId,
          stockId: stock.id,
          name: stock.name,
          price: stock.dpPrice,
          stock: stock.quantity,
          source: "stock" as const,
        }));

      const mergedOptions = [...allProductOptions, ...stockOnlyOptions].sort(
        (a, b) => a.name.localeCompare(b.name),
      );

      setProductOptions(mergedOptions);

      if (productResponse.error || !rawProducts.length) {
        showToast(
          "Loaded CRM stock. Complete product list could not be loaded, showing stocked products only.",
          "error",
        );
      }
    } catch (err) {
      showToast("Failed to load stock", "error");
      setProducts([]);
      setProductOptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const openCreate = () => {
    setEditingProduct(null);
    setDialogOpen(true);
  };

  const openEdit = (product: StockItem) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const handleSave = async (form: any) => {
    const productId = form.productId || form.id;
    const quantity = Number(form.quantity || 0);
    const selectedOption = productOptions.find((item) => item.id === productId);
    const existingStockId =
      editingProduct?.id ||
      selectedOption?.stockId ||
      products.find((item) => item.productId === productId)?.id;
    const payload = { productId, quantity };

    try {
      if (!productId) {
        showToast(
          "Please select a product from the complete product list",
          "error",
        );
        return;
      }

      if (editingProduct || existingStockId) {
        const { error } = await stockService.updateStock(
          existingStockId,
          payload,
        );
        if (error) throw error;
        showToast("CRM stock updated", "success");
      } else {
        const { error } = await stockService.addStock(payload);
        if (error) throw error;
        showToast("CRM stock added", "success");
      }
      setDialogOpen(false);
      setEditingProduct(null);
      fetchStock();
    } catch (err: any) {
      showToast(err?.message || "Failed to save CRM stock", "error");
    }
  };

  const handleSendStockStatus = async (phone: string, message: string) => {
    const normalizedPhone = String(phone || "").replace(/\D/g, "");
    if (!normalizedPhone) {
      showToast("Please enter WhatsApp phone number", "error");
      return;
    }

    setSendingStockStatus(true);
    const response = await stockService.sendStockStatus(
      normalizedPhone,
      message,
    );
    setSendingStockStatus(false);

    if (response.error) {
      showToast(response.error, "error");
      return;
    }

    showToast("CRM stock status sent successfully", "success");
    setSendStatusOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await stockService.deleteStock(
        deleteTarget.id || deleteTarget.productId,
      );
      if (error) throw error;
      showToast("CRM stock deleted", "success");
      setDeleteTarget(null);
      fetchStock();
    } catch (err: any) {
      showToast(err?.message || "Failed to delete CRM stock", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TabInnerContent
        title="Inventory"
        description="Complete product dropdown from product collection. CRM stock quantity stays separate from ecommerce stock."
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
            <div className="hidden grid-cols-3 gap-3 sm:grid">
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                  CRM Stock Count
                </p>
                <p className="text-xl font-bold text-neutral-950 dark:text-white">
                  {totals.totalUnits.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                  Total Stock Valuation
                </p>
                <p className="text-xl font-bold text-neutral-950 dark:text-white">
                  {formatCurrency(totals.totalValue)}
                </p>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
                  Product Dropdown
                </p>
                <p className="text-xl font-bold text-neutral-950 dark:text-white">
                  {productOptions.length.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow transition-colors hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Stock
              </button>
              <button
                onClick={() => setSendStatusOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow transition-colors hover:bg-emerald-700"
              >
                <MessageCircle className="h-4 w-4" />
                Send Stock Status
              </button>
            </div>
          </div>
        </div>

        <div className="glass-card overflow-hidden border border-slate-200 shadow-xl dark:border-white/10">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <h3 className="text-lg font-semibold text-neutral-950 dark:text-white">
              CRM Stock Products
            </h3>
            <span className="hidden rounded-full bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-700 dark:text-sky-300 sm:inline-flex">
              {products.length.toLocaleString("en-IN")} records
            </span>
            <div className="grid grid-cols-3 gap-2 sm:hidden">
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-2 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                  Count
                </p>
                <p className="text-sm font-bold text-neutral-950 dark:text-white">
                  {totals.totalUnits.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                  Value
                </p>
                <p className="text-sm font-bold text-neutral-950 dark:text-white">
                  {formatCurrency(totals.totalValue)}
                </p>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-2 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
                  Products
                </p>
                <p className="text-sm font-bold text-neutral-950 dark:text-white">
                  {productOptions.length.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                    Stock ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                    Product
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-black dark:text-white/60">
                    Product DP Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-black dark:text-white/60">
                    CRM Stock Count
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-black dark:text-white/60">
                    Stock Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                    Recent History
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-black dark:text-white/60">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {paginatedProducts.map((p) => (
                  <tr
                    key={`${p.id}-${p.productId}`}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    <td className="px-4 py-3 text-sm text-black dark:text-white/60">
                      {p.id}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-neutral-950 dark:text-white">
                      {p.name}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-black dark:text-white/60">
                      {formatCurrency(p.dpPrice)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-black dark:text-white/60">
                      {p.quantity.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-neutral-950 dark:text-white">
                      {formatCurrency(p.quantity * p.dpPrice)}
                    </td>
                    <td className="px-4 py-3 text-sm text-black dark:text-white/70">
                      <div className="space-y-1">
                        {(p.history || []).slice(0, 2).map((h, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="text-xs text-slate-500">
                              {h.date}
                            </span>
                            <span
                              className={`text-xs font-semibold ${h.change >= 0 ? "text-emerald-600" : "text-red-600"}`}
                            >
                              {h.change >= 0 ? "+" : ""}
                              {h.change}
                            </span>
                            <span className="text-xs text-black dark:text-white/70">
                              {h.note}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-3 py-1.5 text-sm text-black transition-colors hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                        >
                          <Edit2 className="h-4 w-4" /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="inline-flex items-center gap-1 rounded-md bg-red-50 px-3 py-1.5 text-sm text-red-600 hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {products.length > 0 && (
                  <tr className="border-t border-emerald-500/20 bg-emerald-500/10">
                    <td
                      colSpan={3}
                      className="px-4 py-4 text-sm font-bold text-neutral-950 dark:text-white"
                    >
                      Total CRM Stock Valuation
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-bold text-neutral-950 dark:text-white">
                      {totals.totalUnits.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      {formatCurrency(totals.totalValue)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                )}
                {products.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-sm text-slate-500 dark:text-white/60"
                    >
                      No CRM stock records found. Click Add Stock and choose
                      from the complete product dropdown.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {!loading && products.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold text-slate-500 dark:text-white/50">
                Showing {firstResult}–{lastResult} of{" "}
                {products.length.toLocaleString("en-IN")}
              </p>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-white/50">
                  Rows
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-neutral-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                  >
                    {[10, 25, 50].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  className="rounded-lg border border-slate-200 p-2 disabled:opacity-40 dark:border-white/10"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-20 text-center text-xs font-bold text-neutral-950 dark:text-white">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  aria-label="Next page"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  className="rounded-lg border border-slate-200 p-2 disabled:opacity-40 dark:border-white/10"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <StockFormDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setEditingProduct(null);
          }}
          onSave={handleSave}
          initial={editingProduct}
          productOptions={productOptions}
        />

        <StockStatusSendDialog
          open={sendStatusOpen}
          products={products}
          isSending={sendingStockStatus}
          onClose={() => setSendStatusOpen(false)}
          onSend={handleSendStockStatus}
        />

        <DeletePrompt
          open={!!deleteTarget}
          title={deleteTarget ? deleteTarget.name : ""}
          subtitle="Are you sure you want to delete this CRM stock entry? This will not change ecommerce product stock."
          onYes={handleDelete}
          onNo={() => setDeleteTarget(null)}
        />
      </TabInnerContent>
    </div>
  );
}
