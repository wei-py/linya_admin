import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetUno,
} from "unocss"

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      scale: 1.1,
      warn: true,
    }),
    presetTypography(),
  ],
  theme: {
    colors: {
      brand: "#0f62fe",
      accent: "#525252",
      surface: "#ffffff",
      canvas: "#f4f4f4",
      border: "#c6c6c6",
      text: "#161616",
    },
  },
  shortcuts: {
    "panel-card": "rounded-[4px] border border-border bg-surface shadow-none",
    "panel-grid": "grid gap-4 md:grid-cols-2 xl:grid-cols-4",
    "section-shell":
      "flex items-center justify-between px-4 py-3 text-left transition-colors",
    "status-pill":
      "inline-flex items-center rounded-full border border-border bg-canvas px-3 py-1 text-xs font-medium text-[#525252]",
  },
})
