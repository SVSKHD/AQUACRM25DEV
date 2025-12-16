import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AquaWhite from "../logo_assets/logo-white.png";
import { productsService } from "../services/apiService";

type RedirectProduct = {
  id: string | number;
  name: string;
  slug?: string | null;
  price: number;
  sku?: string | null;
  image?: string | null;
  images?: string[];
};


const InvoiceRedirect = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invoiceId = useMemo(
    () =>
      searchParams.get("invoiceId") ||
      searchParams.get("id") ||
      searchParams.get("invoice") ||
      "",
    [searchParams],
  );

  const [mobile, setMobile] = useState("");
  const [error, setError] = useState("");
  const [products, setProducts] = useState<RedirectProduct[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = mobile.replace(/\D/g, "");

    if (cleaned.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!invoiceId) {
      setError("Invoice link is missing. Please use the link we shared.");
      return;
    }

    setError("");
    navigate(`/invoice/${invoiceId}`, { state: { mobile: cleaned } });
  };

  const handleMobileChange = (value: string) => {
    const numeric = value.replace(/\D/g, "").slice(0, 10);
    setMobile(numeric);
    if (error) setError("");
  };

  const isReady = mobile.length === 10 && Boolean(invoiceId);

  const makeSlug = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await productsService.getAll();
      if (error || !data) {
        setProducts([]);
        return;
      }

      const normalizePrice = (value: any) => {
        if (value === undefined || value === null) return 0;
        if (typeof value === "number") return value;
        const cleaned = parseFloat(String(value).replace(/[^\d.]/g, ""));
        return Number.isFinite(cleaned) ? cleaned : 0;
      };

      const responsePayload = data as any;
      const productListCandidates = [
        responsePayload?.data?.products,
        responsePayload?.data?.data,
        responsePayload?.data,
        responsePayload?.products,
        responsePayload,
      ];

      const rawProducts =
        productListCandidates.find((item) => Array.isArray(item)) || [];

      const normalized: RedirectProduct[] = rawProducts
        .map((p: any, idx: number) => {
          const imageArray =
            p.images ??
            p.product_images ??
            p.productImages ??
            p.photos ??
            p.gallery ??
            [];
          const images = Array.isArray(imageArray)
            ? imageArray
                .map((img) => {
                  if (typeof img === "string") return img;
                  if (img && typeof img === "object") {
                    return (
                      img.secure_url ||
                      img.url ||
                      img.link ||
                      img.src ||
                      img.image
                    );
                  }
                  return null;
                })
                .filter(Boolean)
            : [];

          const discounted =
            p.discountPriceStatus || p.discount_price_status
              ? p.discountPrice ?? p.discount_price
              : undefined;

          const price = normalizePrice(
            discounted ??
              p.price ??
              p.selling_price ??
              p.salePrice ??
              p.mrp ??
              p.unit_price ??
              0,
          );

          return {
            id: p.id ?? p._id ?? p.product_id ?? p.sku ?? `product-${idx}`,
            name:
              p.name ?? p.title ?? p.product_name ?? p.productName ?? "Product",
            slug: p.slug ?? p.handle ?? p.seo_slug ?? null,
            price,
            sku: p.sku ?? p.sku_code ?? p.skuCode ?? p.code ?? null,
            image:
              p.image_url ??
              p.imageUrl ??
              p.image ??
              p.thumbnail ??
              p.cover ??
              (images[0] ?? null),
            images,
          };
        })
        .filter((p: RedirectProduct) => p.name);

      setProducts(normalized.slice(0, 4));
      setCurrentSlide(0);
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    if (currentSlide >= products.length && products.length > 0) {
      setCurrentSlide(0);
    }
  }, [products.length, currentSlide]);

  const formatINR = (value: number) =>
    Number.isFinite(value)
      ? new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(value)
      : "₹0";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center px-4">
      <div className="w-full max-w-5xl bg-white/10 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-lg p-8 text-white">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                <img
                  src={AquaWhite}
                  alt="Aquakart"
                  className="w-12 h-12 object-contain"
                />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Access your invoice
              </h1>
              <p className="text-sm text-blue-100 text-center">
                Enter the mobile number linked to your purchase to open your
                invoice.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="text-sm font-medium text-blue-100 block">
                Mobile number
              </label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-lg px-3 py-3 focus-within:border-white/60 focus-within:bg-white/15">
                  <span className="text-sm text-blue-50">+91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => handleMobileChange(e.target.value)}
                    className="bg-transparent outline-none w-full text-white placeholder:text-blue-100/60"
                    placeholder="Enter your 10-digit number"
                    autoFocus
                  />
                </div>
                {error && <p className="text-sm text-amber-200">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={!isReady}
                className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
                  isReady
                    ? "bg-white text-blue-900 hover:-translate-y-[1px]"
                    : "bg-white/30 text-blue-100 cursor-not-allowed"
                }`}
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-xs text-blue-100/80 space-y-1">
                <p>
                  We use your mobile number only to confirm access to this
                  invoice.
                </p>
                <p>
                  {invoiceId ? (
                    <>
                      Invoice ID:{" "}
                      <span className="font-semibold text-white">
                        {invoiceId}
                      </span>
                    </>
                  ) : (
                    "Open this page from the invoice link we sent to auto-fill your invoice."
                  )}
                </p>
              </div>
            </form>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Popular products</h2>
              <span className="text-xs text-blue-100/80">
                Showing {products.length || 0} of 4
              </span>
            </div>

            {products.length === 0 ? (
              <div className="text-sm text-blue-100">
                We couldn’t load products right now. Please try again later.
              </div>
            ) : (
              <div className="relative">
                <div className="overflow-hidden rounded-lg">
                  <div
                    className="flex transition-transform duration-500 ease-out"
                    style={{
                      transform: `translateX(-${currentSlide * 100}%)`,
                    }}
                  >
                    {products.map((product) => (
                      <div key={product.id} className="min-w-full px-1">
                        <div className="rounded-xl bg-white/10 border border-white/10 p-4 flex flex-col sm:flex-row gap-4 h-full shadow-lg">
                          <div className="w-full sm:w-48 h-48 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-sm text-blue-100">AK</span>
                            )}
                      </div>
                      <div className="flex-1 flex flex-col gap-2">
                        <p className="text-lg font-semibold leading-tight">
                          {product.name}
                        </p>
                            {product.sku && (
                              <p className="text-xs text-blue-100/80">
                                SKU: {product.sku}
                              </p>
                            )}
                            <p className="text-sm text-blue-100/90">
                              Starts at
                            </p>
                            <p className="text-xl font-bold">
                              {formatINR(product.price)}
                            </p>
                          
                            {product.images && product.images.length > 1 && (
                              <div className="flex items-center gap-2">
                                {product.images.slice(0, 3).map((img, idx) => (
                                  <div
                                    key={idx}
                                    className="w-10 h-10 rounded-md overflow-hidden border border-white/15 bg-white/5"
                                  >
                                    
                                    <img
                                      src={img}
                                      alt={`${product.name} ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-blue-100/80">
                              Explore this and more when you open your invoice.
                            </p>
                            <div className="pt-2">
                              {(() => {
                                const slugCandidate =
                                  product.slug ||
                                  (product.name ? makeSlug(product.name) : "");
                                const productHref = slugCandidate
                                  ? `https://aquakart.co.in/product/${slugCandidate}`
                                  : "#";
                                const hasLink = Boolean(slugCandidate);
                                return (
                                  <a
                                    href={productHref}
                                    target={hasLink ? "_blank" : undefined}
                                    rel="noreferrer"
                                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold transition ${
                                      hasLink
                                        ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                                        : "bg-white/5 border-white/10 text-blue-100 cursor-not-allowed"
                                    }`}
                                    aria-label="Open product"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                    View product
                                  </a>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 pointer-events-none">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentSlide((prev) =>
                        prev === 0 ? products.length - 1 : prev - 1,
                      )
                    }
                    className="pointer-events-auto p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
                    aria-label="Previous product"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentSlide((prev) =>
                        prev === products.length - 1 ? 0 : prev + 1,
                      )
                    }
                    className="pointer-events-auto p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
                    aria-label="Next product"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2 mt-4">
                  {products.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentSlide(idx)}
                      className={`w-2.5 h-2.5 rounded-full transition ${
                        currentSlide === idx
                          ? "bg-white"
                          : "bg-white/30 hover:bg-white/60"
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceRedirect;
