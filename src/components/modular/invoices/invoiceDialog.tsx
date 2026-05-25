import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Edit2, Trash2, FileText, Loader2, X } from "lucide-react";
import QuickInvoiceTab from "./QuickInvoiceTab";
import {
  LiquidButton,
  LiquidDropdown,
  LiquidIconButton,
  LiquidInput,
  LiquidPanel,
} from "../../ui/liquid";

interface AquaInvoiceFormDialogProps {
  showModal: boolean;
  onClose: () => void;
  onClear: () => void;
  editingInvoice: any | null;
  handleSubmit: (e: React.FormEvent) => void;
  formData: {
    invoice_no: string;
    date: string;
    customer_name: string;
    customer_phone: number;
    customer_email: string;
    customer_address: string;
    gst: boolean;
    po: boolean;
    quotation: boolean;
    gst_name: string;
    gst_no: string;
    gst_phone: string;
    gst_email: string;
    gst_address: string;
    products: {
      productName: string;
      productQuantity: number;
      productPrice: number;
      productSerialNo?: string;
    }[];
    paid_status: string;
    payment_type: string;
    delivered_by?: string;
    delivery_date?: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  productForm: {
    productName: string;
    productQuantity: number;
    productPrice: number;
    productSerialNo?: string;
  };
  setProductForm: React.Dispatch<React.SetStateAction<any>>;
  availableProducts: {
    id: string | number;
    name: string;
    price: number;
    sku?: string | null;
  }[];
  handleProductSelect: (productName: string) => void;
  addProduct: () => void;
  editingProductIndex: number | null;
  editProduct: (index: number) => void;
  removeProduct: (index: number) => void;
  cancelEditProduct: () => void;
  isDraftDirty: boolean;
  calculateTotal: (
    products: {
      productName: string;
      productQuantity: number;
      productPrice: number;
      productSerialNo?: string;
    }[],
  ) => number;
}

const tabOptions = [
  { label: "Easy Mode", value: "easy" },
  { label: "Standard Mode", value: "standard" },
  { label: "Quick Invoice", value: "quick" },
];

const paidStatusOptions = [
  { label: "Unpaid", value: "unpaid" },
  { label: "Partial", value: "partial" },
  { label: "Paid", value: "paid" },
];

const paymentTypeOptions = [
  { label: "Cash", value: "cash" },
  { label: "Card", value: "card" },
  { label: "UPI", value: "upi" },
  { label: "Bank Transfer", value: "bank_transfer" },
];

const Toggle = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) => (
  <label className="inline-flex cursor-pointer items-center gap-3">
    {label && <span className="liquid-label mb-0">{label}</span>}
    <span className="relative inline-flex h-7 w-12 items-center rounded-full border border-white/20 bg-white/20 transition-all dark:bg-white/10">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="absolute left-1 h-5 w-5 rounded-full bg-white shadow-lg transition-all peer-checked:translate-x-5 peer-checked:bg-cyan-200" />
      <span className="absolute inset-0 rounded-full bg-blue-500/0 transition-all peer-checked:bg-blue-500/70" />
    </span>
  </label>
);

