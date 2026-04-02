import { createPinia } from "pinia"
import { createApp } from "vue"

import App from "./App.vue"
import { vuetify } from "./plugins/vuetify"
import { router } from "./router"

import "vuetify/styles"
import "@mdi/font/css/materialdesignicons.css"
import "@unocss/reset/tailwind.css"
import "./styles/index.css"

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vuetify)

app.mount("#app")
