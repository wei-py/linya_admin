<script setup>
import { storeToRefs } from "pinia"

import PresetItemsEditor from "@/components/preset/PresetItemsEditor.vue"
import { usePresetStore } from "@/stores/preset"

const presetStore = usePresetStore()
const { activePreset } = storeToRefs(presetStore)
</script>

<template>
  <div v-if="activePreset" class="panel-card h-full p-5">
    <div class="mt-3 text-2xl font-semibold text-slate-900">
      {{ activePreset.country_platform }}
    </div>
    <PresetItemsEditor />
  </div>
</template>