const AquaInvoiceFormDialog = ({
  showModal,
  onClose,
  onClear,
  editingInvoice,
  handleSubmit,
  formData,
  setFormData,
  productForm,
  setProductForm,
  availableProducts,
  addProduct,
  editingProductIndex,
  editProduct,
  removeProduct,
  cancelEditProduct,
  calculateTotal,
  handleProductSelect,
  isDraftDirty,
}: AquaInvoiceFormDialogProps) => {
  const [activeTab, setActiveTab] = React.useState<"easy" | "standard" | "quick">("easy");
  const [gstUploading, setGstUploading] = React.useState(false);
  const [gstUploadError, setGstUploadError] = React.useState<string | null>(null);

  const handleGstPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      setGstUploadError("Please select a PDF file.");
      return;
    }
    setGstUploadError(null);
    setGstUploading(true);
    try {
      const { parseGstCertificatePdf } = await import("../../../utils/gstCertificateParser");
      const parsed = await parseGstCertificatePdf(file);
      if (!parsed.gstNo && !parsed.legalName) {
        setGstUploadError("Couldn't read GST details from this PDF. Try a Form REG-06 certificate.");
        return;
      }
      setFormData((prev: any) => ({
        ...prev,
        gst: true,
        gst_name: parsed.legalName || prev.gst_name,
        gst_no: parsed.gstNo || prev.gst_no,
        gst_address: parsed.address || prev.gst_address,
      }));
    } catch (err) {
      setGstUploadError(err instanceof Error ? err.message : "Failed to parse PDF.");
    } finally {
      setGstUploading(false);
    }
  };

  const GstPdfUploadButton = ({ id }: { id: string }) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={`liquid-button ${gstUploading ? "opacity-60" : "liquid-button-primary"}`}>
        {gstUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        {gstUploading ? "Reading PDF…" : "Upload GST Certificate"}
        <input
          id={id}
          type="file"
          accept="application/pdf"
          onChange={handleGstPdfUpload}
          disabled={gstUploading}
          className="sr-only"
        />
      </label>
      {gstUploadError && <span className="text-xs text-rose-500 dark:text-rose-400">{gstUploadError}</span>}
    </div>
  );

  const updateForm = (patch: Partial<typeof formData>) => setFormData({ ...formData, ...patch });
  const updateProduct = (patch: Partial<typeof productForm>) => setProductForm({ ...productForm, ...patch });

  return createPortal(
    <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xl sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 18 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 18 }}
            transition={{ type: "spring", stiffness: 360, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="liquid-panel flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border-white/20"
          >
            <div className="flex-shrink-0 border-b border-slate-200/60 bg-white/65 p-4 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70 sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-neutral-950 dark:text-white sm:text-2xl">
                    {editingInvoice ? "Edit Invoice" : "Create New Invoice"}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-white/50">
                    Use the same liquid controls across CRM invoices.
                  </p>
                </div>
                <LiquidIconButton onClick={onClose} aria-label="Close invoice form">
                  <X className="h-5 w-5" />
                </LiquidIconButton>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {tabOptions.map((tab) => (
                  <LiquidButton
                    key={tab.value}
                    type="button"
                    variant={activeTab === tab.value ? "primary" : "soft"}
                    onClick={() => setActiveTab(tab.value as "easy" | "standard" | "quick")}
                  >
                    {tab.label}
                  </LiquidButton>
                ))}
              </div>
            </div>

            <div className="custom-scrollbar flex-grow overflow-y-auto p-4 sm:p-6">
              <form id="invoice-form" onSubmit={handleSubmit} className="space-y-6">
                {activeTab === "quick" && (
                  <QuickInvoiceTab
                    formData={formData}
                    setFormData={setFormData}
                    availableProducts={availableProducts}
                    removeProduct={removeProduct}
                    calculateTotal={calculateTotal}
                    pdfUploadSlot={<GstPdfUploadButton id="gst-pdf-quick" />}
                  />
                )}

                {activeTab !== "quick" && (
                  <>
                    <LiquidPanel className="p-4">
                      <h4 className="mb-4 font-black text-neutral-950 dark:text-white">Invoice Details</h4>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <LiquidInput label="Invoice Number" value={formData.invoice_no} onChange={(e) => updateForm({ invoice_no: e.target.value })} />
                        <LiquidInput label="Date" type="date" value={formData.date} required onChange={(e) => updateForm({ date: e.target.value })} />
                      </div>
                    </LiquidPanel>

                    <LiquidPanel className="p-4">
                      <h4 className="mb-4 font-black text-neutral-950 dark:text-white">Customer Details</h4>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <LiquidInput label="Name" value={formData.customer_name} required onChange={(e) => updateForm({ customer_name: e.target.value })} />
                        <LiquidInput label="Phone" type="number" value={formData.customer_phone} required onChange={(e) => updateForm({ customer_phone: Number(e.target.value) || 0 })} />
                        {activeTab === "standard" && (
                          <LiquidInput label="Email" type="email" value={formData.customer_email} onChange={(e) => updateForm({ customer_email: e.target.value })} />
                        )}
                        <label className="block sm:col-span-2">
                          <span className="liquid-label">Address</span>
                          <textarea
                            value={formData.customer_address}
                            onChange={(e) => updateForm({ customer_address: e.target.value })}
                            required
                            className="liquid-textarea min-h-[90px]"
                          />
                        </label>
                      </div>
                    </LiquidPanel>

                    {activeTab === "standard" && (
                      <LiquidPanel className="p-4">
                        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <LiquidPanel className="p-4">
                            <div className="flex items-center justify-between gap-3">
                              <h4 className="font-black text-neutral-950 dark:text-white">PO Details</h4>
                              <Toggle label="Enable PO" checked={Boolean(formData.po)} onChange={(checked) => updateForm({ po: checked })} />
                            </div>
                          </LiquidPanel>
                          <LiquidPanel className="p-4">
                            <div className="flex items-center justify-between gap-3">
                              <h4 className="font-black text-neutral-950 dark:text-white">GST Details</h4>
                              <Toggle label="Enable GST" checked={Boolean(formData.gst)} onChange={(checked) => updateForm({ gst: checked })} />
                            </div>
                          </LiquidPanel>
                        </div>

                        {formData.gst && (
                          <div className="space-y-4">
                            <div>
                              <GstPdfUploadButton id="gst-pdf-standard" />
                              <p className="mt-1 text-xs text-slate-500 dark:text-white/40">
                                Upload GST Form REG-06 PDF to auto-fill these fields. The file is read locally.
                              </p>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <LiquidInput label="GST Name" value={formData.gst_name} placeholder="Business / Legal name" onChange={(e) => updateForm({ gst_name: e.target.value })} />
                              <LiquidInput label="GST Number" value={formData.gst_no} placeholder="e.g. 36HEDPS5768R1Z8" className="uppercase" onChange={(e) => updateForm({ gst_no: e.target.value.toUpperCase() })} />
                              <LiquidInput label="GST Phone" type="tel" value={formData.gst_phone} placeholder="Contact number for GST" onChange={(e) => updateForm({ gst_phone: e.target.value })} />
                              <LiquidInput label="GST Email" type="email" value={formData.gst_email} placeholder="Billing email" onChange={(e) => updateForm({ gst_email: e.target.value })} />
                              <label className="block sm:col-span-2">
                                <span className="liquid-label">GST Address</span>
                                <textarea
                                  value={formData.gst_address}
                                  onChange={(e) => updateForm({ gst_address: e.target.value })}
                                  placeholder="Registered address"
                                  className="liquid-textarea min-h-[90px]"
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </LiquidPanel>
                    )}

                    <LiquidPanel className="p-4">
                      <h4 className="mb-4 font-black text-neutral-950 dark:text-white">Products</h4>
                      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
                        <div className="md:col-span-2">
                          <LiquidInput
                            placeholder="Product Name"
                            value={productForm.productName}
                            onChange={(e) => handleProductSelect(e.target.value)}
                            list="products-list"
                          />
                          <datalist id="products-list">
                            {availableProducts.map((product) => (
                              <option key={product.id} value={product.name}>
                                {product.sku && `${product.sku} - `}₹{product.price}
                              </option>
                            ))}
                          </datalist>
                        </div>
                        <LiquidInput type="number" placeholder="Qty" value={productForm.productQuantity} onChange={(e) => updateProduct({ productQuantity: parseInt(e.target.value) || 1 })} />
                        <LiquidInput type="number" placeholder="Price" value={productForm.productPrice || ""} onChange={(e) => updateProduct({ productPrice: parseFloat(e.target.value) || 0 })} />
                        <LiquidInput placeholder="Serial No" value={productForm.productSerialNo} onChange={(e) => updateProduct({ productSerialNo: e.target.value })} />
                      </div>

                      <div className="mb-4 flex flex-wrap gap-2">
                        <LiquidButton
                          type="button"
                          onClick={addProduct}
                          disabled={!productForm.productName || productForm.productPrice <= 0}
                          variant="primary"
                        >
                          {editingProductIndex !== null ? "Update Product" : "Add Product"}
                        </LiquidButton>
                        {editingProductIndex !== null && (
                          <LiquidButton type="button" onClick={cancelEditProduct} variant="soft">
                            Cancel Edit
                          </LiquidButton>
                        )}
                      </div>

                      {formData.products.length > 0 && (
                        <div className="custom-scrollbar max-h-56 space-y-2 overflow-y-auto pr-2">
                          {formData.products.map((product, index) => (
                            <LiquidPanel key={index} className={`p-4 ${editingProductIndex === index ? "ring-2 ring-blue-400/50" : ""}`}>
                              <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-bold text-neutral-950 dark:text-white">{product.productName || "Product"}</p>
                                  <p className="mt-0.5 text-xs text-black dark:text-white/60">
                                    Qty: {product.productQuantity} × ₹{product.productPrice.toLocaleString("en-IN")}
                                    {product.productSerialNo && ` | SN: ${product.productSerialNo}`}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <LiquidIconButton type="button" onClick={() => editProduct(index)} title="Edit">
                                    <Edit2 className="h-4 w-4" />
                                  </LiquidIconButton>
                                  <LiquidIconButton type="button" onClick={() => removeProduct(index)} title="Remove">
                                    <Trash2 className="h-4 w-4 text-rose-500" />
                                  </LiquidIconButton>
                                </div>
                              </div>
                            </LiquidPanel>
                          ))}
                          <LiquidPanel className="p-4">
                            <p className="flex items-center justify-between text-lg font-black text-blue-600 dark:text-blue-300">
                              <span>Total Amount:</span>
                              <span>{calculateTotal(formData.products).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}</span>
                            </p>
                          </LiquidPanel>
                        </div>
                      )}
                    </LiquidPanel>

                    <LiquidPanel className="p-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <LiquidDropdown
                          label="Payment Status"
                          value={formData.paid_status}
                          options={paidStatusOptions}
                          onChange={(value) => updateForm({ paid_status: value })}
                        />
                        {activeTab === "standard" && (
                          <LiquidDropdown
                            label="Payment Type"
                            value={formData.payment_type}
                            options={paymentTypeOptions}
                            onChange={(value) => updateForm({ payment_type: value })}
                          />
                        )}
                      </div>
                    </LiquidPanel>
                  </>
                )}
              </form>
            </div>

            <div className="flex flex-shrink-0 flex-col gap-3 border-t border-slate-200/60 bg-white/65 p-4 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70 sm:flex-row sm:p-6">
              <LiquidButton type="submit" form="invoice-form" variant="primary" className="flex-1">
                {editingInvoice ? "Update Invoice" : "Create Invoice"}
              </LiquidButton>
              <LiquidButton type="button" onClick={onClear} disabled={!isDraftDirty} variant="soft">
                Clear
              </LiquidButton>
              <LiquidButton type="button" onClick={onClose} variant="soft">
                Cancel
              </LiquidButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default AquaInvoiceFormDialog;
