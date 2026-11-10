/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // Pass 2 theme tokens (light values in :root, dark values under .dark in
      // src/styles/liquidControls.css), so components can write `text-aqua-tx3`.
      colors: {
        aqua: Object.fromEntries(
          [
            "tx",
            "tx2",
            "tx3",
            "tx4",
            "acc",
            "acctx",
            "accsoft",
            "accsoft2",
            "card",
            "cardbd",
            "sunk",
            "line",
            "line2",
            "hov",
            "sel",
            "ctl",
            "ctlbd",
            "ctlhov",
            "goodfg",
            "goodbg",
            "warnfg",
            "warnbg",
            "badfg",
            "badbg",
            "neufg",
            "neubg",
            "infofg",
            "infobg",
            "tipbg",
            "tiptx",
            "dangerbg",
            "dangerbd",
            "dangertx",
          ].map((name) => [name, `var(--aqua-${name})`]),
        ),
      },
      boxShadow: { "aqua-card": "var(--aqua-cardsh)" },
      backgroundImage: { "aqua-grad": "var(--aqua-grad)" },
    },
  },
  plugins: [],
};
