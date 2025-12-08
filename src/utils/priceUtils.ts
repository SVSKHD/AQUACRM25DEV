// priceUtils.ts

const GST_RATE = 0.18;
const BASE_MULTIPLIER = 0.8474594;

const priceUtils = {
  getBasePrice(price: number): number {
    return Math.floor(price * BASE_MULTIPLIER);
  },

  getGSTValue(price: number): number {
    const basePrice = this.getBasePrice(price);
    return Math.floor(basePrice * GST_RATE);
  },
  formatAmount(value: number): string {
    return Number.isFinite(value)
      ? new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(value)
      : "₹0";
  },
  formatCount(value: number): string {
    return Number.isFinite(value) ? `${value}` : "0";
  },
};
export default priceUtils;
