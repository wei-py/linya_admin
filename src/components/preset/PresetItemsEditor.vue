<script setup>
import { storeToRefs } from "pinia"

import { booleanValueOptions, presetItemTypeOptions } from "@/constants/preset"
import { usePresetStore } from "@/stores/preset"

const presetStore = usePresetStore()
const { activePreset } = storeToRefs(presetStore)
const presetItemGridClass
  = "grid grid-cols-[40px,minmax(180px,1.1fr),140px,120px,minmax(220px,1.8fr),72px] items-center gap-4"

function handleAddPresetItem() {
  if (!activePreset.value)
    return

  presetStore.addPresetItem(activePreset.value.id)
}

function handleNameChange(item, value) {
  if (!activePreset.value)
    return

  presetStore.updatePresetItem(activePreset.value.id, item.id, {
    name: value,
  })
}

function handleTypeChange(item, value) {
  if (!activePreset.value)
    return

  presetStore.updatePresetItem(activePreset.value.id, item.id, {
    type: value,
  })
}

function handleUnitChange(item, value) {
  if (!activePreset.value)
    return

  presetStore.updatePresetItem(activePreset.value.id, item.id, {
    unit: value,
  })
}

function handleValueChange(item, value) {
  if (!activePreset.value)
    return

  presetStore.updatePresetItem(activePreset.value.id, item.id, {
    value,
  })
}

function handleRemovePresetItem(item) {
  if (!activePreset.value)
    return

  presetStore.removePresetItem(activePreset.value.id, item.id)
}

function handleFillDefaultPresetItems() {
  if (!activePreset.value)
    return

  presetStore.fillDefaultPresetItems(activePreset.value.id)
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="flex-1 overflow-y-auto">
      <div
        class="px-2 pb-3 text-sm font-semibold text-slate-600"
        :class="presetItemGridClass"
      >
        <div />
        <div>参数名称</div>
        <div>类型</div>
        <div>单位</div>
        <div>值 / 规则</div>
        <div class="text-right">操作</div>
      </div>

      <div
        v-if="activePreset?.items.length"
        class="divide-y divide-slate-200"
      >
        <div
          v-for="item in activePreset.items"
          :key="item.id"
          :class="presetItemGridClass"
          class="relative min-h-[56px] bg-white"
        >
          <div class="flex items-center justify-center text-slate-300">
            <VIcon size="16">mdi-minus</VIcon>
          </div>
          <VTextField
            :model-value="item.name"
            variant="underlined"
            density="comfortable"
            hide-details
            @update:model-value="(value) => handleNameChange(item, value)"
          />
          <VSelect
            :model-value="item.type"
            :items="presetItemTypeOptions"
            item-title="title"
            item-value="value"
            variant="underlined"
            density="comfortable"
            hide-details
            @update:model-value="(value) => handleTypeChange(item, value)"
          />
          <VTextField
            :model-value="item.unit"
            variant="underlined"
            density="comfortable"
            hide-details
            @update:model-value="(value) => handleUnitChange(item, value)"
          />
          <VSelect
            v-if="item.type === 'boolean'"
            :model-value="item.value"
            :items="booleanValueOptions"
            item-title="title"
            item-value="value"
            variant="underlined"
            density="comfortable"
            hide-details
            @update:model-value="(value) => handleValueChange(item, value)"
          />
          <VTextField
            v-else
            :model-value="item.value"
            variant="underlined"
            density="comfortable"
            hide-details
            placeholder="输入数值"
            @update:model-value="(value) => handleValueChange(item, value)"
          />
          <div class="flex items-center justify-end">
            <VBtn
              color="error"
              variant="text"
              density="comfortable"
              @click="handleRemovePresetItem(item)"
            >
              删除
            </VBtn>
          </div>
        </div>
      </div>

      <div v-else class="py-10 text-center">
        <div class="text-sm text-slate-400">当前组合还没有参数项。</div>
        <div class="mt-4 flex items-center justify-center gap-3">
          <VBtn variant="tonal" @click="handleFillDefaultPresetItems">
            补齐默认参数项
          </VBtn>
          <VBtn variant="text" @click="handleAddPresetItem">
            添加一条空参数项
          </VBtn>
        </div>
      </div>

      <div class="mt-8 flex items-center justify-end pr-10">
        <VBtn
          color="primary"
          density="comfortable"
          size="large"
          @click="handleAddPresetItem"
        >
          添加参数项
        </VBtn>
      </div>
    </div>
  </div>
</template>
