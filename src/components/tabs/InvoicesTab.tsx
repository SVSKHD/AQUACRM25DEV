import { useState, useEffect, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { invoicesService, productsService } from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../Toast';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  ExternalLink,
  Download,
  Copy,
  FileText,
  FileDown,
} from 'lucide-react';

interface Product {
  productName: string;
  productQuantity: number;
  productPrice: number;
  productSerialNo?: string;
}

interface DbProduct {
  id: string;
  name: string;
  price: number;
  sku: string | null;
}

interface Invoice {
  id: string;
  invoice_no: string;
  date: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address: string;
  gst: boolean;
  po: boolean;
  quotation: boolean;
  gst_name: string | null;
  gst_no: string | null;
  gst_phone: string | null;
  gst_email: string | null;
  gst_address: string | null;
  products: Product[];
  delivered_by: string | null;
  delivery_date: string | null;
  paid_status: string;
  payment_type: string;
  aquakart_online_user: boolean;
  aquakart_invoice: boolean;
  total_amount: number;
  created_at: string;
}

type InvoiceTypeFilter = 'all' | 'gst' | 'po';

export default function InvoicesTab() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableProducts, setAvailableProducts] = useState<DbProduct[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<InvoiceTypeFilter>('all');
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    invoice_no: '',
    date: new Date().toISOString().split('T')[0],
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_address: '',
    gst: false,
    po: false,
    quotation: false,
    gst_name: '',
    gst_no: '',
    gst_phone: '',
    gst_email: '',
    gst_address: '',
    products: [] as Product[],
    delivered_by: '',
    delivery_date: '',
    paid_status: 'unpaid',
    payment_type: 'cash',
    aquakart_online_user: false,
    aquakart_invoice: false,
  });

  const [productForm, setProductForm] = useState({
    productName: '',
    productQuantity: 1,
    productPrice: 0,
    productSerialNo: '',
  });

  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null);

  useKeyboardShortcut('Escape', showModal || showViewModal);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchInvoices({ withLoading: false }), fetchProducts()]);
      setLoading(false);
    };

    loadData();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [invoices, selectedMonth, selectedYear, invoiceTypeFilter]);

  const filterInvoices = () => {
    const filtered = invoices.filter((invoice) => {
      const invoiceDate = new Date(invoice.date);
      const monthMatch =
        selectedMonth === 'all' ? true : invoiceDate.getMonth() + 1 === selectedMonth;
      const yearMatch = selectedYear === 'all' ? true : invoiceDate.getFullYear() === selectedYear;

      if (!(monthMatch && yearMatch)) return false;

      if (invoiceTypeFilter === 'gst') {
        return invoice.gst === true;
      } else if (invoiceTypeFilter === 'po') {
        return invoice.po === true;
      }
      return true;
    });

    setFilteredInvoices(filtered);
  };

  const fetchInvoices = async ({ withLoading = true }: { withLoading?: boolean } = {}) => {
    if (withLoading) setLoading(true);
    try {
      const { data, error } = await invoicesService.getAll();
      if (!error) {
        const rawInvoices = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.data)
          ? (data as any).data
          : [];

        setInvoices(rawInvoices.map(mapInvoiceFromApi));
      } else {
        setInvoices([]);
      }
    } finally {
      if (withLoading) setLoading(false);
    }
  };

  const importInvoicesFromAPI = async () => {
    if (!user?.id) {
      setImportStatus('Error: User not authenticated');
      return;
    }

    setImporting(true);
    setImportStatus('Fetching invoices from API...');

    try {
      const response = await fetch('https://api.aquakart.co.in/v1/crm/admin/all-invoices');

      if (!response.ok) {
        throw new Error('Failed to fetch invoices from API');
      }

      const apiInvoices = await response.json();
      setImportStatus(`Found ${apiInvoices.length} invoices. Importing...`);

      let successCount = 0;
      let errorCount = 0;

      for (const apiInvoice of apiInvoices) {
        try {
          const products = apiInvoice.products.map((p: any) => ({
            productName: p.productName,
            productQuantity: p.productQuantity,
            productPrice: p.productPrice,
            productSerialNo: p.productSerialNo || '',
          }));

          const total = products.reduce(
            (sum: number, p: any) => sum + p.productPrice * p.productQuantity,
            0
          );

          const invoiceData = {
            user_id: user.id,
            invoice_no: apiInvoice.invoiceNo,
            date: apiInvoice.date,
            customer_name: apiInvoice.customerDetails.name,
            customer_phone: apiInvoice.customerDetails.phone.toString(),
            customer_email: apiInvoice.customerDetails.email,
            customer_address: apiInvoice.customerDetails.address,
            gst: apiInvoice.gst || false,
            po: apiInvoice.po || false,
            quotation: apiInvoice.quotation || false,
            gst_name: apiInvoice.gstDetails?.gstName || '',
            gst_no: apiInvoice.gstDetails?.gstNo || '',
            gst_phone: apiInvoice.gstDetails?.gstPhone?.toString() || '',
            gst_email: apiInvoice.gstDetails?.gstEmail || '',
            gst_address: apiInvoice.gstDetails?.gstAddress || '',
            products: products,
            delivered_by: apiInvoice.transport?.deliveredBy || '',
            delivery_date: apiInvoice.transport?.deliveryDate || null,
            paid_status: apiInvoice.paidStatus || 'unpaid',
            payment_type: apiInvoice.paymentType || 'cash',
            aquakart_online_user: apiInvoice.aquakartOnlineUser || false,
            aquakart_invoice: apiInvoice.aquakartInvoice || false,
            total_amount: total,
          };

          const { error } = await supabase
            .from('invoices')
            .upsert(invoiceData, { onConflict: 'invoice_no' });

          if (error) {
            console.error(`Error importing invoice ${apiInvoice.invoiceNo}:`, error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`Error processing invoice ${apiInvoice.invoiceNo}:`, err);
          errorCount++;
        }
      }

      setImportStatus(
        `Import complete! Success: ${successCount}, Errors: ${errorCount}`
      );

      await fetchInvoices();

      setTimeout(() => {
        setImportStatus('');
      }, 5000);
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus('Error: Failed to import invoices');
    } finally {
      setImporting(false);
    }
  };

  const calculateTotal = (products: Product[]) => {
    return products.reduce((sum, product) => sum + product.productPrice * product.productQuantity, 0);
  };

  const buildApiPayload = (base: typeof formData, total: number) => ({
    invoiceNo: base.invoice_no,
    date: base.date,
    customerDetails: {
      name: base.customer_name,
      phone: base.customer_phone,
      email: base.customer_email,
      address: base.customer_address,
    },
    gst: base.gst,
    po: base.po,
    quotation: base.quotation,
    gstDetails: {
      gstName: base.gst_name,
      gstNo: base.gst_no,
      gstPhone: base.gst_phone,
      gstEmail: base.gst_email,
      gstAddress: base.gst_address,
    },
    products: base.products.map((p) => ({
      productName: p.productName,
      productQuantity: p.productQuantity,
      productPrice: p.productPrice,
      productSerialNo: p.productSerialNo,
    })),
    transport: {
      deliveredBy: base.delivered_by,
      deliveryDate: base.delivery_date || null,
    },
    paidStatus: base.paid_status,
    paymentType: base.payment_type,
    aquakartOnlineUser: base.aquakart_online_user,
    aquakartInvoice: base.aquakart_invoice,
    total_amount: total,
    user_id: user?.id,
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const total = calculateTotal(formData.products);

    const invoiceData = buildApiPayload(formData, total);

    try {
      if (editingInvoice) {
        const { error } = await invoicesService.update(editingInvoice.id, invoiceData);

        if (error) throw error;

        showToast('Invoice updated successfully', 'success');
        fetchInvoices();
        resetForm();
      } else {
        const { error } = await invoicesService.create(invoiceData);

        if (error) throw error;

        showToast('Invoice created successfully', 'success');
        fetchInvoices();
        resetForm();
      }
    } catch (error) {
      showToast('Failed to save invoice', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this invoice?');
    if (!confirmed) return;

    try {
      const { error } = await invoicesService.delete(id);

      if (error) throw error;

      showToast('Invoice deleted successfully', 'success');
      fetchInvoices();
    } catch (error) {
      showToast('Failed to delete invoice', 'error');
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      invoice_no: invoice.invoice_no || '',
      date: invoice.date || new Date().toISOString().split('T')[0],
      customer_name: invoice.customer_name || '',
      customer_phone: invoice.customer_phone || '',
      customer_email: invoice.customer_email || '',
      customer_address: invoice.customer_address || '',
      gst: Boolean(invoice.gst),
      po: Boolean(invoice.po),
      quotation: Boolean(invoice.quotation),
      gst_name: invoice.gst_name || '',
      gst_no: invoice.gst_no || '',
      gst_phone: invoice.gst_phone || '',
      gst_email: invoice.gst_email || '',
      gst_address: invoice.gst_address || '',
      products: invoice.products || [],
      delivered_by: invoice.delivered_by || '',
      delivery_date: invoice.delivery_date || '',
      paid_status: invoice.paid_status || 'unpaid',
      payment_type: invoice.payment_type || 'cash',
      aquakart_online_user: Boolean(invoice.aquakart_online_user),
      aquakart_invoice: Boolean(invoice.aquakart_invoice),
    });
    setShowModal(true);
  };

  const handleClone = (invoice: Invoice) => {
    const today = new Date().toISOString().split('T')[0];
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newInvoiceNo = `${invoice.invoice_no.split('|')[0]}|${randomSuffix}`;

    setEditingInvoice(null);
    setFormData({
      invoice_no: newInvoiceNo,
      date: today,
      customer_name: invoice.customer_name,
      customer_phone: invoice.customer_phone,
      customer_email: invoice.customer_email,
      customer_address: invoice.customer_address,
      gst: invoice.gst,
      po: invoice.po,
      quotation: invoice.quotation,
      gst_name: invoice.gst_name || '',
      gst_no: invoice.gst_no || '',
      gst_phone: invoice.gst_phone || '',
      gst_email: invoice.gst_email || '',
      gst_address: invoice.gst_address || '',
      products: invoice.products,
      delivered_by: '',
      delivery_date: '',
      paid_status: 'unpaid',
      payment_type: invoice.payment_type,
      aquakart_online_user: invoice.aquakart_online_user,
      aquakart_invoice: invoice.aquakart_invoice,
    });
    setShowModal(true);
  };

  const handleView = (invoice: Invoice) => {
    setViewingInvoice(invoice);
    setShowViewModal(true);
  };

  const fetchProducts = async () => {
    const { data, error } = await productsService.getAll();
  

    if (!error && data) {
      const activeProducts = data as DbProduct[];
      setAvailableProducts(
        activeProducts?.data?.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          sku: p.sku ?? null,
        }))
      );
    }
  };

  const handleProductSelect = (productName: string) => {
    const selectedProduct = availableProducts.find((p) => p.name === productName);
    if (selectedProduct) {
      setProductForm({
        ...productForm,
        productName: selectedProduct.name,
        productPrice: selectedProduct.price,
      });
    } else {
      setProductForm({
        ...productForm,
        productName: productName,
      });
    }
  };

  const addProduct = () => {
    if (productForm.productName && productForm.productPrice > 0) {
      if (editingProductIndex !== null) {
        const updatedProducts = [...formData.products];
        updatedProducts[editingProductIndex] = { ...productForm };
        setFormData({
          ...formData,
          products: updatedProducts,
        });
        setEditingProductIndex(null);
      } else {
        setFormData({
          ...formData,
          products: [...formData.products, { ...productForm }],
        });
      }
      setProductForm({
        productName: '',
        productQuantity: 1,
        productPrice: 0,
        productSerialNo: '',
      });
    }
  };

  const editProduct = (index: number) => {
    const product = formData.products[index];
    setProductForm({
      productName: product.productName,
      productQuantity: product.productQuantity,
      productPrice: product.productPrice,
      productSerialNo: product.productSerialNo || '',
    });
    setEditingProductIndex(index);
  };

  const cancelEditProduct = () => {
    setProductForm({
      productName: '',
      productQuantity: 1,
      productPrice: 0,
      productSerialNo: '',
    });
    setEditingProductIndex(null);
  };

  const removeProduct = (index: number) => {
    setFormData({
      ...formData,
      products: formData.products.filter((_, i) => i !== index),
    });
    if (editingProductIndex === index) {
      cancelEditProduct();
    }
  };

  const resetForm = () => {
    setEditingProductIndex(null);
    setProductForm({
      productName: '',
      productQuantity: 1,
      productPrice: 0,
      productSerialNo: '',
    });
    setFormData({
      invoice_no: '',
      date: new Date().toISOString().split('T')[0],
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      customer_address: '',
      gst: false,
      po: false,
      quotation: false,
      gst_name: '',
      gst_no: '',
      gst_phone: '',
      gst_email: '',
      gst_address: '',
      products: [],
      delivered_by: '',
      delivery_date: '',
      paid_status: 'unpaid',
      payment_type: 'cash',
      aquakart_online_user: false,
      aquakart_invoice: false,
    });
    setEditingInvoice(null);
    setShowModal(false);
  };

  const statusStyles = {
    paid: {
      badge: 'bg-emerald-100 text-emerald-800',
      cell: 'bg-emerald-50/60',
      row: 'border-l-4 border-emerald-200 bg-emerald-50/30',
    },
    partial: {
      badge: 'bg-amber-100 text-amber-800',
      cell: 'bg-amber-50/60',
      row: 'border-l-4 border-amber-200 bg-amber-50/30',
    },
    unpaid: {
      badge: 'bg-rose-100 text-rose-800',
      cell: 'bg-rose-50/60',
      row: 'border-l-4 border-rose-200 bg-rose-50/30',
    },
  };

  const statusIcons = {
    paid: CheckCircle,
    partial: Clock,
    unpaid: XCircle,
  };

  const fallbackId = () => `inv-${Math.random().toString(36).slice(2, 10)}`;

  const getStatusMeta = (status: string) => {
    const Icon = statusIcons[status as keyof typeof statusIcons] ?? CheckCircle;
    const style = statusStyles[status as keyof typeof statusStyles] ?? {
      badge: 'bg-slate-100 text-slate-700',
      cell: 'bg-slate-50',
      row: 'border-l-4 border-slate-200 bg-slate-50/30',
    };
    return { Icon, badgeClass: style.badge, cellClass: style.cell, rowClass: style.row };
  };

  const mapInvoiceFromApi = (inv: any): Invoice => {
    const customer = inv.customerDetails ?? {};
    const gstDetails = inv.gstDetails ?? {};
    const transport = inv.transport ?? {};
    const paidStatus = inv.paid_status ?? inv.paidStatus ?? inv.payment_status ?? 'unpaid';
    const paymentType = inv.payment_type ?? inv.paymentType ?? 'cash';

    const products = Array.isArray(inv.products)
      ? inv.products.map((p: any) => ({
          productName: p.productName ?? p.name ?? '',
          productQuantity: Number(p.productQuantity ?? p.quantity ?? 1) || 1,
          productPrice: Number(p.productPrice ?? p.unit_price ?? 0) || 0,
          productSerialNo: p.productSerialNo ?? p.serial_no ?? '',
        }))
      : [];

    const computedTotal = products.reduce(
      (sum, p) => sum + p.productPrice * p.productQuantity,
      0
    );

    return {
      id: inv.id ?? inv._id ?? inv.invoice_id ?? fallbackId(),
      invoice_no: inv.invoice_no ?? inv.invoiceNo ?? inv.invoice_number ?? '',
      date: inv.date || inv.issue_date || inv.created_at || inv.createdAt || new Date().toISOString(),
      customer_name: customer.name ?? inv.customer_name ?? '',
      customer_phone: (customer.phone ?? inv.customer_phone ?? '').toString(),
      customer_email: customer.email ?? inv.customer_email ?? '',
      customer_address: customer.address ?? inv.customer_address ?? '',
      gst: Boolean(inv.gst),
      po: Boolean(inv.po),
      quotation: Boolean(inv.quotation),
      gst_name: gstDetails.gstName ?? inv.gst_name ?? null,
      gst_no: gstDetails.gstNo ?? inv.gst_no ?? null,
      gst_phone: gstDetails.gstPhone?.toString?.() ?? inv.gst_phone ?? null,
      gst_email: gstDetails.gstEmail ?? inv.gst_email ?? null,
      gst_address: gstDetails.gstAddress ?? inv.gst_address ?? null,
      products,
      delivered_by: transport.deliveredBy ?? inv.delivered_by ?? null,
      delivery_date: transport.deliveryDate ?? inv.delivery_date ?? null,
      paid_status: paidStatus,
      payment_type: paymentType,
      aquakart_online_user: Boolean(inv.aquakart_online_user ?? inv.aquakartOnlineUser),
      aquakart_invoice: Boolean(inv.aquakart_invoice ?? inv.aquakartInvoice),
      total_amount: Number(inv.total_amount ?? inv.total ?? computedTotal) || 0,
      created_at: inv.created_at ?? inv.createdAt ?? new Date().toISOString(),
    };
  };

  const totalValue = Array.isArray(filteredInvoices)
    ? filteredInvoices.reduce((total, inv) => total + (Number(inv.total_amount) || 0), 0)
    : 0;
  const totalInvoices = Array.isArray(filteredInvoices) ? filteredInvoices.length : 0;
  const averageSale = totalInvoices > 0 ? totalValue / totalInvoices : 0;
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];
  const selectedYearLabel = selectedYear === 'all' ? 'All Years' : selectedYear;
  const selectedMonthLabel =
    selectedMonth === 'all'
      ? 'All Months'
      : months.find((m) => m.value === selectedMonth)?.label || '';
  const formatAmount = (value: number) =>
    Number.isFinite(value)
      ? new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 0,
        }).format(value)
      : '₹0';
  const formatCount = (value: number) => (Number.isFinite(value) ? `${value}` : '0');
  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString() : '—';

  const exportToCsv = () => {
    if (!filteredInvoices.length) {
      showToast('No invoices to export', 'error');
      return;
    }

    const headers = [
      'Invoice No',
      'Date',
      'Customer',
      'Phone',
      'Email',
      'Address',
      'GST',
      'PO',
      'Quotation',
      'Payment Type',
      'Delivery Date',
      'Delivered By',
      'Amount',
      'Status',
    ];

    const rows = filteredInvoices.map((inv) => [
      inv.invoice_no,
      formatDate(inv.date),
      inv.customer_name,
      inv.customer_phone,
      inv.customer_email,
      inv.customer_address,
      inv.gst ? 'Yes' : 'No',
      inv.po ? 'Yes' : 'No',
      inv.quotation ? 'Yes' : 'No',
      inv.payment_type,
      formatDate(inv.delivery_date),
      inv.delivered_by,
      formatAmount(Number(inv.total_amount) || 0),
      inv.paid_status,
    ]);

    const escapeCsv = (value: string) => `"${(value || '').replace(/"/g, '""')}"`;
    const csv = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map((v) => escapeCsv(String(v ?? ''))).join(','))].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'invoices.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToPdf = () => {
    if (!filteredInvoices.length) {
      showToast('No invoices to export', 'error');
      return;
    }

    const win = window.open('', '_blank');
    if (!win) {
      showToast('Unable to open print window', 'error');
      return;
    }

    const rows = filteredInvoices
      .map(
        (inv) => `
        <tr>
          <td>${inv.invoice_no}</td>
          <td>${formatDate(inv.date)}</td>
          <td>${inv.customer_name}</td>
          <td>${inv.customer_phone}</td>
          <td>${inv.customer_email}</td>
          <td>${(inv.customer_address || '').slice(0, 50)}</td>
          <td>${formatAmount(Number(inv.total_amount) || 0)}</td>
          <td>${inv.paid_status}</td>
        </tr>
      `
      )
      .join('');

    win.document.write(`
      <html>
        <head>
          <title>Invoices</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; }
            th { background: #f8fafc; text-align: left; }
          </style>
        </head>
        <body>
          <h2>Invoices Export</h2>
          <table>
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Address</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 200);
  };

  const currentYear = new Date().getFullYear();
  const invoiceYears = invoices
    .map((invoice) => new Date(invoice.date).getFullYear())
    .filter((year) => !Number.isNaN(year));
  const yearsSet = new Set<number>(invoiceYears);
  for (let i = 0; i < 5; i++) {
    yearsSet.add(currentYear - i);
  }
  const years = Array.from(yearsSet).sort((a, b) => b - a);
  const yearOptions = [...years, 'All Years'];

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
          <h2 className="text-2xl font-bold text-slate-900">Invoices</h2>
          <p className="text-slate-600 mt-1">Manage customer invoices and billing</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={exportToPdf}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-5 h-5" />
            Export PDF
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={exportToCsv}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown className="w-5 h-5" />
            Export Excel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={importInvoicesFromAPI}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            {importing ? 'Importing...' : 'Import from API'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Create Invoice
          </motion.button>
        </div>
      </div>

      {importStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`mb-4 p-4 rounded-lg ${
            importStatus.includes('Error')
              ? 'bg-red-50 text-red-700 border border-red-200'
              : importStatus.includes('complete')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {importStatus}
        </motion.div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl mb-6">
        <div className="border-b border-slate-200">
          <nav className="flex">
            <button
              onClick={() => setInvoiceTypeFilter('all')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all relative ${
                invoiceTypeFilter === 'all'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              All Invoices
            </button>
            <button
              onClick={() => setInvoiceTypeFilter('gst')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all relative ${
                invoiceTypeFilter === 'gst'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              GST Invoices
            </button>
            <button
              onClick={() => setInvoiceTypeFilter('po')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all relative ${
                invoiceTypeFilter === 'po'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              PO Invoices
            </button>
          </nav>
        </div>
      </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-6">
              <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium text-slate-700 mb-2">Month</label>
            <select
              value={selectedMonth === 'all' ? 'all' : selectedMonth.toString()}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedMonth(value === 'all' ? 'all' : parseInt(value, 10));
              }}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">All Months</option>
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium text-slate-700 mb-2">Year</label>
            <select
              value={selectedYear === 'all' ? 'all' : selectedYear.toString()}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedYear(value === 'all' ? 'all' : parseInt(value, 10));
              }}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {yearOptions.map((year) => {
                const value = typeof year === 'number' ? year.toString() : 'all';
                const label = typeof year === 'number' ? year : 'All Years';
                return (
                  <option key={value} value={value}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-slate-600 mb-1">Total Value</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{formatAmount(totalValue)}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-slate-600 mb-1">Total Invoices</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{formatCount(totalInvoices)}</p>
          </div>
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-lg p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-slate-600 mb-1">Average Sale</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{formatAmount(averageSale)}</p>
          </div>
        </div>
      </div>

      <div className="hidden md:block bg-white border border-slate-200 rounded-xl">
        <div className="overflow-visible">
          <table className="w-full table-fixed break-words">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Invoice No</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Date</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-700 uppercase w-36">Customer</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-700 uppercase w-32">Phone</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-700 uppercase w-48">Email</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-700 uppercase w-64">Address</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Flags</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Payment Type</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Delivery</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Amount</th>
                
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                    No invoices found for {selectedMonthLabel} {selectedYearLabel}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => {
                  const { Icon: StatusIcon, badgeClass, cellClass, rowClass } = getStatusMeta(
                    invoice.paid_status
                  );
                  return (
                    <Fragment key={invoice.id}>
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`hover:bg-slate-50 transition-colors ${rowClass}`}
                    >
                      <td className="px-4 py-4 text-sm font-medium text-slate-900 align-top leading-relaxed truncate">
                        {invoice.invoice_no || (invoice as any).invoiceNo || (invoice as any).invoice_number || '—'}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600 align-top leading-relaxed truncate">
                        {formatDate(invoice.date)}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-900 align-top leading-relaxed truncate">{invoice.customer_name}</td>
                      <td className="px-4 py-4 text-sm text-slate-600 align-top leading-relaxed truncate">{invoice.customer_phone}</td>
                      <td className="px-4 py-4 text-sm text-slate-600 align-top leading-relaxed truncate" title={invoice.customer_email}>
                        {invoice.customer_email || '—'}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600 align-top leading-relaxed truncate" title={invoice.customer_address}>
                        {(invoice.customer_address || '—').slice(0, 30)}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700 align-top leading-relaxed">
                        <div className="flex flex-wrap gap-1">
                          {invoice.gst && (
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-100">GST</span>
                          )}
                          {invoice.po && (
                            <span className="px-2 py-1 text-xs rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">PO</span>
                          )}
                          {invoice.quotation && (
                            <span className="px-2 py-1 text-xs rounded-full bg-amber-50 text-amber-700 border border-amber-100">Quotation</span>
                          )}
                          {!invoice.gst && !invoice.po && !invoice.quotation && (
                            <span className="px-2 py-1 text-xs rounded-full bg-slate-50 text-slate-600 border border-slate-100">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600 capitalize align-top leading-relaxed truncate">{invoice.payment_type || '—'}</td>
                      <td className="px-4 py-4 text-sm text-slate-600 align-top leading-relaxed truncate">
                        <span>{formatDate(invoice.delivery_date)}</span>
                        {invoice.delivered_by ? <span className="ml-2 text-xs text-slate-500">{invoice.delivered_by}</span> : null}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-green-600 align-top leading-relaxed text-right whitespace-nowrap truncate">
                        {formatAmount(Number(invoice.total_amount) || 0)}
                      </td>
                  

                    </motion.tr>
                    <tr className="bg-slate-50/60">
                      <td colSpan={10} className="px-4 pb-4 pt-2">
                        <div className={`flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200 rounded-b-xl ${rowClass}`}>
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full ${badgeClass}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {invoice.paid_status}
                          </span>
                          <div className="flex flex-wrap gap-2 ml-auto">
                            <button
                              onClick={() => navigate(`/invoice/${invoice.id}`)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded transition-colors text-sm font-medium"
                              title="Open Invoice"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>Open</span>
                            </button>
                            <button
                              onClick={() => handleView(invoice)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors text-sm font-medium"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                              <span>View</span>
                            </button>
                            <button
                              onClick={() => alert('Invoice sent to ' + invoice.customer_email)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded transition-colors text-sm font-medium"
                              title="Send"
                            >
                              <Send className="w-4 h-4" />
                              <span>Send</span>
                            </button>
                            <button
                              onClick={() => handleClone(invoice)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded transition-colors text-sm font-medium"
                              title="Clone"
                            >
                              <Copy className="w-4 h-4" />
                              <span>Clone</span>
                            </button>
                            <button
                              onClick={() => handleEdit(invoice)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors text-sm font-medium"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(invoice.id)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors text-sm font-medium"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden space-y-4">
        {filteredInvoices.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <p className="text-slate-500">
              No invoices found for {months.find(m => m.value === selectedMonth)?.label} {selectedYearLabel}
            </p>
          </div>
        ) : (
          filteredInvoices.map((invoice) => {
            const { Icon: StatusIcon, badgeClass } = getStatusMeta(invoice.paid_status);
            return (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-200 rounded-xl p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      {invoice.invoice_no || (invoice as any).invoiceNo || (invoice as any).invoice_number || '—'}
                    </h3>
                    <p className="text-sm text-slate-600">{formatDate(invoice.date)}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full ${
                      badgeClass
                    }`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {invoice.paid_status}
                  </span>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Customer</span>
                    <span className="font-medium text-slate-900">{invoice.customer_name}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Phone</span>
                    <span className="text-slate-900">{invoice.customer_phone}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Email</span>
                    <span className="text-slate-900 text-right whitespace-pre-wrap break-words">{invoice.customer_email || '—'}</span>
                  </div>
                  <div className="flex items-start justify-between text-sm">
                    <span className="text-slate-600">Address</span>
                    <span className="text-slate-900 text-right whitespace-pre-wrap break-words">{invoice.customer_address || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Payment</span>
                    <span className="text-slate-900 capitalize">{invoice.payment_type || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Delivery</span>
                    <span className="text-slate-900 text-right">
                      {formatDate(invoice.delivery_date)}
                      {invoice.delivered_by ? ` · ${invoice.delivered_by}` : ''}
                    </span>
                  </div>
                  <div className="flex items-start justify-between text-sm">
                    <span className="text-slate-600">Flags</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {invoice.gst && (
                        <span className="px-2 py-1 text-[11px] rounded-full bg-blue-50 text-blue-700 border border-blue-100">GST</span>
                      )}
                      {invoice.po && (
                        <span className="px-2 py-1 text-[11px] rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">PO</span>
                      )}
                      {invoice.quotation && (
                        <span className="px-2 py-1 text-[11px] rounded-full bg-amber-50 text-amber-700 border border-amber-100">Quotation</span>
                      )}
                      {!invoice.gst && !invoice.po && !invoice.quotation && (
                        <span className="px-2 py-1 text-[11px] rounded-full bg-slate-50 text-slate-600 border border-slate-100">None</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Amount</span>
                    <span className="font-bold text-green-600">{formatAmount(Number(invoice.total_amount) || 0)}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-3 border-t border-slate-200">
                  <button
                    onClick={() => navigate(`/invoice/${invoice.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-violet-50 hover:bg-violet-100 text-violet-600 rounded-lg transition-colors text-sm font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open
                  </button>
                  <button
                    onClick={() => handleView(invoice)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => handleClone(invoice)}
                    className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg transition-colors"
                    title="Clone"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(invoice)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(invoice.id)}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {filteredInvoices.length === 0 && invoices.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No invoices yet</h3>
          <p className="text-slate-600">Create your first invoice to get started</p>
        </motion.div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={resetForm}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">
                {editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Invoice Number
                    </label>
                    <input
                      type="text"
                      value={formData.invoice_no}
                      onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-slate-900 mb-3">Customer Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                      <input
                        type="text"
                        value={formData.customer_name}
                        onChange={(e) =>
                          setFormData({ ...formData, customer_name: e.target.value })
                        }
                        required
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={formData.customer_phone}
                        onChange={(e) =>
                          setFormData({ ...formData, customer_phone: e.target.value })
                        }
                        required
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={formData.customer_email}
                        onChange={(e) =>
                          setFormData({ ...formData, customer_email: e.target.value })
                        }
                        required
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Address
                      </label>
                      <input
                        type="text"
                        value={formData.customer_address}
                        onChange={(e) =>
                          setFormData({ ...formData, customer_address: e.target.value })
                        }
                        required
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-slate-900 mb-3">Products</h4>
                  <div className="grid grid-cols-5 gap-3 mb-3">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Product Name (type or select)"
                        value={productForm.productName}
                        onChange={(e) => handleProductSelect(e.target.value)}
                        list="products-list"
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm w-full"
                      />
                      <datalist id="products-list">
                        {availableProducts.map((product) => (
                          <option key={product.id} value={product.name}>
                            {product.sku && `${product.sku} - `}₹{product.price}
                          </option>
                        ))}
                      </datalist>
                    </div>
                    <input
                      type="number"
                      placeholder="Quantity"
                      value={productForm.productQuantity}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          productQuantity: parseInt(e.target.value) || 1,
                        })
                      }
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={productForm.productPrice || ''}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          productPrice: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Serial No (optional)"
                      value={productForm.productSerialNo}
                      onChange={(e) =>
                        setProductForm({ ...productForm, productSerialNo: e.target.value })
                      }
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                    <button
                      type="button"
                      onClick={addProduct}
                      disabled={!productForm.productName || productForm.productPrice <= 0}
                      className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                        !productForm.productName || productForm.productPrice <= 0
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {editingProductIndex !== null ? 'Update' : 'Add'}
                    </button>
                    {editingProductIndex !== null && (
                      <button
                        type="button"
                        onClick={cancelEditProduct}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {formData.products.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {formData.products.map((product, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            editingProductIndex === index
                              ? 'bg-blue-50 border-2 border-blue-300'
                              : 'bg-slate-50'
                          }`}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{product.productName}</p>
                            <p className="text-xs text-slate-600">
                              Qty: {product.productQuantity} × ₹{product.productPrice} = ₹
                              {product.productQuantity * product.productPrice}
                              {product.productSerialNo && ` | SN: ${product.productSerialNo}`}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => editProduct(index)}
                              className="text-blue-600 hover:text-blue-700"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeProduct(index)}
                              className="text-red-600 hover:text-red-700"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="font-bold text-slate-900">
                          Total: {formatAmount(calculateTotal(formData.products))}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Payment Status
                    </label>
                    <select
                      value={formData.paid_status}
                      onChange={(e) => setFormData({ ...formData, paid_status: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="unpaid">Unpaid</option>
                      <option value="partial">Partial</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Payment Type
                    </label>
                    <select
                      value={formData.payment_type}
                      onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="upi">UPI</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-medium"
                  >
                    {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={resetForm}
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
        {showViewModal && viewingInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowViewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8"
            >
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Invoice Details</h2>
                <p className="text-lg font-semibold text-blue-600">{viewingInvoice.invoice_no}</p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Date</p>
                    <p className="font-medium">{formatDate(viewingInvoice.date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Status</p>
                    {(() => {
                      const { badgeClass } = getStatusMeta(viewingInvoice.paid_status);
                      return (
                        <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${badgeClass}`}>
                          {viewingInvoice.paid_status}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-slate-900 mb-3">Customer Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Name</p>
                      <p className="font-medium">{viewingInvoice.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Phone</p>
                      <p className="font-medium">{viewingInvoice.customer_phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Email</p>
                      <p className="font-medium">{viewingInvoice.customer_email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Address</p>
                      <p className="font-medium">{viewingInvoice.customer_address}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-slate-900 mb-3">Products</h4>
                  <div className="space-y-2">
                    {viewingInvoice.products.map((product, index) => (
                      <div key={index} className="bg-slate-50 p-3 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{product.productName}</p>
                            {product.productSerialNo && (
                              <p className="text-xs text-slate-600">SN: {product.productSerialNo}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {formatAmount(product.productPrice * product.productQuantity)}
                            </p>
                            <p className="text-xs text-slate-600">
                              {product.productQuantity} × ₹{product.productPrice}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-lg">Total Amount</p>
                        <p className="font-bold text-2xl">
                          {formatAmount(Number(viewingInvoice.total_amount) || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Payment Type</p>
                    <p className="font-medium capitalize">{viewingInvoice.payment_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Payment Status</p>
                    <p className="font-medium capitalize">{viewingInvoice.paid_status}</p>
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowViewModal(false)}
                className="w-full mt-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                Close
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
