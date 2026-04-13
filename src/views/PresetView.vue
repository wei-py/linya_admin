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
    <div class="grid h-full gap-4 xl:grid-cols-[320px,minmax(0,1fr)]">
      <div class="space-y-4">
        <VCard class="overflow-hidden border border-[#c6c6c6] bg-white">
          <div class="border-b border-[#c6c6c6] px-5 py-4">
            <div class="flex items-center justify-between gap-3">
              <div class="text-lg font-semibold text-[#161616]">新建组合</div>
              <div class="text-xs text-[#525252]">
                {{ presetRecords.length }} 项
              </div>
            </div>
          </div>

          <div class="space-y-3 p-5">
            <div class="grid gap-3">
              <div class="surface-field">
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
              <div class="surface-field">
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
                class="w-full"
                variant="flat"
                color="primary"
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
            flex min-h-0 flex-col overflow-hidden border border-[#c6c6c6]
            bg-white
          "
        >
          <div class="border-b border-[#c6c6c6] px-5 py-4">
            <div class="text-lg font-semibold text-[#161616]">组合列表</div>
            <div class="mt-3 surface-field">
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
            class="flex-1 overflow-y-auto"
          >
            <button
              v-for="item in filteredPresetRecords"
              :key="item.id"
              type="button"
              class="
                flex w-full items-start justify-between border-l-[3px] px-5 py-4
                text-left transition-colors
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
              <div class="ml-3 flex items-center gap-3">
                <div class="text-right text-xs text-[#525252]">
                  {{ item.items.length }} 项
                </div>
                <VBtn
                  color="error"
                  variant="text"
                  size="small"
                  density="comfortable"
                  @click.stop="handleDeletePreset(item)"
                >
                  删除
                </VBtn>
              </div>
            </button>
          </div>

          <div
            v-else
            class="
              flex flex-1 items-center justify-center px-5 py-10 text-sm
              text-[#6f6f6f]
            "
          >
            没有匹配的组合。
          </div>
        </VCard>
      </div>

      <VCard class="min-h-0 overflow-hidden border border-[#c6c6c6] bg-white">
        <RouterView />
      </VCard>
    </div>
  </div>
</template>
