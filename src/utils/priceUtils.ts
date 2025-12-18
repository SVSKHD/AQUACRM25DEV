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
  numberToWords(num: number): string {
    const a = [
      "",
      "One ",
      "Two ",
      "Three ",
      "Four ",
      "Five ",
      "Six ",
      "Seven ",
      "Eight ",
      "Nine ",
      "Ten ",
      "Eleven ",
      "Twelve ",
      "Thirteen ",
      "Fourteen ",
      "Fifteen ",
      "Sixteen ",
      "Seventeen ",
      "Eighteen ",
      "Nineteen ",
    ];
    const b = [
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

    const nStr = num.toString().replace(/[\, ]/g, "");
    if (isNaN(parseFloat(nStr))) return "Not a number";

    // Indian numbering format regex
    const n = ("000000000" + nStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return "";

    let str = "";

    // Crore
    if (Number(n[1]) !== 0) {
      str += (a[Number(n[1])] || b[Number(n[1][0])] + " " + a[Number(n[1][1])]) + "Crore ";
    }
    // Lakh
    if (Number(n[2]) !== 0) {
      str += (a[Number(n[2])] || b[Number(n[2][0])] + " " + a[Number(n[2][1])]) + "Lakh ";
    }
    // Thousand
    if (Number(n[3]) !== 0) {
      str += (a[Number(n[3])] || b[Number(n[3][0])] + " " + a[Number(n[3][1])]) + "Thousand ";
    }
    // Hundred
    if (Number(n[4]) !== 0) {
      str += (a[Number(n[4])] || b[Number(n[4][0])] + " " + a[Number(n[4][1])]) + "Hundred ";
    }
    // Last two digits
    if (Number(n[5]) !== 0) {
      if (str !== "") str += "and ";
      str += (a[Number(n[5])] || b[Number(n[5][0])] + " " + a[Number(n[5][1])]);
    }

    return str ? str + " Rupees Only" : "";
  },
};
export default priceUtils;
