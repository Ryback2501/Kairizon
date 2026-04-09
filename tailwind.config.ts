import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          canvas: "#ffffff",
          charcoal: "#242424",
          midnight: "#111111",
          gray: "#898989",
          subtle: "#f5f5f5",
        },
      },
      fontFamily: {
        cal: ["Cal Sans", "Inter", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      boxShadow: {
        card: "rgba(19,19,22,0.7) 0px 1px 5px -4px, rgba(34,42,53,0.08) 0px 0px 0px 1px, rgba(34,42,53,0.05) 0px 4px 8px 0px",
        "card-hover":
          "rgba(19,19,22,0.7) 0px 2px 8px -4px, rgba(34,42,53,0.12) 0px 0px 0px 1px, rgba(34,42,53,0.08) 0px 8px 16px 0px",
        "button-inset": "rgba(255,255,255,0.15) 0px 2px 0px inset",
        input: "rgba(0,0,0,0.16) 0px 1px 1.9px 0px inset",
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "8px",
        md: "12px",
        lg: "16px",
        pill: "9999px",
      },
    },
  },
  plugins: [],
};

export default config;
