<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useBoolean } from 'vue-hooks-plus'
import { useRoute, useRouter } from 'vue-router'

import { navigationItems, useAppStore } from './stores/app'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const { projectName, workspaceStats } = storeToRefs(appStore)
const [drawerOpen, drawerActions] = useBoolean(true)

const activePath = computed(() => route.path)

function navigate(path: string) {
  router.push(path)
}
</script>

<template>
  <VApp>
    <div class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.20),_transparent_35%),linear-gradient(180deg,_#fffdf8_0%,_#f5f7fb_100%)]">
      <VNavigationDrawer
        v-model="drawerOpen"
        color="transparent"
        floating
        border="0"
        width="280"
      >
        <div class="m-4 panel-card p-5">
          <div class="text-xs uppercase tracking-[0.25em] text-slate-400">
            Linya Admin
          </div>
        </div>

        <div class="mx-4 mt-4 space-y-3">
          <button
            v-for="item in navigationItems"
            :key="item.to"
            class="flex w-full items-center justify-between rounded-5 px-4 py-3 text-left transition"
            :class="activePath === item.to ? 'bg-slate-900 text-white shadow-lg' : 'panel-card text-slate-700 hover:bg-white'"
            @click="navigate(item.to)"
          >
            <span class="flex items-center gap-3">
              <VIcon :icon="item.icon" />
              <span class="font-medium">{{ item.label }}</span>
            </span>
            <span class="text-xs opacity-70">{{ item.short }}</span>
          </button>
        </div>
      </VNavigationDrawer>

      <VAppBar
        color="transparent"
        flat
        height="80"
      >
        <template #prepend>
          <VBtn
            icon="mdi-menu"
            variant="text"
            @click="drawerActions.toggle()"
          />
        </template>

        <VAppBarTitle class="font-weight-bold text-slate-900">
          {{ route.meta.title ?? '工作台' }}
        </VAppBarTitle>
      </VAppBar>

      <VMain>
        <div class="mx-auto max-w-7xl px-4 pb-10 pt-2 md:px-6">
          <RouterView />
        </div>
      </VMain>
    </div>
  </VApp>
</template>
