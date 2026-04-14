import { createRouter, createWebHistory } from "vue-router"

import CreateView from "@/views/CreateView.vue"
import ListView from "@/views/ListView.vue"
import OptionsView from "@/views/OptionsView.vue"
import PresetDetailView from "@/views/preset/PresetDetailView.vue"
import PresetEmptyView from "@/views/preset/PresetEmptyView.vue"
import PresetView from "@/views/PresetView.vue"
import TemplateView from "@/views/TemplateView.vue"

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/preset" },
    {
      path: "/preset",
      component: PresetView,
      meta: { title: "预设" },
      children: [
        {
          path: "",
          name: "preset",
          component: PresetEmptyView,
          meta: { title: "预设" },
        },
        {
          path: ":presetId",
          name: "preset-detail",
          component: PresetDetailView,
          meta: { title: "预设" },
        },
      ],
    },
    {
      path: "/options",
      name: "options",
      component: OptionsView,
      meta: { title: "选项" },
    },
    {
      path: "/template",
      name: "template",
      component: TemplateView,
      meta: { title: "模板" },
    },
    {
      path: "/create",
      name: "create",
      component: CreateView,
      meta: { title: "创建" },
    },
    {
      path: "/list",
      name: "list",
      component: ListView,
      meta: { title: "列表" },
    },
  ],
})
