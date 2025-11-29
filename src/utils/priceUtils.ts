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
};
export default priceUtils;