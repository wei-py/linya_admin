<script setup>
import { storeToRefs } from "pinia"
import { computed } from "vue"

import { useOptionsStore } from "@/stores/options"
import { usePresetStore } from "@/stores/preset"

const optionsStore = useOptionsStore()
const presetStore = usePresetStore()
const {
  activeGroup,
  activeGroupEntries,
  optionGroups,
  syncStatus,
} = storeToRefs(optionsStore)

const hasExcelBinding = computed(() =>
  Boolean(presetStore.hasBoundExcelFile),
)
const syncStatusText = computed(() => {
  if (!hasExcelBinding.value) {
    return "未绑定 Excel"
  }

  if (syncStatus.value === "saving") {
    return "同步中"
  }

  if (syncStatus.value === "saved") {
    return "已同步"
  }

  if (syncStatus.value === "error") {
    return "同步失败"
  }

  return "已绑定 Excel"
})
const activeGroupOptionCount = computed(() => activeGroupEntries.value.length)

function getGroupClass(groupKey) {
  if (activeGroup.value?.key === groupKey) {
    return "border-[#0f62fe] bg-[#edf5ff] text-[#161616]"
  }

  return [
    "border-[#c6c6c6]",
    "bg-white",
    "text-[#525252]",
    "hover:border-[#8d8d8d]",
    "hover:bg-[#f8f8f8]",
  ]
}

function handleAddOption() {
  optionsStore.addOption()
}

function handleAddGroup() {
  optionsStore.addGroup()
}
</script>

