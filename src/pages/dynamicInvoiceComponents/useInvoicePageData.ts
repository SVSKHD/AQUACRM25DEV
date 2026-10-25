import { useEffect, useState } from "react";
import { invoicesService, productsService } from "../../services/apiService";
import type { DbProduct, Invoice } from "./types/invoice.types";
import { mapInvoiceFromApi, mapSuggestedProducts } from "./invoiceUtils";

export const useInvoicePageData = (invoiceId?: string) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [suggestedProducts, setSuggestedProducts] = useState<DbProduct[]>([]);
  // Unmapped API data for the customer PDF (storefront generator normalizes it itself).
  const [rawInvoice, setRawInvoice] = useState<unknown>(null);
  const [cataloguePayload, setCataloguePayload] = useState<unknown>(null);

  useEffect(() => {
    const fetchPageData = async () => {
      if (!invoiceId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [invoiceResponse, productsResponse] = await Promise.all([
          invoicesService.fetchById(invoiceId),
          productsService.getAll(),
        ]);

        setInvoice(mapInvoiceFromApi(invoiceResponse.data));
        setSuggestedProducts(mapSuggestedProducts(productsResponse.data));
        setRawInvoice(invoiceResponse.data ?? null);
        setCataloguePayload(productsResponse.data ?? null);
      } catch (error) {
        console.error("Error fetching invoice page data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPageData();
  }, [invoiceId]);

  return { invoice, loading, suggestedProducts, rawInvoice, cataloguePayload };
};
