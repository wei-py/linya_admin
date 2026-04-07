<script setup>
import { storeToRefs } from "pinia"
import { reactive, watch } from "vue"

import { countryOptions, platformOptions } from "@/constants/preset"
import { usePresetStore } from "@/stores/preset"

const baseInfo = reactive({
  country: "",
  platform: "",
})

const presetStore = usePresetStore()
const { activePreset, activePresetId, presetRecords } = storeToRefs(presetStore)

function syncBaseInfoFromPreset(preset) {
  if (!preset) {
    baseInfo.country = ""
    baseInfo.platform = ""
    return
  }

  baseInfo.country = preset.country
  baseInfo.platform = preset.platform
}

watch(
  activePreset,
  (preset) => {
    syncBaseInfoFromPreset(preset)
  },
  { immediate: true },
)

async function handleAdd() {
  await presetStore.addPresetRecord({
    country: baseInfo.country,
    platform: baseInfo.platform,
  })
}

function handleSelectPreset(item) {
  presetStore.setActivePreset(item.id)
}

async function handleDeletePreset(item) {
  await presetStore.removePresetRecord(item.id)
}
</script>

<template>
  <div class="h-full">
    <div class="flex h-full gap-1">
      <div class="flex h-full w-[15%] flex-col gap-1">
        <div class="flex flex-col gap-1">
          <VAutocomplete
            v-model="baseInfo.country"
            :items="countryOptions"
            label="国家"
            variant="solo-filled"
            clearable
          />
          <VAutocomplete
            v-model="baseInfo.platform"
            :items="platformOptions"
            label="平台"
            variant="solo-filled"
            clearable
          />
          <VBtn class="w-full" variant="tonal" @click="handleAdd"> 添加 </VBtn>
        </div>

        <VList class="flex-1 overflow-y-auto">
          <VListItem
            v-for="item in presetRecords"
            :key="item.id"
            :active="activePresetId === item.id"
            color="primary"
            @click="handleSelectPreset(item)"
          >
            <VListItemTitle>{{ item.country_platform }}</VListItemTitle>
            <template #append>
              <VIcon
                class="cursor-pointer text-slate-400 transition hover:text-red-500"
                @click.stop="handleDeletePreset(item)"
              >
                mdi-close
              </VIcon>
            </template>
          </VListItem>
        </VList>
      </div>

      <VCard class="flex-1 p-2">
        <div v-if="activePreset" class="panel-card h-full p-5">
          <div class="mt-3 text-2xl font-semibold text-slate-900">
            {{ activePreset.country_platform }}
          </div>

          <div class="mt-6">
            <div class="text-sm font-semibold text-slate-900">参数项</div>
            <div v-if="activePreset.items.length" class="mt-3 space-y-2">
              <div
                v-for="item in activePreset.items"
                :key="item.id"
                class="rounded-lg bg-slate-100 px-3 py-2"
              >
                <div class="text-sm font-medium text-slate-900">
                  {{ item.name }}
                </div>
                <div class="mt-1 text-xs text-slate-500">
                  {{ item.type }} / {{ item.unit || "无单位" }}
                </div>
                <div class="mt-2 text-sm text-slate-700">
                  {{ item.value || "未填写" }}
                </div>
              </div>
            </div>
            <div v-else class="mt-3 text-sm text-slate-400">
              当前组合还没有参数项，后续在这里维护。
            </div>
          </div>
        </div>

        <div v-else class="panel-card flex h-full items-center justify-center">
          <div class="text-sm text-slate-400">先选择或导入一个组合。</div>
        </div>
      </VCard>
    </div>
  </div>
</template>

<style scoped>
:deep(.v-input__details) {
  display: none;
}
</style>