<template>
  <div class="h-full min-h-0 overflow-y-auto pr-2">
    <div class="workspace-page-grid">
      <VCard
        class="workspace-sheet overflow-hidden border border-[#c6c6c6] bg-white"
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
            <span>分组</span>
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
            <span>选项</span>
          </div>
        </div>

        <div class="border-b border-[#c6c6c6] px-4 py-3">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="workspace-section-header">
                <div class="workspace-section-title">1. 基础选项</div>
                <div class="workspace-section-meta">
                  {{ activeGroupOptionCount }} 项
                </div>
              </div>
              <div class="mt-0.5 text-sm text-[#525252]">
                统一维护广告类型、类目等基础选项，供创建页和模板页复用。
              </div>
            </div>
            <div class="workspace-badge">
              {{ syncStatusText }}
            </div>
          </div>
        </div>

        <div class="space-y-3 p-4">
          <div
            v-if="activeGroup"
            class="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3"
          >
            <div class="surface-field surface-field--compact">
              <div class="surface-field__label">分组名称</div>
              <VTextField
                :model-value="activeGroup.title"
                class="surface-field__control"
                variant="plain"
                hide-details
                density="compact"
                placeholder="例如 广告类型"
                @update:model-value="
                  value =>
                    optionsStore.updateGroup(activeGroup.key, { title: value })
                "
              />
            </div>
            <div class="surface-field surface-field--compact">
              <div class="surface-field__label">分组标识</div>
              <VTextField
                :model-value="activeGroup.key"
                class="surface-field__control"
                variant="plain"
                hide-details
                density="compact"
                placeholder="例如 ad_type"
                @update:model-value="
                  value =>
                    optionsStore.updateGroup(activeGroup.key, { key: value })
                "
              />
            </div>
            <div class="surface-field surface-field--compact">
              <div class="surface-field__label">分组说明</div>
              <VTextField
                :model-value="activeGroup.description"
                class="surface-field__control"
                variant="plain"
                hide-details
                density="compact"
                placeholder="描述这个分组的用途"
                @update:model-value="
                  value =>
                    optionsStore.updateGroup(activeGroup.key, {
                      description: value,
                    })
                "
              />
            </div>
          </div>

          <div class="workspace-subsection-header">
            <div class="workspace-subsection-title">
              {{ activeGroup?.title || "当前分组" }}
            </div>
            <div class="flex items-center gap-3">
              <div class="workspace-subsection-meta">
                {{ activeGroupOptionCount }}
              </div>
              <VBtn
                variant="tonal"
                size="small"
                density="compact"
                :disabled="!hasExcelBinding"
                @click="handleAddOption"
              >
                添加选项
              </VBtn>
              <VBtn
                v-if="activeGroup"
                color="error"
                variant="text"
                size="small"
                density="compact"
                @click="optionsStore.removeGroup(activeGroup.key)"
              >
                删除分组
              </VBtn>
            </div>
          </div>

          <div class="text-sm text-[#525252]">
            {{ activeGroup?.description }}
          </div>

          <div class="overflow-x-auto">
            <div
              class="overflow-hidden rounded-[2px] border border-[#c6c6c6]"
            >
              <VTable
                density="compact"
                class="w-max min-w-full table-fixed bg-white"
              >
                <colgroup>
                  <col style="width: 160px">
                  <col style="width: 160px">
                  <col style="width: 88px">
                  <col style="width: 88px">
                  <col>
                  <col style="width: 72px">
                </colgroup>
                <thead>
                  <tr
                    class="
                      bg-[#f4f4f4] text-left text-sm font-medium text-[#525252]
                    "
                  >
                    <th class="border-r px-3 py-2 font-medium">显示名称</th>
                    <th class="border-r px-3 py-2 font-medium">实际值</th>
                    <th class="border-r px-3 py-2 font-medium">排序</th>
                    <th class="border-r px-3 py-2 font-medium">启用</th>
                    <th class="border-r px-3 py-2 font-medium">备注</th>
                    <th class="px-1 py-2 text-center font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="entry in activeGroupEntries"
                    :key="entry.id"
                    class="align-top hover:bg-[#f8f8f8]"
                  >
                    <td class="border-r px-3">
                      <VTextField
                        :model-value="entry.label"
                        variant="plain"
                        hide-details
                        density="compact"
                        placeholder="显示名称"
                        @update:model-value="
                          value =>
                            optionsStore.updateOption(entry.id, {
                              label: value,
                              value: entry.value || value,
                            })
                        "
                      />
                    </td>
                    <td class="border-r px-3">
                      <VTextField
                        :model-value="entry.value"
                        variant="plain"
                        hide-details
                        density="compact"
                        placeholder="实际值"
                        @update:model-value="
                          value =>
                            optionsStore.updateOption(entry.id, { value })
                        "
                      />
                    </td>
                    <td class="border-r px-3">
                      <VTextField
                        :model-value="entry.sort"
                        type="number"
                        variant="plain"
                        hide-details
                        density="compact"
                        placeholder="排序"
                        @update:model-value="
                          value =>
                            optionsStore.updateOption(entry.id, { sort: value })
                        "
                      />
                    </td>
                    <td class="border-r px-3">
                      <VSelect
                        :model-value="entry.enabled"
                        :items="[
                          { title: '启用', value: 1 },
                          { title: '停用', value: 0 },
                        ]"
                        item-title="title"
                        item-value="value"
                        variant="plain"
                        hide-details
                        density="compact"
                        @update:model-value="
                          value =>
                            optionsStore.updateOption(entry.id, {
                              enabled: value,
                            })
                        "
                      />
                    </td>
                    <td class="border-r px-3">
                      <VTextField
                        :model-value="entry.remark"
                        variant="plain"
                        hide-details
                        density="compact"
                        placeholder="备注"
                        @update:model-value="
                          value =>
                            optionsStore.updateOption(entry.id, {
                              remark: value,
                            })
                        "
                      />
                    </td>
                    <td class="px-1 text-center align-middle">
                      <VBtn
                        color="error"
                        variant="text"
                        size="small"
                        density="compact"
                        class="min-w-0 px-1 text-xs"
                        @click="optionsStore.removeOption(entry.id)"
                      >
                        删除
                      </VBtn>
                    </td>
                  </tr>
                  <tr v-if="!activeGroupEntries.length">
                    <td colspan="6" class="p-6">
                      <div
                        class="
                          workspace-empty-state workspace-empty-state--compact
                        "
                      >
                        当前分组还没有选项。
                      </div>
                    </td>
                  </tr>
                </tbody>
              </VTable>
            </div>
          </div>
        </div>
      </VCard>

      <div class="workspace-sidebar workspace-sidebar--supporting">
        <VCard
          class="
            workspace-sheet overflow-hidden border border-[#c6c6c6] bg-white
          "
        >
          <div class="workspace-panel-header">
            <div class="workspace-panel-title">分组</div>
            <div class="flex items-center gap-3">
              <div class="workspace-panel-meta">
                {{ optionGroups.length }} 类
              </div>
              <VBtn
                variant="tonal"
                size="small"
                density="compact"
                :disabled="!hasExcelBinding"
                @click="handleAddGroup"
              >
                添加分组
              </VBtn>
            </div>
          </div>

          <div class="workspace-panel-body space-y-2.5">
            <button
              v-for="group in optionGroups"
              :key="group.key"
              type="button"
              class="
                w-full rounded-[2px] border px-3 py-2 text-left
                transition-colors lg:py-2.5
              "
              :class="getGroupClass(group.key)"
              @click="optionsStore.setActiveGroup(group.key)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm font-semibold">
                    {{ group.title }}
                  </div>
                  <div class="mt-1 text-xs text-[#525252]">
                    {{
                      optionsStore.optionEntries.filter(
                        item => item.groupKey === group.key,
                      ).length
                    }}
                    项
                  </div>
                </div>
              </div>
            </button>
          </div>
        </VCard>
      </div>
    </div>
  </div>
</template>
