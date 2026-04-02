import { createVuetify } from 'vuetify'

export const vuetify = createVuetify({
  theme: {
    defaultTheme: 'linya',
    themes: {
      linya: {
        dark: false,
        colors: {
          background: '#f5f7fb',
          surface: '#ffffff',
          primary: '#0f766e',
          secondary: '#0f172a',
          accent: '#f97316',
          success: '#16a34a',
          warning: '#d97706',
          error: '#dc2626',
        },
      },
    },
  },
  defaults: {
    VCard: {
      rounded: 'xl',
      elevation: 0,
    },
    VBtn: {
      rounded: 'xl',
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
    },
    VTextarea: {
      variant: 'outlined',
      density: 'comfortable',
    },
  },
})
