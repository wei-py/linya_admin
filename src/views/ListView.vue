<script setup>
import Panzoom from "@panzoom/panzoom"
import { storeToRefs } from "pinia"
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue"

import { listTableColumnConfigs } from "@/constants/list"
import { useListStore } from "@/stores/list"
import {
  isTauriApp,
  pickExcelFilePath,
  readBinaryFile,
  saveExcelFilePath,
} from "@/utils/tauri/excel-file"

const listStore = useListStore()
const fileInputRef = ref(null)
const statusMessage = ref("")
const localImageUrlMap = reactive({})
const loadingImagePathSet = new Set()
const imagePreviewDialogOpen = ref(false)
const imagePreviewTitle = ref("")
const imagePreviewSrc = ref("")
const imagePreviewScale = ref(1)
const previewViewportRef = ref(null)
const previewImageRef = ref(null)
const previewOpenedAt = ref(0)
let previewPanzoom = null
let previewWheelHandler = null
let previewPanzoomChangeHandler = null

const {
  recordItems,
  recordCount,
  excelFileName,
  hasBoundExcelFile,
  dirty,
  syncStatus,
  syncErrorMessage,
  lastSyncedAt,
} = storeToRefs(listStore)

const imageCount = computed(() => listStore.images.length)
const variantCount = computed(() => listStore.variants.length)
const listTableColumns = listTableColumnConfigs

function resolveImageSrc(image) {
  const source = String(image?.filePath ?? "").trim()

  if (!source) {
    return ""
  }

  if (/^(?:blob:|data:image\/|https?:\/\/)/i.test(source)) {
    return source
  }

  return localImageUrlMap[source] || ""
}

function guessImageMimeType(path = "") {
  const normalized = String(path).toLowerCase()

  if (normalized.endsWith(".png")) {
    return "image/png"
  }

  if (normalized.endsWith(".webp")) {
    return "image/webp"
  }

  if (normalized.endsWith(".gif")) {
    return "image/gif"
  }

  if (normalized.endsWith(".bmp")) {
    return "image/bmp"
  }

  if (normalized.endsWith(".svg")) {
    return "image/svg+xml"
  }

  return "image/jpeg"
}

async function ensureLocalImageUrl(path) {
  const source = String(path ?? "").trim()

  if (
    !source
    || localImageUrlMap[source]
    || loadingImagePathSet.has(source)
    || /^(?:blob:|data:image\/|https?:\/\/)/i.test(source)
    || !isTauriApp()
  ) {
    return
  }

  loadingImagePathSet.add(source)

  try {
    const bytes = await readBinaryFile(source)
    const blob = new Blob([bytes], { type: guessImageMimeType(source) })

    localImageUrlMap[source] = URL.createObjectURL(blob)
  }
  catch (error) {
    console.error("列表图片读取失败", source, error)
  }
  finally {
    loadingImagePathSet.delete(source)
  }
}

function revokeLocalImageUrls() {
  Object.values(localImageUrlMap).forEach((url) => {
    if (typeof url === "string" && url.startsWith("blob:")) {
      URL.revokeObjectURL(url)
    }
  })

  Object.keys(localImageUrlMap).forEach((key) => {
    delete localImageUrlMap[key]
  })
}

function formatCellValue(value, type = "") {
  const text = String(value ?? "").trim()

  if (!text) {
    return "-"
  }

  if (type === "money") {
    return `${text} R$`
  }

  if (type === "percent") {
    return `${text} %`
  }

  return text
}

function getRecordCellValue(record, column) {
  if (column.key === "countryPlatform") {
    const country = String(record.country ?? "").trim()
    const platform = String(record.platform ?? "").trim()

    return country || platform ? `${country || "-"} / ${platform || "-"}` : "-"
  }

  return formatCellValue(record[column.key], column.type)
}

function openImagePreview(src, title = "图片预览") {
  if (!src) {
    return
  }

  imagePreviewSrc.value = src
  imagePreviewTitle.value = title
  imagePreviewScale.value = 1
  previewOpenedAt.value = Date.now()
  imagePreviewDialogOpen.value = true
}

function openRecordImagePreview(record) {
  openImagePreview(
    resolveImageSrc(record?.coverImage),
    record?.name || "商品图片",
  )
}

function zoomInPreviewImage() {
  previewPanzoom?.zoomIn()
}

function zoomOutPreviewImage() {
  previewPanzoom?.zoomOut()
}

function resetPreviewImageScale() {
  previewPanzoom?.reset({ animate: false })
  imagePreviewScale.value = 1
}

function destroyPreviewPanzoom() {
  if (previewViewportRef.value && previewWheelHandler) {
    previewViewportRef.value.removeEventListener("wheel", previewWheelHandler)
  }

  if (previewImageRef.value && previewPanzoomChangeHandler) {
    previewImageRef.value.removeEventListener(
      "panzoomchange",
      previewPanzoomChangeHandler,
    )
  }

  previewWheelHandler = null
  previewPanzoomChangeHandler = null

  if (previewPanzoom) {
    previewPanzoom.destroy()
    previewPanzoom = null
  }
}

