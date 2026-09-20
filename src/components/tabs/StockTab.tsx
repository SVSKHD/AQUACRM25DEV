import { useEffect, useMemo, useState } from "react";
import { Edit2, MessageCircle, Plus, Trash2 } from "lucide-react";
import { productsService, stockService } from "../../services/apiService";
import { useToast } from "../Toast";
import StockFormDialog from "../modular/stock/stockFormDialog";
import DeletePrompt from "../modular/stock/stockDeleteDialog";
import StockStatusSendDialog from "../modular/stock/StockStatusSendDialog";
import TabInnerContent from "../Layout/tabInnerlayout";
import AquaGenericTable, {
  AquaTableAction,
  AquaTableColumn,
} from "../modular/invoices/invoiceTable";
import { LiquidButton, LiquidPanel } from "../ui/liquid";

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

  return {
    id,
    productId,
    name: getProductName(item),
    quantity,
    dpPrice,
    totalValue: quantity * dpPrice,
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

  const totals = useMemo(() => {
    const totalUnits = products.reduce(
      (sum, product) => sum + Number(product.quantity || 0),
      0,
    );
    const totalValue = products.reduce(
      (sum, product) =>
        sum +
        Number(product.quantity || 0) * Number(product.dpPrice || 0),
      0,
    );
    return { totalUnits, totalValue };
  }, [products]);

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

      setProductOptions(
        [...allProductOptions, ...stockOnlyOptions].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );

      if (productResponse.error || !rawProducts.length) {
        showToast(
          "Loaded CRM stock. Complete product list could not be loaded, showing stocked products only.",
          "error",
        );
      }
    } catch {
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
    } catch (error: any) {
      showToast(error?.message || "Failed to save CRM stock", "error");
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
    } catch (error: any) {
      showToast(error?.message || "Failed to delete CRM stock", "error");
    }
  };

  const stockColumns = useMemo<AquaTableColumn<StockItem>[]>(
    () => [
      {
        key: "id",
        header: "Stock ID",
        render: (stock) => stock.id || "—",
      },
      {
        key: "name",
        header: "Product",
        className: "font-bold text-neutral-950 dark:text-white",
      },
      {
        key: "dpPrice",
        header: "Product DP Price",
        className: "text-right whitespace-nowrap",
        render: (stock) => formatCurrency(stock.dpPrice),
      },
      {
        key: "quantity",
        header: "CRM Stock Count",
        className: "text-right whitespace-nowrap",
        render: (stock) => stock.quantity.toLocaleString("en-IN"),
      },
      {
        key: "totalValue",
        header: "Stock Value",
        className:
          "text-right whitespace-nowrap font-bold text-emerald-700 dark:text-emerald-300",
        render: (stock) => formatCurrency(stock.quantity * stock.dpPrice),
      },
      {
        key: "history",
        header: "Recent History",
        render: (stock) => {
          const history = (stock.history || []).slice(0, 2);
          if (!history.length) return "—";
          return (
            <div className="space-y-1">
              {history.map((entry, index) => (
                <div
                  key={`${entry.date}-${index}`}
                  className="flex items-center gap-2 text-xs"
                >
                  <span className="text-slate-500">{entry.date}</span>
                  <span
                    className={
                      entry.change >= 0 ? "text-emerald-600" : "text-rose-600"
                    }
                  >
                    {entry.change >= 0 ? "+" : ""}
                    {entry.change}
                  </span>
                  <span className="truncate">{entry.note}</span>
                </div>
              ))}
            </div>
          );
        },
      },
    ],
    [],
  );

  const stockActions = useMemo<AquaTableAction<StockItem>[]>(
    () => [
      {
        label: "Edit",
        icon: <Edit2 className="h-4 w-4" />,
        onClick: openEdit,
      },
      {
        label: "Delete",
        icon: <Trash2 className="h-4 w-4 text-rose-500" />,
        onClick: setDeleteTarget,
      },
    ],
    [],
  );

  return (
    <TabInnerContent
      title="Inventory"
      description="Complete product dropdown from product collection. CRM stock quantity stays separate from ecommerce stock."
    >
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <StockStat
            label="CRM Stock Count"
            value={totals.totalUnits.toLocaleString("en-IN")}
          />
          <StockStat
            label="Total Stock Valuation"
            value={formatCurrency(totals.totalValue)}
            accent
          />
          <StockStat
            label="Product Dropdown"
            value={productOptions.length.toLocaleString("en-IN")}
          />
        </div>

        <LiquidPanel className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-neutral-950 dark:text-white">
              CRM inventory controls
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-white/50">
              Stock mutations remain isolated from ecommerce product stock.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LiquidButton type="button" variant="primary" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add Stock
            </LiquidButton>
            <LiquidButton
              type="button"
              variant="soft"
              onClick={() => setSendStatusOpen(true)}
            >
              <MessageCircle className="h-4 w-4" />
              Send Stock Status
            </LiquidButton>
          </div>
        </LiquidPanel>

        <AquaGenericTable
          heading="CRM Stock Products"
          subHeading={`${products.length.toLocaleString("en-IN")} records · ${totals.totalUnits.toLocaleString("en-IN")} units · ${formatCurrency(totals.totalValue)} valuation`}
          columns={stockColumns}
          data={products}
          isLoading={loading}
          emptyMessage="No CRM stock records found. Add stock and choose from the complete product list."
          actions={stockActions}
          actionsLabel="Actions"
          actionsBelowRow
          enableFilter
          filterPlaceholder="Filter stock by product, ID or value"
          getRowId={(stock) => stock.id}
          pageSizeOptions={[10, 25, 50]}
        />

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
          open={Boolean(deleteTarget)}
          title={deleteTarget ? deleteTarget.name : ""}
          subtitle="Are you sure you want to delete this CRM stock entry? This will not change ecommerce product stock."
          onYes={handleDelete}
          onNo={() => setDeleteTarget(null)}
        />
      </div>
    </TabInnerContent>
  );
}

function StockStat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <LiquidPanel className="p-5">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-white/50">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-black ${
          accent
            ? "text-emerald-600 dark:text-emerald-300"
            : "text-neutral-950 dark:text-white"
        }`}
      >
        {value}
      </p>
    </LiquidPanel>
  );
}
