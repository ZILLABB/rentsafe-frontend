import type { Config } from "tailwindcss";

// Design tokens are HSL CSS variables in src/index.css (RentSafe Lagos.dc.html
// palette). Semantic names map onto utilities; score bands (good/mid/bad) drive
// the rating colour system used across the app.
const hsl = (v: string) => `hsl(var(${v}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      // A real scale, so sizes stop being invented per component. The floor is
      // 12px: below that, PropertyIDs and flood labels stop being readable on a
      // mid-range Android in daylight, and they carry load-bearing information.
      fontSize: {
        "2xs": ["0.75rem", { lineHeight: "1.1rem" }],   // 12px — smallest allowed
        xs: ["0.8125rem", { lineHeight: "1.15rem" }],   // 13px
        sm: ["0.875rem", { lineHeight: "1.3rem" }],     // 14px — body
        base: ["0.9375rem", { lineHeight: "1.45rem" }], // 15px
        lg: ["1.0625rem", { lineHeight: "1.5rem" }],    // 17px — card titles
        xl: ["1.1875rem", { lineHeight: "1.55rem" }],   // 19px
        "2xl": ["1.375rem", { lineHeight: "1.6rem" }],  // 22px — scores
        "3xl": ["1.625rem", { lineHeight: "1.75rem" }], // 26px
        "4xl": ["1.875rem", { lineHeight: "2rem" }],    // 30px — hero score
      },
      colors: {
        ink: hsl("--ink"),
        heading: hsl("--heading"),
        background: hsl("--background"),
        foreground: hsl("--foreground"),
        subtle: hsl("--subtle"),
        inset: hsl("--inset"),
        card: { DEFAULT: hsl("--card"), foreground: hsl("--card-foreground") },
        muted: { DEFAULT: hsl("--muted"), foreground: hsl("--muted-foreground") },
        primary: {
          DEFAULT: hsl("--primary"),
          foreground: hsl("--primary-foreground"),
          deep: hsl("--primary-deep"),
        },
        aqua: { DEFAULT: hsl("--aqua"), soft: hsl("--aqua-soft") },
        score: {
          good: hsl("--score-good"),
          mid: hsl("--score-mid"),
          bad: hsl("--score-bad"),
        },
        // Aliases so semantic tones keep working
        success: hsl("--score-good"),
        warning: hsl("--score-mid"),
        danger: hsl("--score-bad"),
        info: hsl("--info"),
        gold: hsl("--gold"),
        insight: { DEFAULT: hsl("--insight-bg"), foreground: hsl("--insight-fg") },
        border: hsl("--border"),
        input: hsl("--input"),
        ring: hsl("--ring"),
        // Illustrative map surfaces — previously raw hex inline in ExplorePage.
        map: {
          land: hsl("--map-land"),
          block: hsl("--map-block"),
          water: hsl("--map-water"),
          road: hsl("--map-road"),
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans Variable"', '"Inter Variable"', "system-ui", "sans-serif"],
        body: ['"Inter Variable"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono Variable"', "ui-monospace", "monospace"],
      },
      fontWeight: {
        500: "500",
        600: "600",
        700: "700",
        800: "800",
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "10px",
        xl: "14px",
        "2xl": "16px",
        "3xl": "30px",
      },
      boxShadow: {
        soft: "0 1px 2px rgb(11 32 39 / 0.05), 0 1px 3px rgb(11 32 39 / 0.06)",
        lift: "0 2px 4px rgb(11 32 39 / 0.04), 0 6px 12px -2px rgb(11 32 39 / 0.08)",
        pop: "0 4px 8px rgb(11 32 39 / 0.05), 0 12px 32px rgb(11 32 39 / 0.12)",
        fab: "0 8px 20px hsl(var(--primary) / 0.4)",
        focus: "0 0 0 3px hsl(var(--ring) / 0.25)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out both",
      },
    },
  },
  plugins: [],
} satisfies Config;
