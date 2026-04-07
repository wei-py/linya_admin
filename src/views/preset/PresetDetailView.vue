<script setup>
import { storeToRefs } from "pinia"

import { usePresetStore } from "@/stores/preset"

const presetStore = usePresetStore()
const { activePreset } = storeToRefs(presetStore)
</script>

<template>
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
</template>
