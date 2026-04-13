import { createVuetify } from "vuetify"

export const vuetify = createVuetify({
  theme: {
    defaultTheme: "linya",
    themes: {
      linya: {
        dark: false,
        colors: {
          background: "#f4f4f4",
          surface: "#ffffff",
          primary: "#0f62fe",
          secondary: "#525252",
          accent: "#8d8d8d",
          success: "#16a34a",
          warning: "#f1c21b",
          error: "#da1e28",
        },
      },
    },
  },
  defaults: {
    VCard: {
      elevation: 0,
      rounded: "0",
    },
    VBtn: {
      rounded: "0",
      elevation: 0,
      style: "text-transform:none;letter-spacing:0;font-weight:500;",
    },
    VTextField: {
      color: "primary",
      density: "comfortable",
    },
    VTextarea: {
      color: "primary",
      density: "comfortable",
    },
    VSelect: {
      color: "primary",
      density: "comfortable",
    },
    VAutocomplete: {
      color: "primary",
      density: "comfortable",
    },
    VList: {
      bgColor: "transparent",
    },
    VListItem: {
      rounded: "0",
    },
  },
})