function initializePreviewPanzoom() {
  if (
    !imagePreviewDialogOpen.value
    || !previewImageRef.value
    || !previewViewportRef.value
  ) {
    return
  }

  destroyPreviewPanzoom()

  previewPanzoom = Panzoom(previewImageRef.value, {
    maxScale: 4,
    minScale: 0.25,
    step: 0.25,
    cursor: "grab",
    contain: "outside",
  })

  previewPanzoomChangeHandler = (event) => {
    imagePreviewScale.value = event.detail.scale
  }

  previewImageRef.value.addEventListener(
    "panzoomchange",
    previewPanzoomChangeHandler,
  )

  previewWheelHandler = (event) => {
    if (Date.now() - previewOpenedAt.value < 240) {
      event.preventDefault()
      return
    }

    event.preventDefault()
    previewPanzoom?.zoomWithWheel(event)
  }

  previewViewportRef.value.addEventListener("wheel", previewWheelHandler, {
    passive: false,
  })

  previewPanzoom.reset({ animate: false })
  imagePreviewScale.value = previewPanzoom.getScale()
}

async function handleBindExcel() {
  if (isTauriApp()) {
    const path = await pickExcelFilePath()

    if (!path) {
      return
    }

    const isBound = await listStore.bindExcelFilePath(path)

    statusMessage.value = isBound ? "已绑定列表 Excel" : ""
    return
  }

  fileInputRef.value?.click()
}

async function handleFileChange(event) {
  const [file] = event.target.files ?? []

  if (!file) {
    return
  }

  const isBound = await listStore.bindExcelFile(file)

  statusMessage.value = isBound ? "已载入列表 Excel" : ""
  event.target.value = ""
}

async function handleSave() {
  if (isTauriApp()) {
    if (listStore.excelFilePath) {
      const isSaved = await listStore.syncBoundExcelFile()

      statusMessage.value = isSaved ? "列表 Excel 已保存" : ""
      return
    }

    const path = await saveExcelFilePath()

    if (!path) {
      return
    }

    const isSaved = await listStore.syncBoundExcelFile(path)

    statusMessage.value = isSaved ? "列表 Excel 已另存为" : ""
    return
  }

  const bytes = await listStore.exportWorkbookBytes()
  const blob = new Blob([bytes], {
    type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = listStore.excelFileName || "商品列表.xlsx"
  link.click()
  URL.revokeObjectURL(url)
  statusMessage.value = "列表 Excel 已导出"
}

function handleRemoveRecord(id) {
  if (!id) {
    return
  }

  listStore.removeRecord(id)
  statusMessage.value = "已从列表移除"
}

onMounted(async () => {
  if (!isTauriApp() || !listStore.excelFilePath || listStore.dirty) {
    return
  }

  const isRefreshed = await listStore.refreshBoundExcelFile()

  if (isRefreshed) {
    statusMessage.value = "已从已绑定 Excel 刷新列表"
  }
})

watch(
  recordItems,
  (items) => {
    items.forEach((record) => {
      const path = String(record?.coverImage?.filePath ?? "").trim()

      if (path) {
        ensureLocalImageUrl(path)
      }
    })
  },
  { immediate: true, deep: false },
)

onBeforeUnmount(() => {
  destroyPreviewPanzoom()
  revokeLocalImageUrls()
})

watch(imagePreviewDialogOpen, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      initializePreviewPanzoom()
    })
    return
  }

  destroyPreviewPanzoom()
  imagePreviewScale.value = 1
})

watch(imagePreviewSrc, () => {
  if (!imagePreviewDialogOpen.value) {
    return
  }

  nextTick(() => {
    initializePreviewPanzoom()
  })
})
</script>

