<script setup>
import { convertFileSrc } from "@tauri-apps/api/core"
import { storeToRefs } from "pinia"
import { computed, ref } from "vue"

import { useListStore } from "@/stores/list"
import {
  isTauriApp,
  pickExcelFilePath,
  saveExcelFilePath,
} from "@/utils/tauri/excel-file"

const listStore = useListStore()
const fileInputRef = ref(null)
const statusMessage = ref("")

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

function resolveImageSrc(image) {
  const source = String(image?.filePath ?? "").trim()

  if (!source) {
    return ""
  }

  if (isTauriApp() && !/^(?:blob:|data:image\/|https?:\/\/)/i.test(source)) {
    return convertFileSrc(source)
  }

  return source
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
          <VTable class="workspace-table min-w-[1120px]">
            <thead>
              <tr>
                <th class="!w-[104px]">图片</th>
                <th>名称</th>
                <th>款号</th>
                <th>国家 / 平台</th>
                <th>类目</th>
                <th>广告类型</th>
                <th>是否包邮</th>
                <th>折后价</th>
                <th>折前价</th>
                <th>利润率</th>
                <th>净利润</th>
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
                      class="h-full w-full object-contain"
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
                <td>
                  {{ record.country || "-" }} / {{ record.platform || "-" }}
                </td>
                <td>{{ record.category || "-" }}</td>
                <td>{{ record.adType || "-" }}</td>
                <td>{{ record.shippingIncluded || "-" }}</td>
                <td>{{ record.discountPrice || "-" }}</td>
                <td>{{ record.listPrice || "-" }}</td>
                <td>{{ record.profitRate || "-" }}</td>
                <td>{{ record.netProfit || "-" }}</td>
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
  </div>
</template>
