interface Product {
  productName: string;
  productQuantity: number;
  productPrice: number;
  productSerialNo?: string;
}

interface ProductPhoto {
  id: string;
  secure_url: string;
}

interface DbProduct {
  id: string;
  _id?: string;
  title: string;
  price: number;
  discountPrice: number;
  photos: ProductPhoto[];
  slug: string;
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

export type { Product, DbProduct, Invoice };
