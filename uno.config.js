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
      brand: "#0f766e",
      accent: "#f97316",
      surface: "#fffdf8",
    },
  },
  shortcuts: {
    "panel-card": "rounded-6 bg-white/88 shadow-panel backdrop-blur-md",
    "panel-grid": "grid gap-4 md:grid-cols-2 xl:grid-cols-4",
    "section-shell":
      "flex items-center justify-between rounded-5 px-4 py-3 text-left transition",
    "status-pill":
      "rounded-full bg-teal-700 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-teal-700/20",
  },
})
