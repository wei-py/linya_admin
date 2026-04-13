<script setup>
import { onMounted, ref } from "vue"

import { usePresetStore } from "@/stores/preset"
import { useTemplateStore } from "@/stores/template"
import { isTauriApp, pickExcelFilePath } from "@/utils/tauri/excel-file"

const fileInputRef = ref(null)
const presetStore = usePresetStore()
const templateStore = useTemplateStore()

async function handleBind() {
  if (isTauriApp()) {
    const path = await pickExcelFilePath()

    if (!path)
      return

    const isBound = await presetStore.bindExcelFilePath(path)

    if (isBound) {
      await templateStore.refreshFromBoundExcel()
    }

    return
  }

  fileInputRef.value?.click()
}

async function handleFileChange(event) {
  const [file] = event.target.files ?? []

  if (!file)
    return

  const isBound = await presetStore.bindExcelFile(file)

  if (isBound) {
    await templateStore.refreshFromBoundExcel()
  }

  event.target.value = ""
}

onMounted(async () => {
  await presetStore.refreshBoundExcelFile()
  await templateStore.refreshFromBoundExcel()
})
</script>

<template>
  <VApp>
    <div class="flex min-h-screen bg-[#f4f4f4]">
      <VNavigationDrawer
        class="border-r border-[#c6c6c6] bg-white"
        border="0"
        width="272"
        permanent
      >
        <div class="border-b border-[#c6c6c6] px-5 py-5">
          <div class="text-xs font-medium tracking-[0.01em] text-[#525252]">
            Workspace
          </div>
          <!-- <div
            class="
              mt-3 text-lg font-semibold tracking-[-0.01em] text-[#161616]
            "
          >
            Linya Admin
          </div>
          <div class="mt-2 text-sm text-[#525252]">
            Excel 驱动的配置后台
          </div> -->
        </div>

        <div class="py-4">
          <RouterLink to="/preset" class="block">
            <div
              class="
                flex min-h-12 items-center gap-3 border-l-[3px] px-5 text-sm
                font-medium transition-colors
              "
              :class="
                $route.path.startsWith('/preset')
                  ? 'border-[#0f62fe] bg-[#edf5ff] text-[#161616]'
                  : `
                    border-transparent text-[#525252]
                    hover:bg-[#f8f8f8] hover:text-[#161616]
                  `
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
              class="
                flex min-h-12 items-center gap-3 border-l-[3px] px-5 text-sm
                font-medium transition-colors
              "
              :class="
                $route.path === '/template'
                  ? 'border-[#0f62fe] bg-[#edf5ff] text-[#161616]'
                  : `
                    border-transparent text-[#525252]
                    hover:bg-[#f8f8f8] hover:text-[#161616]
                  `
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
              class="
                flex min-h-12 items-center gap-3 border-l-[3px] px-5 text-sm
                font-medium transition-colors
              "
              :class="
                $route.path === '/create'
                  ? 'border-[#0f62fe] bg-[#edf5ff] text-[#161616]'
                  : `
                    border-transparent text-[#525252]
                    hover:bg-[#f8f8f8] hover:text-[#161616]
                  `
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
              class="
                flex min-h-12 items-center gap-3 border-l-[3px] px-5 text-sm
                font-medium transition-colors
              "
              :class="
                $route.path === '/list'
                  ? 'border-[#0f62fe] bg-[#edf5ff] text-[#161616]'
                  : `
                    border-transparent text-[#525252]
                    hover:bg-[#f8f8f8] hover:text-[#161616]
                  `
              "
            >
              <span class="flex items-center gap-3">
                <VIcon icon="mdi-file-document-multiple-outline" />
                <span class="font-medium">列表</span>
              </span>
            </div>
          </RouterLink>
        </div>

        <div class="mt-auto px-5 pb-5">
          <div class="border border-[#c6c6c6] bg-[#f8f8f8] px-4 py-4">
            <div class="text-[13px] font-medium text-[#161616]">
              {{
                presetStore.hasBoundExcelFile
                  ? presetStore.excelFileName || "已绑定 Excel"
                  : "未绑定 Excel"
              }}
            </div>
            <!-- <div class="mt-2 text-xs text-[#525252]">
              模板和预设会同步到当前文件
            </div> -->
            <input
              ref="fileInputRef"
              class="hidden"
              type="file"
              accept=".xlsx,.xls"
              @change="handleFileChange"
            >
            <VBtn
              class="mt-4 w-full"
              variant="flat"
              color="primary"
              @click="handleBind"
            >
              {{
                presetStore.hasBoundExcelFile
                  ? "重新选择 Excel"
                  : "选择 Excel"
              }}
            </VBtn>
          </div>
        </div>
      </VNavigationDrawer>

      <VMain class="min-h-screen min-w-0 w-full bg-[#f4f4f4]">
        <div class="mx-auto min-h-screen w-full px-4 py-4 md:px-8 md:py-8">
          <RouterView />
        </div>
      </VMain>
    </div>
  </VApp>
</template>
