import { useEffect, useMemo, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { stockService, productsService } from "../../services/apiService";
import { useToast } from "../Toast";
import StockFormDialog from "../modular/stock/stockFormDialog";
import DeletePrompt from "../modular/stock/stockDeleteDialog";

export default function StockTab() {
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);



  const totals = useMemo(() => {
    const totalUnits = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const totalValue = products.reduce(
      (sum, p) => sum + (p.totalValue || (p.stock || 0) * (p.price || 0)),
      0,
    );
    return { totalUnits, totalValue };
  }, [products]);

  const  fetchProductsMap = async () => {
    const { data, error } = await productsService.getAll()
    if (!error && data) {
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : data?.products || [];
      const opts = list.map((item) => ({
        id:
          item.id ||
          item._id ||
          item.productId ||
          item.sku ||
          item.code ||
          `product-${Math.random().toString(36).slice(2, 8)}`,
        name: item.title || item.name || item.productName || "Product",
        price: Number(item.distributorPrice ?? item.price ?? 0),
      }));
      setProductOptions(opts);
    } else {
      showToast("Failed to load products", "error");
    }
  }
  useEffect(() => {
    fetchStock();
    fetchProductsMap();
  }, []);

  // Disable keyboard navigation when any dialog/prompt is open
  useEffect(() => {
    if (!dialogOpen && !deleteTarget) return;
    const stopKeys = (e) => {
      e.stopPropagation();
    };
    window.addEventListener("keydown", stopKeys, true);
    return () => window.removeEventListener("keydown", stopKeys, true);
  }, [dialogOpen, deleteTarget]);

  const mapStock = (item) => {
    const quantity = Number(item.quantity ?? item.stock ?? 0);
    const distributorPrice = Number(item.distributorPrice ?? item.price ?? 0);
    const totalValue = Number(item.totalValue ?? quantity * distributorPrice);
    const productId =
      item.productId ||
      item.id ||
      item._id ||
      item.sku ||
      item.code ||
      `stock-${Math.random().toString(36).slice(2, 8)}`;
    return {
      id: item.id || item._id,
      productId,
      name: item.productName || item.name || item.title || "Product",
      quantity,
      distributorPrice,
      totalValue,
      lastUpdated: item.lastUpdated || item.updatedAt || item.createdAt || "",
    };
  };

  const fetchStock = async () => {
    setLoading(true);
    const { data, error } = await stockService.getAllStock();
    console.log("Fetched stock data:", data?.data || data);
    if (!error && data) {
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : data?.stocks || [];
      setProducts(list.map(mapStock));
    } else {
      showToast("Failed to load stock", "error");
    }
    setLoading(false);
  };

  const openCreate = () => {
    setEditingProduct(null);
    setDialogOpen(true);
  };

  const openEdit = (product) => {
    console.log("Editing product:", product);
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const handleSave = async (form) => {
    const payload = {
      productId: form.productId || form.id,
      name: form.name,
      quantity: Number(form.stock || 0),
      distributorPrice: Number(form.price || 0),
    };
    try {
      if (editingProduct) {
        const { error } = await stockService.updateStock(editingProduct.id, payload);
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
    } catch (err) {
      showToast("Failed to save stock", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await stockService.deleteStock(deleteTarget.id);
      if (error) throw error;
      showToast("Stock deleted", "success");
      setDeleteTarget(null);
      fetchStock();
    } catch (err) {
      showToast("Failed to delete stock", "error");
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
        
          <h2 className="text-2xl font-bold text-slate-900">Inventory</h2>
          <p className="text-slate-600">Products, stock levels, and valuation</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:grid grid-cols-2 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Total Units
              </p>
              <p className="text-xl font-bold text-slate-900">{totals.totalUnits}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Valuation
              </p>
              <p className="text-xl font-bold text-slate-900">
                ₹{totals.totalValue.toLocaleString()}
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

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Products</h3>
          <div className="grid grid-cols-2 gap-3 sm:hidden">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
              <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Units</p>
              <p className="text-base font-bold text-slate-900">{totals.totalUnits}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-center">
              <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Valuation</p>
              <p className="text-base font-bold text-slate-900">₹{totals.totalValue.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  Product
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">
                  Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">
                  Stock
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">
                  Value
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  Recent History
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
           
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-700">{p.id}</td>
                  <td className="px-4 py-3 text-sm text-slate-900 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-sm text-right text-slate-700">
                    ₹{p.distributorPrice}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-700">{p.quantity}</td>
                  <td className="px-4 py-3 text-sm text-right text-slate-900 font-semibold">
                    ₹{p.totalValue}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <div className="space-y-1">
                      {(p.history || []).slice(0, 2).map((h, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">{h.date}</span>
                          <span
                            className={`text-xs font-semibold ${
                              h.change >= 0 ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {h.change >= 0 ? "+" : ""}
                            {h.change}
                          </span>
                          <span className="text-xs text-slate-600">{h.note}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="px-3 py-1.5 text-sm rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 inline-flex items-center gap-1"
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
        subtitle="Are you sure you want to delete this stock entry? This action cannot be undone."
        onYes={handleDelete}
        onNo={() => setDeleteTarget(null)}
      />
    </div>
  );
}