<template>
  <div class="h-full min-h-0 overflow-y-auto pr-2">
    <div class="space-y-4">
      <VCard
        class="
          workspace-sheet overflow-hidden border border-[#c6c6c6] bg-white
        "
      >
        <div class="workspace-panel-header">
          <div class="workspace-panel-title">商品列表</div>
          <div class="workspace-panel-meta">{{ recordCount }} 条</div>
        </div>

        <div class="workspace-panel-body space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <VBtn color="primary" size="small" @click="handleBindExcel">
              绑定列表 Excel
            </VBtn>
            <VBtn
              size="small"
              variant="text"
              :disabled="!recordCount"
              @click="handleSave"
            >
              保存
            </VBtn>
            <div class="text-sm text-[#525252]">
              {{
                hasBoundExcelFile
                  ? excelFileName || "已绑定列表 Excel"
                  : "未绑定列表 Excel"
              }}
            </div>
            <div v-if="dirty" class="workspace-badge">待保存</div>
          </div>

          <input
            ref="fileInputRef"
            type="file"
            accept=".xlsx,.xls"
            class="hidden"
            @change="handleFileChange"
          >

          <div
            class="
              grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3
            "
          >
            <div class="border border-[#c6c6c6] bg-[#f8f8f8] px-3 py-2.5">
              <div class="text-xs text-[#525252]">商品数</div>
              <div class="mt-1 text-xl font-semibold text-[#161616]">
                {{ recordCount }}
              </div>
            </div>
            <div class="border border-[#c6c6c6] bg-[#f8f8f8] px-3 py-2.5">
              <div class="text-xs text-[#525252]">图片数</div>
              <div class="mt-1 text-xl font-semibold text-[#161616]">
                {{ imageCount }}
              </div>
            </div>
            <div class="border border-[#c6c6c6] bg-[#f8f8f8] px-3 py-2.5">
              <div class="text-xs text-[#525252]">变体数</div>
              <div class="mt-1 text-xl font-semibold text-[#161616]">
                {{ variantCount }}
              </div>
            </div>
          </div>

          <div
            v-if="statusMessage || syncErrorMessage || lastSyncedAt"
            class="space-y-1 text-sm"
          >
            <div v-if="statusMessage" class="text-[#0f62fe]">
              {{ statusMessage }}
            </div>
            <div v-if="syncErrorMessage" class="text-[#da1e28]">
              {{ syncErrorMessage }}
            </div>
            <div
              v-if="syncStatus === 'saved' && lastSyncedAt"
              class="text-[#525252]"
            >
              上次保存：{{ new Date(lastSyncedAt).toLocaleString() }}
            </div>
          </div>
        </div>
      </VCard>

      <VCard
        class="
          workspace-sheet overflow-hidden border border-[#c6c6c6] bg-white
        "
      >
        <div class="workspace-panel-header">
          <div class="workspace-panel-title">列表内容</div>
          <div class="workspace-panel-meta">{{ recordCount }} 条</div>
        </div>

        <div
          v-if="recordItems.length"
          class="overflow-x-auto"
        >
          <VTable class="workspace-table min-w-[2480px]">
            <thead>
              <tr>
                <th class="!w-[104px]">图片</th>
                <th>名称</th>
                <th>款号</th>
                <th v-for="column in listTableColumns" :key="column.key">
                  {{ column.label }}
                </th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in recordItems" :key="record.id">
                <td>
                  <div
                    class="
                      flex h-[72px] w-[72px] items-center justify-center
                      overflow-hidden border border-[#c6c6c6] bg-[#f8f8f8]
                    "
                  >
                    <img
                      v-if="record.coverImage"
                      :src="resolveImageSrc(record.coverImage)"
                      :alt="record.name || '商品图片'"
                      class="h-full w-full cursor-zoom-in object-contain"
                      @click="openRecordImagePreview(record)"
                    >
                    <span v-else class="text-xs text-[#8d8d8d]">无图</span>
                  </div>
                </td>
                <td>
                  <div class="font-medium text-[#161616]">
                    {{ record.name || "未命名商品" }}
                  </div>
                  <div class="mt-1 text-xs text-[#525252]">
                    {{ record.imageCount }} 张图
                  </div>
                </td>
                <td>{{ record.sku || "-" }}</td>
                <td v-for="column in listTableColumns" :key="column.key">
                  {{ getRecordCellValue(record, column) }}
                </td>
                <td class="text-center">
                  <VBtn
                    variant="text"
                    color="error"
                    size="small"
                    @click="handleRemoveRecord(record.id)"
                  >
                    删除
                  </VBtn>
                </td>
              </tr>
            </tbody>
          </VTable>
        </div>

        <div
          v-else
          class="workspace-empty-state m-4"
        >
          <div class="text-sm text-[#525252]">
            当前还没有商品记录。先去创建页点击“添加到列表”。
          </div>
        </div>
      </VCard>
    </div>

    <VDialog v-model="imagePreviewDialogOpen" max-width="960">
      <VCard
        class="workspace-sheet overflow-hidden border border-[#c6c6c6] bg-white"
      >
        <div class="workspace-panel-header">
          <div class="workspace-panel-title">
            {{ imagePreviewTitle || "图片预览" }}
          </div>
          <div class="flex items-center gap-1.5">
            <div class="text-[12px] text-[#525252]">
              {{ Math.round(imagePreviewScale * 100) }}%
            </div>
            <VBtn
              icon="mdi-magnify-minus-outline"
              variant="text"
              size="small"
              @click="zoomOutPreviewImage"
            />
            <VBtn
              variant="text"
              size="small"
              class="min-w-[48px]"
              @click="resetPreviewImageScale"
            >
              1:1
            </VBtn>
            <VBtn
              icon="mdi-magnify-plus-outline"
              variant="text"
              size="small"
              @click="zoomInPreviewImage"
            />
            <VBtn
              icon="mdi-close"
              variant="text"
              size="small"
              @click="imagePreviewDialogOpen = false"
            />
          </div>
        </div>
        <div class="workspace-panel-body">
          <div
            ref="previewViewportRef"
            class="
              flex min-h-[320px] cursor-grab items-center justify-center border
              border-[#c6c6c6] bg-[#f8f8f8] p-4
            "
          >
            <img
              v-if="imagePreviewSrc"
              ref="previewImageRef"
              :src="imagePreviewSrc"
              :alt="imagePreviewTitle || '图片预览'"
              class="max-h-[70vh] w-full object-contain"
              @load="initializePreviewPanzoom"
            >
          </div>
        </div>
      </VCard>
    </VDialog>
  </div>
</template>
