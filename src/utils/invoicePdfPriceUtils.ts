// @ts-nocheck
const GST_RATE = 0.18;

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toPaise = (value) => Math.round(toFiniteNumber(value) * 100);
const fromPaise = (value) => value / 100;

const belowHundredToWords = (value) => {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  if (value < 20) return ones[value];
  return [tens[Math.floor(value / 10)], ones[value % 10]]
    .filter(Boolean)
    .join(" ");
};

const integerToIndianWords = (value) => {
  if (value === 0) return "Zero";

  let remaining = value;
  const words = [];
  const groups = [
    [10_000_000, "Crore"],
    [100_000, "Lakh"],
    [1_000, "Thousand"],
    [100, "Hundred"],
  ];

  groups.forEach(([divisor, label]) => {
    if (remaining < divisor) return;

    const groupValue = Math.floor(remaining / divisor);
    words.push(integerToIndianWords(groupValue), label);
    remaining %= divisor;
  });

  if (remaining > 0) {
    if (words.length) words.push("and");
    words.push(belowHundredToWords(remaining));
  }

  return words.filter(Boolean).join(" ");
};

/**
 * Money helpers used by both the public invoice and its PDF export.
 * GST is treated as included in the displayed selling price.
 */
const priceUtils = {
  GST_RATE,

  getBasePrice(price) {
    return this.getGSTBreakdown(price).basePrice;
  },

  getGSTValue(price) {
    return this.getGSTBreakdown(price).gstValue;
  },

  getGSTBreakdown(price) {
    const grossPaise = Math.max(toPaise(price), 0);
    const basePaise = Math.round(grossPaise / (1 + GST_RATE));
    const gstPaise = grossPaise - basePaise;
    const cgstPaise = Math.floor(gstPaise / 2);
    const sgstPaise = gstPaise - cgstPaise;

    return {
      grossPrice: fromPaise(grossPaise),
      basePrice: fromPaise(basePaise),
      gstValue: fromPaise(gstPaise),
      cgstValue: fromPaise(cgstPaise),
      sgstValue: fromPaise(sgstPaise),
    };
  },

  getInvoiceAmounts(invoice) {
    const products = Array.isArray(invoice?.products) ? invoice.products : [];
    const itemsTotalPaise = products.reduce((total, product) => {
      return total + toPaise(product?.productPrice);
    }, 0);

    const suppliedTotal = Number(invoice?.total_amount);
    const grandTotalPaise =
      itemsTotalPaise > 0
        ? itemsTotalPaise
        : Number.isFinite(suppliedTotal) && suppliedTotal >= 0
          ? toPaise(suppliedTotal)
          : 0;
    const tax = this.getGSTBreakdown(fromPaise(grandTotalPaise));
    const grandTotal = tax.basePrice + tax.gstValue;

    return {
      itemsTotal: fromPaise(itemsTotalPaise),
      grandTotal,
      ...tax,
    };
  },

  formatAmount(value, options = {}) {
    const { showPaise = true } = options;
    return Number.isFinite(Number(value))
      ? new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          minimumFractionDigits: showPaise ? 2 : 0,
          maximumFractionDigits: showPaise ? 2 : 0,
        }).format(Number(value))
      : "₹0.00";
  },

  formatCount(value) {
    return Number.isFinite(Number(value)) ? `${Number(value)}` : "0";
  },

  numberToWords(value) {
    const amountPaise = Math.max(toPaise(value), 0);
    const rupees = Math.floor(amountPaise / 100);
    const paise = amountPaise % 100;
    const rupeeWords = `${integerToIndianWords(rupees)} Rupees`;
    const paiseWords = paise ? ` and ${integerToIndianWords(paise)} Paise` : "";

    return `${rupeeWords}${paiseWords} Only`;
  },
};

export default priceUtils;
export { GST_RATE, toFiniteNumber };
