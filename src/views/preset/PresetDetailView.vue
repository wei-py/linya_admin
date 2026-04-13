<script setup>
import { storeToRefs } from "pinia"
import { computed } from "vue"

import PresetItemsEditor from "@/components/preset/PresetItemsEditor.vue"
import { usePresetStore } from "@/stores/preset"

const presetStore = usePresetStore()
const { activePreset } = storeToRefs(presetStore)

const presetSummaryItems = computed(() => {
  if (!activePreset.value) {
    return []
  }

  const items = activePreset.value.items || []
  const ruleCount = items.filter(item => item.type === "rule").length
  const booleanCount = items.filter(item => item.type === "boolean").length

  return [
    { label: "参数项", value: items.length },
    { label: "规则项", value: ruleCount },
    { label: "布尔项", value: booleanCount },
  ]
})
</script>

<template>
  <div v-if="activePreset" class="h-full p-5">
    <div class="border-b border-[#c6c6c6] pb-5">
      <div class="text-xs font-medium tracking-[0.01em] text-[#525252]">
        当前组合
      </div>
      <div
        class="
          mt-2 text-[1.75rem] font-semibold tracking-[-0.02em] text-[#161616]
        "
      >
        {{ activePreset.country_platform }}
      </div>
      <div
        class="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#525252]"
      >
        <span
          class="
            inline-flex items-center border border-[#c6c6c6] bg-[#f8f8f8] px-3
            py-1 text-xs
          "
        >
          {{ activePreset.country || "未设置国家" }}
        </span>
        <span
          class="
            inline-flex items-center border border-[#c6c6c6] bg-[#f8f8f8] px-3
            py-1 text-xs
          "
        >
          {{ activePreset.platform || "未设置平台" }}
        </span>
      </div>
      <div class="mt-4 grid gap-3 sm:grid-cols-3">
        <div
          v-for="item in presetSummaryItems"
          :key="item.label"
          class="border border-[#e0e0e0] bg-[#f8f8f8] px-4 py-3"
        >
          <div class="text-xs font-medium text-[#525252]">{{ item.label }}</div>
          <div class="mt-2 text-xl font-semibold text-[#161616]">
            {{ item.value }}
          </div>
        </div>
      </div>
    </div>
    <div class="pt-5">
      <PresetItemsEditor />
    </div>
  </div>
</template>
