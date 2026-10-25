const IGNORED_NAME_TOKENS = new Set([
  "aquakart",
  "online",
  "product",
  "products",
]);

const getTextValue = (value) => {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";

  return String(value.title ?? value.name ?? value.label ?? "").trim();
};

const firstPhotoUrl = (product) => {
  const firstPhoto = Array.isArray(product?.photos) ? product.photos[0] : null;
  const firstImage = Array.isArray(product?.images) ? product.images[0] : null;
  const candidates = [
    product?.productImage,
    product?.image,
    product?.photo,
    firstPhoto?.secure_url,
    firstPhoto?.delivery_url,
    firstPhoto?.url,
    typeof firstPhoto === "string" ? firstPhoto : null,
    firstImage?.secure_url,
    firstImage?.delivery_url,
    firstImage?.url,
    typeof firstImage === "string" ? firstImage : null,
  ];

  return candidates.find((candidate) => typeof candidate === "string") || "";
};

const getCatalogueArray = (payload, depth = 0) => {
  if (depth > 3) return [];
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.products)) return payload.products;
  if (Array.isArray(payload.data)) return payload.data;

  return getCatalogueArray(payload.data ?? payload.result, depth + 1);
};

export const normalizeProductName = (value) =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token && !IGNORED_NAME_TOKENS.has(token))
    .join(" ");

export const mapCatalogueProducts = (payload) =>
  getCatalogueArray(payload)
    .map((product) => ({
      id: String(product?.id ?? product?._id ?? "").trim(),
      title: String(
        product?.title ?? product?.name ?? product?.productName ?? "",
      ).trim(),
      category: getTextValue(
        product?.category ??
          product?.categoryTitle ??
          product?.categoryName ??
          product?.mainCategory ??
          product?.productCategory,
      ),
      subcategory: getTextValue(
        product?.subcategory ??
          product?.subCategory ??
          product?.subCategoryName ??
          product?.productSubCategory,
      ),
      image: firstPhotoUrl(product),
      slug: String(product?.slug ?? "").trim(),
    }))
    .filter((product) => product.title);

const tokenSet = (value) => new Set(normalizeProductName(value).split(" "));

const hasConflictingModelTokens = (invoiceTokens, catalogueTokens) => {
  const invoiceModelTokens = [...invoiceTokens].filter((token) =>
    /\d/.test(token),
  );
  const catalogueModelTokens = [...catalogueTokens].filter((token) =>
    /\d/.test(token),
  );

  if (!invoiceModelTokens.length || !catalogueModelTokens.length) return false;
  return (
    invoiceModelTokens.some((token) => !catalogueTokens.has(token)) ||
    catalogueModelTokens.some((token) => !invoiceTokens.has(token))
  );
};

const getMatchScore = (invoiceName, catalogueName) => {
  const normalizedInvoice = normalizeProductName(invoiceName);
  const normalizedCatalogue = normalizeProductName(catalogueName);
  if (!normalizedInvoice || !normalizedCatalogue) return 0;
  if (normalizedInvoice === normalizedCatalogue) return 1;

  const invoiceTokens = tokenSet(invoiceName);
  const catalogueTokens = tokenSet(catalogueName);
  if (hasConflictingModelTokens(invoiceTokens, catalogueTokens)) return 0;

  const intersection = [...invoiceTokens].filter((token) =>
    catalogueTokens.has(token),
  ).length;
  const smallestTokenCount = Math.min(invoiceTokens.size, catalogueTokens.size);
  if (intersection < Math.min(2, smallestTokenCount)) return 0;

  const union = new Set([...invoiceTokens, ...catalogueTokens]).size;
  const coverage = intersection / smallestTokenCount;
  const jaccard = union ? intersection / union : 0;
  const isContained =
    normalizedInvoice.includes(normalizedCatalogue) ||
    normalizedCatalogue.includes(normalizedInvoice);

  return coverage * 0.68 + jaccard * 0.22 + (isContained ? 0.1 : 0);
};

export const findCatalogueProduct = (productName, catalogue) => {
  let bestMatch = null;
  let bestScore = 0;

  catalogue.forEach((candidate) => {
    const score = getMatchScore(productName, candidate.title);
    if (score > bestScore) {
      bestMatch = candidate;
      bestScore = score;
    }
  });

  return bestScore >= 0.78 ? bestMatch : null;
};

export const enrichInvoiceProducts = (invoice, cataloguePayload) => {
  if (!invoice) return invoice;

  const catalogue = mapCatalogueProducts(cataloguePayload);
  if (!catalogue.length || !Array.isArray(invoice.products)) return invoice;

  return {
    ...invoice,
    products: invoice.products.map((product) => {
      const match = findCatalogueProduct(product.productName, catalogue);
      if (!match) return product;

      return {
        ...product,
        catalogueProductId: match.id,
        productSlug: match.slug,
        productLink:
          product.productLink ||
          (match.slug
            ? `/product/${encodeURIComponent(match.slug)}`
            : match.id
              ? `/product/${encodeURIComponent(match.id)}`
              : ""),
        productImage: product.productImage || match.image,
        productCategory: product.productCategory || match.category,
        productSubcategory: product.productSubcategory || match.subcategory,
      };
    }),
  };
};
