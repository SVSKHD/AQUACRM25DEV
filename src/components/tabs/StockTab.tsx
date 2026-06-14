import { useEffect, useMemo, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { stockService } from "../../services/apiService";
import { useToast } from "../Toast";
import StockFormDialog from "../modular/stock/stockFormDialog";
import DeletePrompt from "../modular/stock/stockDeleteDialog";
import TabInnerContent from "../Layout/tabInnerlayout";

interface StockItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  distributorPrice: number;
  dpPrice: number;
  totalValue: number;
  lastUpdated: string;
  history?: { date: string; change: number; note: string }[];
  price?: number;
  source?: string;
}

interface ProductOption {
  id: string;
  name: string;
  price: number;
  stock: number;
}

const formatCurrency = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const normalizeId = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return value._id || value.id || value.$oid || "";
  return String(value);
};

const extractList = (data: any) => {
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.stocks)) return data.stocks;
  return [];
};

const getStockQuantity = (item: any) => Number(item?.quantity ?? 0);

const getDpPrice = (item: any) =>
  Number(
    item?.dpPrice ??
      item?.DPPrice ??
      item?.dealerPrice ??
      item?.distributorPrice ??
      item?.price ??
      0,
  );

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
  const id = normalizeId(item?.id) || normalizeId(item?._id) || productId;
  const quantity = getStockQuantity(item);
  const dpPrice = getDpPrice(item);
  const totalValue = quantity * dpPrice;

  return {
    id,
    productId,
    name: item?.productName || item?.name || item?.title || item?.product?.title || "Product",
    quantity,
    distributorPrice: dpPrice,
    dpPrice,
    totalValue,
    lastUpdated: item?.lastUpdated || item?.updatedAt || item?.createdAt || "",
    history: item?.history || [],
    price: Number(item?.price || 0),
    source: item?.source,
  };
};

export default function StockTab() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<StockItem[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StockItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StockItem | null>(null);

  const totals = useMemo(() => {
    const totalUnits = products.reduce((sum, p) => sum + Number(p.quantity || 0), 0);
    const totalValue = products.reduce(
      (sum, p) => sum + Number(p.quantity || 0) * Number(p.dpPrice || 0),
      0,
    );
    return { totalUnits, totalValue };
  }, [products]);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const { data, error } = await stockService.getAllStock();
      if (error || !data) {
        throw error || new Error("Failed to load stock");
      }

      const list = extractList(data).map(mapStock);
      setProducts(list);
      setProductOptions(
        list.map((item) => ({
          id: item.productId,
          name: item.name,
          price: item.dpPrice,
          stock: item.quantity,
        })),
      );
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
    const distributorPrice = Number(form.distributorPrice || form.dpPrice || 0);
    const payload = {
      productId,
      name: form.name,
      quantity,
      distributorPrice,
    };

    try {
      if (!productId) {
        showToast("Please select a product", "error");
        return;
      }

      if (editingProduct) {
        const { error } = await stockService.updateStock(
          editingProduct.id || editingProduct.productId,
          payload,
        );
        if (error) throw error;
        showToast("Stock updated", "success");
      } else {
        const { error } = await stockService.addStock(payload);
        if (error) throw error;
        showToast("Stock added", "success");
      }
      setDialogOpen(false);
      setEditingProduct(null);
      fetchStock();
    } catch (err: any) {
      showToast(err?.message || "Failed to save stock", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await stockService.deleteStock(
        deleteTarget.id || deleteTarget.productId,
      );
      if (error) throw error;
      showToast("Stock deleted", "success");
      setDeleteTarget(null);
      fetchStock();
    } catch (err: any) {
      showToast(err?.message || "Failed to delete stock", "error");
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
        description="CRM stock count, DP price, and total stock valuation"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 p-5">
            <div className="hidden sm:grid grid-cols-2 gap-3">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                  CRM Stock Count
                </p>
                <p className="text-xl font-bold text-neutral-950 dark:text-white">
                  {totals.totalUnits.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                  Total Stock Valuation
                </p>
                <p className="text-xl font-bold text-neutral-950 dark:text-white">
                  {formatCurrency(totals.totalValue)}
                </p>
              </div>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow"
            >
              <Plus className="w-4 h-4" />
              Add Stock
            </button>
          </div>
        </div>

        <div className="glass-card shadow-xl overflow-hidden border border-slate-200 dark:border-white/10">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-white/5">
            <h3 className="text-lg font-semibold text-neutral-950 dark:text-white">
              Products
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:hidden">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-center">
                <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                  Count
                </p>
                <p className="text-base font-bold text-neutral-950 dark:text-white">
                  {totals.totalUnits.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-center">
                <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                  Value
                </p>
                <p className="text-base font-bold text-neutral-950 dark:text-white">
                  {formatCurrency(totals.totalValue)}
                </p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-black dark:text-white/60 uppercase">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-black dark:text-white/60 uppercase">
                    Product
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-black dark:text-white/60 uppercase">
                    DP Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-black dark:text-white/60 uppercase">
                    Stock Count
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-black dark:text-white/60 uppercase">
                    Stock Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-black dark:text-white/60 uppercase">
                    Recent History
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-black dark:text-white/60 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {products.map((p) => (
                  <tr
                    key={`${p.id}-${p.productId}`}
                    className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-black dark:text-white/60">
                      {p.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-950 dark:text-white font-medium">
                      {p.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-black dark:text-white/60">
                      {formatCurrency(p.dpPrice)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-black dark:text-white/60">
                      {p.quantity.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-neutral-950 dark:text-white font-semibold">
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
                              className={`text-xs font-semibold ${
                                h.change >= 0 ? "text-emerald-600" : "text-red-600"
                              }`}
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
                          className="px-3 py-1.5 text-sm rounded-md bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-black dark:text-white inline-flex items-center gap-1 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="px-3 py-1.5 text-sm rounded-md bg-red-50 hover:bg-red-100 text-red-600 inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {products.length > 0 && (
                  <tr className="bg-emerald-500/10 border-t border-emerald-500/20">
                    <td colSpan={3} className="px-4 py-4 text-sm font-bold text-neutral-950 dark:text-white">
                      Total Stock Valuation
                    </td>
                    <td className="px-4 py-4 text-sm text-right font-bold text-neutral-950 dark:text-white">
                      {totals.totalUnits.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-4 text-sm text-right font-bold text-emerald-700 dark:text-emerald-300">
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
                      No stock products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
