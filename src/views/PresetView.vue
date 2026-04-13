<script setup>
import { storeToRefs } from "pinia"
import { computed, reactive, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import { countryOptions, platformOptions } from "@/constants/preset"
import { usePresetStore } from "@/stores/preset"

const createDraft = reactive({
  country: "",
  platform: "",
})
const searchText = ref("")

const presetStore = usePresetStore()
const { activePresetId, presetRecords } = storeToRefs(presetStore)
const route = useRoute()
const router = useRouter()

const filteredPresetRecords = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()

  if (!keyword) {
    return presetRecords.value
  }

  return presetRecords.value.filter((item) => {
    const text = [item.country_platform, item.country, item.platform]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    return text.includes(keyword)
  })
})

watch(
  () => route.params.presetId,
  (presetId) => {
    const nextId = typeof presetId === "string" ? presetId : ""

    if (!nextId) {
      return
    }

    const target = presetRecords.value.find(item => item.id === nextId)

    if (!target) {
      if (activePresetId.value) {
        void router.replace({
          name: "preset-detail",
          params: { presetId: activePresetId.value },
        })
      }
      else {
        void router.replace({ name: "preset" })
      }
      return
    }

    if (activePresetId.value !== nextId) {
      presetStore.setActivePreset(nextId)
    }
  },
  { immediate: true },
)

watch(
  activePresetId,
  (nextId) => {
    const routePresetId
      = typeof route.params.presetId === "string" ? route.params.presetId : ""

    if (!nextId) {
      if (routePresetId) {
        void router.replace({ name: "preset" })
      }
      return
    }

    if (routePresetId !== nextId) {
      void router.replace({
        name: "preset-detail",
        params: { presetId: nextId },
      })
    }
  },
  { immediate: true },
)

async function handleAdd() {
  await presetStore.addPresetRecord({
    country: createDraft.country,
    platform: createDraft.platform,
  })

  createDraft.country = ""
  createDraft.platform = ""
}

function handleSelectPreset(item) {
  presetStore.setActivePreset(item.id)
}

async function handleDeletePreset(item) {
  await presetStore.removePresetRecord(item.id)
}
</script>

<template>
  <div class="h-full min-h-0 overflow-y-auto pr-2">
    <div class="workspace-page-grid">
      <VCard
        class="
          workspace-sheet flex min-h-0 flex-col overflow-hidden border
          border-[#c6c6c6] bg-white
        "
      >
        <div
          class="
            flex flex-wrap gap-2 border-b border-[#c6c6c6] bg-[#f8f8f8]
            px-4 py-3
          "
        >
          <div
            class="inline-flex items-center gap-2 text-[13px] text-[#161616]"
          >
            <span
              class="
                inline-flex h-5 w-5 items-center justify-center border
                border-[#c6c6c6] text-xs
              "
            >1</span>
            <span>组合</span>
          </div>
          <div
            class="inline-flex items-center gap-2 text-[13px] text-[#161616]"
          >
            <span
              class="
                inline-flex h-5 w-5 items-center justify-center border
                border-[#c6c6c6] text-xs
              "
            >2</span>
            <span>参数</span>
          </div>
        </div>

        <div class="min-h-0 flex-1">
          <RouterView />
        </div>
      </VCard>

      <div class="workspace-sidebar workspace-sidebar--supporting">
        <VCard
          class="
            workspace-sheet overflow-hidden border border-[#c6c6c6] bg-white
          "
        >
          <div class="workspace-panel-header">
            <div class="flex items-center justify-between gap-3">
              <div class="workspace-panel-title">新建组合</div>
              <div class="workspace-panel-meta">
                {{ presetRecords.length }} 项
              </div>
            </div>
          </div>

          <div class="workspace-panel-body space-y-2.5">
            <div class="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
              <div class="surface-field surface-field--compact">
                <div class="surface-field__label">国家</div>
                <VAutocomplete
                  v-model="createDraft.country"
                  :items="countryOptions"
                  class="surface-field__control"
                  variant="plain"
                  hide-details
                  density="compact"
                  clearable
                />
              </div>
              <div class="surface-field surface-field--compact">
                <div class="surface-field__label">平台</div>
                <VAutocomplete
                  v-model="createDraft.platform"
                  :items="platformOptions"
                  class="surface-field__control"
                  variant="plain"
                  hide-details
                  density="compact"
                  clearable
                />
              </div>
              <VBtn
                class="w-full sm:col-span-2 lg:col-span-1"
                variant="flat"
                color="primary"
                size="small"
                :disabled="!createDraft.country || !createDraft.platform"
                @click="handleAdd"
              >
                新增组合
              </VBtn>
            </div>
          </div>
        </VCard>

        <VCard
          class="
            workspace-sheet flex min-h-0 flex-col overflow-hidden border
            border-[#c6c6c6] bg-white
          "
        >
          <div class="workspace-panel-header">
            <div class="workspace-panel-title">组合列表</div>
            <div class="workspace-panel-meta">
              {{ filteredPresetRecords.length }} 项
            </div>
          </div>

          <div class="workspace-panel-body workspace-panel-body--compact">
            <div class="surface-field surface-field--compact">
              <div class="surface-field__label">搜索</div>
              <VTextField
                v-model="searchText"
                class="surface-field__control"
                placeholder="国家 / 平台"
                variant="plain"
                hide-details
                density="compact"
              />
            </div>
          </div>

          <div
            v-if="filteredPresetRecords.length"
            class="
              border-t border-[#e0e0e0] lg:max-h-[420px] lg:overflow-y-auto
            "
          >
            <div class="grid gap-0 sm:grid-cols-2 lg:grid-cols-1">
              <button
                v-for="item in filteredPresetRecords"
                :key="item.id"
                type="button"
                class="
                  flex w-full items-start justify-between border-l-[3px] px-3
                  py-2.5 text-left transition-colors lg:px-4 lg:py-3
                "
                :class="
                  activePresetId === item.id
                    ? 'border-[#0f62fe] bg-[#edf5ff] text-[#161616]'
                    : `
                      border-transparent text-[#525252]
                      hover:bg-[#f8f8f8] hover:text-[#161616]
                    `
                "
                @click="handleSelectPreset(item)"
              >
                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm font-semibold">
                    {{ item.country_platform }}
                  </div>
                  <div class="mt-1 text-xs text-[#525252]">
                    {{ item.country || "未设置" }} / {{ item.platform || "未设置" }}
                  </div>
                </div>
                <div class="ml-3 flex items-center gap-2">
                  <div class="text-right text-xs text-[#525252]">
                    {{ item.items.length }} 项
                  </div>
                  <VBtn
                    color="error"
                    variant="text"
                    size="small"
                    density="compact"
                    @click.stop="handleDeletePreset(item)"
                  >
                    删除
                  </VBtn>
                </div>
              </button>
            </div>
          </div>

          <div
            v-else
            class="workspace-panel-body pt-0"
          >
            <div class="workspace-empty-state workspace-empty-state--compact">
              没有匹配的组合。
            </div>
          </div>
        </VCard>
      </div>
    </div>
  </div>
</template>
