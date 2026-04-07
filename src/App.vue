<script setup>
import { onMounted, ref } from "vue"

import { usePresetStore } from "@/stores/preset"
import { isTauriApp, pickExcelFilePath } from "@/utils/tauri/excel-file"

const fileInputRef = ref(null)
const presetStore = usePresetStore()

async function handleBind() {
  if (isTauriApp()) {
    const path = await pickExcelFilePath()

    if (!path)
      return

    await presetStore.bindExcelFilePath(path)
    return
  }

  fileInputRef.value?.click()
}

async function handleFileChange(event) {
  const [file] = event.target.files ?? []

  if (!file)
    return

  await presetStore.bindExcelFile(file)
  event.target.value = ""
}

onMounted(async () => {
  await presetStore.refreshBoundExcelFile()
})
</script>

<template>
  <VApp>
    <div class="h-screen w-full overflow-hidden bg-slate-200">
      <VNavigationDrawer
        color="transparent"
        floating
        border="0"
        width="240"
        permanent
      >
        <div class="m-4 panel-card p-5">
          <div class="text-xs uppercase tracking-[0.25em] text-slate-400">
            Linya Admin
          </div>
        </div>

        <div class="mx-4 mt-4 space-y-3">
          <RouterLink to="/preset" class="block">
            <div
              class="section-shell"
              :class="
                $route.path === '/preset'
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'panel-card text-slate-700 hover:bg-white'
              "
            >
              <span class="flex items-center gap-3">
                <VIcon icon="mdi-tune-variant" />
                <span class="font-medium">预设</span>
              </span>
            </div>
          </RouterLink>

          <RouterLink to="/template" class="block">
            <div
              class="section-shell"
              :class="
                $route.path === '/template'
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'panel-card text-slate-700 hover:bg-white'
              "
            >
              <span class="flex items-center gap-3">
                <VIcon icon="mdi-table-search" />
                <span class="font-medium">模板</span>
              </span>
            </div>
          </RouterLink>

          <RouterLink to="/create" class="block">
            <div
              class="section-shell"
              :class="
                $route.path === '/create'
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'panel-card text-slate-700 hover:bg-white'
              "
            >
              <span class="flex items-center gap-3">
                <VIcon icon="mdi-pencil-box-outline" />
                <span class="font-medium">创建</span>
              </span>
            </div>
          </RouterLink>

          <RouterLink to="/list" class="block">
            <div
              class="section-shell"
              :class="
                $route.path === '/list'
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'panel-card text-slate-700 hover:bg-white'
              "
            >
              <span class="flex items-center gap-3">
                <VIcon icon="mdi-file-document-multiple-outline" />
                <span class="font-medium">列表</span>
              </span>
            </div>
          </RouterLink>
        </div>
        <div class="mx-4 mt-10">
          <input
            ref="fileInputRef"
            class="hidden"
            type="file"
            accept=".xlsx,.xls"
            @change="handleFileChange"
          >
          <VBtn class="w-full" variant="tonal" @click="handleBind">
            {{ presetStore.excelFileName || "未绑定" }}
          </VBtn>
        </div>
      </VNavigationDrawer>

      <VMain class="h-full min-h-0 w-full">
        <div class="mx-auto h-full min-h-0 w-full py-4 px-2">
          <RouterView />
        </div>
      </VMain>
    </div>
  </VApp>
</template>
