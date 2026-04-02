import { createRouter, createWebHistory } from 'vue-router'

import CreateView from '@/views/CreateView.vue'
import ListView from '@/views/ListView.vue'
import PresetView from '@/views/PresetView.vue'
import TemplateView from '@/views/TemplateView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/preset' },
    { path: '/preset', name: 'preset', component: PresetView, meta: { title: '预设' } },
    { path: '/template', name: 'template', component: TemplateView, meta: { title: '模板' } },
    { path: '/create', name: 'create', component: CreateView, meta: { title: '创建' } },
    { path: '/list', name: 'list', component: ListView, meta: { title: '列表' } },
  ],
})
