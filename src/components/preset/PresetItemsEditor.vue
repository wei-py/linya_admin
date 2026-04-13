<script setup>
import { storeToRefs } from "pinia"
import { computed, ref } from "vue"

import { booleanValueOptions, presetItemTypeOptions } from "@/constants/preset"
import { usePresetStore } from "@/stores/preset"
import { useTemplateStore } from "@/stores/template"
import {
  buildRulePreview,
  createDefaultRuleAction,
  createDefaultRuleConfig,
  getRulePrimaryTableId,
  getRuleResultUnit,
  getTableArgLabels,
  normalizePresetRuleMode,
  normalizeRuleConfig,
  parseRuleConfig,
  presetRuleActionKindOptions,
  presetRuleFieldOptions,
  presetRuleModeOptions,
  presetRuleOperatorOptions,
} from "@/utils/preset/rule-config"

const presetStore = usePresetStore()
const templateStore = useTemplateStore()
const { activePreset } = storeToRefs(presetStore)
const { templateTables } = storeToRefs(templateStore)

const ruleDialog = ref(false)
const editingRuleItemId = ref("")
const ruleDraft = ref(createRuleDraft())

const availableTemplateTableOptions = computed(() => {
  const currentCountry = activePreset.value?.country || ""
  const currentPlatform = activePreset.value?.platform || ""
  const exactMatches = []
  const otherMatches = []

  templateTables.value.forEach((table) => {
    const option = {
      title: table.name,
      value: table.id,
      subtitle: [table.country, table.platform, table.ruleType]
        .filter(Boolean)
        .join(" / "),
    }

    if (
      table.country === currentCountry
      && table.platform === currentPlatform
    ) {
      exactMatches.push(option)
      return
    }

    otherMatches.push(option)
  })

  return [...exactMatches, ...otherMatches]
})

const editingRuleItem = computed(() =>
  activePreset.value?.items.find(item => item.id === editingRuleItemId.value)
  || null,
)

const normalizedDraftConfig = computed(() =>
  normalizeRuleConfig(
    ruleDraft.value.mode,
    ruleDraft.value.config,
    templateTables.value,
  ),
)

const currentRulePreview = computed(() => {
  const preview = buildRulePreview(
    ruleDraft.value.mode,
    normalizedDraftConfig.value,
    templateTables.value,
  )

  return preview || "未配置规则"
})

const currentTableArgLabels = computed(() => {
  const table = findTemplateTable(ruleDraft.value.config.tableId)

  return getTableArgLabels(table)
})

const presetItemSections = computed(() => {
  const items = activePreset.value?.items || []

  return [
    {
      key: "number",
      title: "数值项",
      addLabel: "添加数值项",
      emptyText: "暂无数值项。",
      items: items.filter(item => item.type === "number"),
    },
    {
      key: "boolean",
      title: "布尔项",
      addLabel: "添加布尔项",
      emptyText: "暂无布尔项。",
      items: items.filter(item => item.type === "boolean"),
    },
    {
      key: "rule",
      title: "规则项",
      addLabel: "添加规则项",
      emptyText: "暂无规则项。",
      items: items.filter(item => item.type === "rule"),
    },
  ]
})

const presetItemSummary = computed(() => {
  const items = activePreset.value?.items || []

  return [
    { label: "参数项", value: items.length },
    {
      label: "规则项",
      value: items.filter(item => item.type === "rule").length,
    },
    {
      label: "布尔项",
      value: items.filter(item => item.type === "boolean").length,
    },
  ]
})

function createRuleDraft(mode = "table", config) {
  return {
    mode: normalizePresetRuleMode(mode),
    config: config || createDefaultRuleConfig(mode),
  }
}

function findTemplateTable(tableId) {
  return templateTables.value.find(table => table.id === tableId) || null
}

function ensureArgsForTable(tableId, args = []) {
  const labels = getTableArgLabels(findTemplateTable(tableId))

  return Array.from({ length: labels.length }, (_, index) => args[index] || "")
}

function createDisplayConfig(item) {
  const mode = normalizePresetRuleMode(item.rule_mode || "table")
  let config = parseRuleConfig(item.rule_config, mode, templateTables.value)

  if (mode === "table" && !config.tableId && item.rule_table_id) {
    config = {
      ...config,
      tableId: item.rule_table_id,
      args: ensureArgsForTable(item.rule_table_id, config.args),
    }
  }

  if (mode === "advanced" && !config.expression && item.value) {
    config = {
      ...config,
      expression: item.value,
    }
  }

  return {
    mode,
    config,
  }
}

function getRuleDisplayValue(item) {
  const displayConfig = createDisplayConfig(item)
  const preview = buildRulePreview(
    displayConfig.mode,
    displayConfig.config,
    templateTables.value,
  )

  return preview || item.value || "未配置规则"
}

function handleAddPresetItem(type = "number") {
  if (!activePreset.value)
    return

  const nextItem = presetStore.addPresetItem(activePreset.value.id)

  if (!nextItem)
    return

  if (type === "number")
    return

  presetStore.updatePresetItem(activePreset.value.id, nextItem.id, {
    type,
  })

  if (type === "rule") {
    openRuleDialog(nextItem)
  }
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

function openRuleDialog(item) {
  editingRuleItemId.value = item.id
  ruleDraft.value = createDisplayConfig(item)
  ruleDialog.value = true
}

function getPresetItemIndex(itemId) {
  return (
    (activePreset.value?.items.findIndex(item => item.id === itemId) || 0) + 1
  )
}

function closeRuleDialog() {
  ruleDialog.value = false
  editingRuleItemId.value = ""
  ruleDraft.value = createRuleDraft()
}

function handleRuleModeChange(mode) {
  ruleDraft.value = createRuleDraft(mode)
}

function handleDraftTableChange(tableId) {
  ruleDraft.value = {
    ...ruleDraft.value,
    config: {
      ...ruleDraft.value.config,
      tableId: tableId || "",
      args: ensureArgsForTable(tableId, ruleDraft.value.config.args),
    },
  }
}

function handleDraftArgChange(index, value) {
  const args = [...(ruleDraft.value.config.args || [])]

  args[index] = value || ""
  ruleDraft.value = {
    ...ruleDraft.value,
    config: {
      ...ruleDraft.value.config,
      args,
    },
  }
}

function updateConditionConfig(patch) {
  ruleDraft.value = {
    ...ruleDraft.value,
    config: {
      ...ruleDraft.value.config,
      ...patch,
    },
  }
}

function resetConditionAction(actionKey, kind) {
  updateConditionConfig({
    [actionKey]: createDefaultRuleAction(kind),
  })
}

function updateConditionAction(actionKey, patch) {
  const currentAction
    = ruleDraft.value.config[actionKey] || createDefaultRuleAction()

  ruleDraft.value = {
    ...ruleDraft.value,
    config: {
      ...ruleDraft.value.config,
      [actionKey]: {
        ...currentAction,
        ...patch,
      },
    },
  }
}

function handleConditionActionTableChange(actionKey, tableId) {
  const currentAction
    = ruleDraft.value.config[actionKey] || createDefaultRuleAction("table")

  updateConditionAction(actionKey, {
    kind: "table",
    tableId: tableId || "",
    args: ensureArgsForTable(tableId, currentAction.args),
  })
}

function handleConditionActionArgChange(actionKey, index, value) {
  const currentAction
    = ruleDraft.value.config[actionKey] || createDefaultRuleAction("table")
  const args = [...(currentAction.args || [])]

  args[index] = value || ""
  updateConditionAction(actionKey, {
    args,
  })
}

function getConditionActionArgLabels(actionKey) {
  const action = ruleDraft.value.config[actionKey]
  const table = findTemplateTable(action?.tableId)

  return getTableArgLabels(table)
}

function appendToAdvancedExpression(content) {
  if (ruleDraft.value.mode !== "advanced")
    return

  const currentExpression = ruleDraft.value.config.expression || ""
  const nextExpression = currentExpression
    ? `${currentExpression}${content}`
    : content

  ruleDraft.value = {
    ...ruleDraft.value,
    config: {
      ...ruleDraft.value.config,
      expression: nextExpression,
    },
  }
}

function createAdvancedTableSnippet(table) {
  const args = getTableArgLabels(table).map((_, index) => `参数${index + 1}`)

  return buildRulePreview(
    "table",
    {
      tableId: table.id,
      args,
    },
    templateTables.value,
  )
}

function saveRuleDialog() {
  if (!activePreset.value || !editingRuleItem.value) {
    closeRuleDialog()
    return
  }

  const nextMode = normalizePresetRuleMode(ruleDraft.value.mode)
  const nextConfig = normalizeRuleConfig(
    nextMode,
    ruleDraft.value.config,
    templateTables.value,
  )
  const preview = buildRulePreview(
    nextMode,
    nextConfig,
    templateTables.value,
  )

  presetStore.updatePresetItem(
    activePreset.value.id,
    editingRuleItem.value.id,
    {
      type: "rule",
      rule_mode: nextMode,
      rule_table_id: getRulePrimaryTableId(nextMode, nextConfig),
      rule_config: nextConfig,
      value: preview,
      unit: getRuleResultUnit(
        nextMode,
        nextConfig,
        templateTables.value,
        editingRuleItem.value.unit,
      ),
    },
  )
  closeRuleDialog()
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div
      class="
        mb-4 flex flex-wrap items-center justify-between gap-3 border-b
        border-[#c6c6c6] pb-4
      "
    >
      <div class="flex flex-wrap items-center gap-3">
        <div
          v-for="item in presetItemSummary"
          :key="item.label"
          class="
            inline-flex items-center gap-2 border border-[#c6c6c6]
            bg-[#f8f8f8] px-3 py-1
          "
        >
          <span class="text-xs text-[#525252]">{{ item.label }}</span>
          <span class="text-[13px] font-semibold text-[#161616]">
            {{ item.value }}
          </span>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <VBtn
          variant="tonal"
          size="small"
          @click="handleFillDefaultPresetItems"
        >
          补齐默认项
        </VBtn>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div v-if="activePreset?.items.length" class="space-y-6">
        <section
          v-for="section in presetItemSections"
          :key="section.key"
          class="grid gap-3"
        >
          <div class="workspace-section-header">
            <div class="flex items-center gap-3">
              <div class="workspace-section-title">
                {{ section.title }}
              </div>
              <div class="workspace-section-meta">
                {{ section.items.length }} 项
              </div>
            </div>
            <VBtn
              variant="tonal"
              size="small"
              @click="handleAddPresetItem(section.key)"
            >
              {{ section.addLabel }}
            </VBtn>
          </div>

          <div
            v-if="section.items.length"
            class="
              overflow-hidden rounded-[2px] border border-[#c6c6c6]
            "
          >
            <VTable density="compact" hover class="bg-white">
              <thead>
                <tr class="bg-[#f4f4f4]">
                  <th
                    class="
                      w-24 border-r border-[#c6c6c6] text-center text-xs
                      font-semibold text-[#525252]
                    "
                  >
                    序号
                  </th>
                  <th
                    class="
                      min-w-[180px] border-r border-[#c6c6c6] text-xs
                      font-semibold text-[#525252]
                    "
                  >
                    参数名称
                  </th>
                  <th
                    class="
                      w-[120px] border-r border-[#c6c6c6] text-xs font-semibold
                      text-[#525252]
                    "
                  >
                    类型
                  </th>
                  <th
                    class="
                      w-[120px] border-r border-[#c6c6c6] text-xs font-semibold
                      text-[#525252]
                    "
                  >
                    单位
                  </th>
                  <th
                    class="
                      min-w-[240px] border-r border-[#c6c6c6] text-xs
                      font-semibold text-[#525252]
                    "
                  >
                    值 / 规则
                  </th>
                  <th
                    class="
                      w-[88px] text-center text-xs font-semibold
                      text-[#525252]
                    "
                  >
                    操作
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="item in section.items"
                  :key="item.id"
                  class="transition-colors hover:bg-[#f8f8f8]"
                >
                  <td
                    class="
                      border-r border-[#e0e0e0] px-4 text-center align-middle
                    "
                  >
                    <span
                      class="text-xs font-medium tabular-nums text-[#525252]"
                    >
                      {{ getPresetItemIndex(item.id) }}
                    </span>
                  </td>
                  <td class="border-r border-[#e0e0e0] align-middle">
                    <VTextField
                      :model-value="item.name"
                      variant="plain"
                      density="compact"
                      hide-details
                      @update:model-value="
                        value => handleNameChange(item, value)
                      "
                    />
                  </td>
                  <td class="border-r border-[#e0e0e0] align-middle">
                    <VSelect
                      :model-value="item.type"
                      :items="presetItemTypeOptions"
                      item-title="title"
                      item-value="value"
                      variant="plain"
                      density="compact"
                      hide-details
                      @update:model-value="
                        value => handleTypeChange(item, value)
                      "
                    />
                  </td>
                  <td class="border-r border-[#e0e0e0] align-middle">
                    <VTextField
                      :model-value="item.unit"
                      variant="plain"
                      density="compact"
                      hide-details
                      @update:model-value="
                        value => handleUnitChange(item, value)
                      "
                    />
                  </td>
                  <td class="border-r border-[#e0e0e0] align-middle">
                    <VSelect
                      v-if="item.type === 'boolean'"
                      :model-value="item.value"
                      :items="booleanValueOptions"
                      item-title="title"
                      item-value="value"
                      variant="plain"
                      density="compact"
                      hide-details
                      @update:model-value="
                        value => handleValueChange(item, value)
                      "
                    />
                    <div
                      v-else-if="item.type === 'rule'"
                      class="flex items-center gap-2"
                    >
                      <VTextField
                        :model-value="getRuleDisplayValue(item)"
                        variant="plain"
                        density="compact"
                        hide-details
                        readonly
                      />
                      <VBtn
                        color="primary"
                        variant="text"
                        density="compact"
                        @click="openRuleDialog(item)"
                      >
                        配置规则
                      </VBtn>
                    </div>
                    <VTextField
                      v-else
                      :model-value="item.value"
                      variant="plain"
                      density="compact"
                      hide-details
                      placeholder="输入数值"
                      @update:model-value="
                        value => handleValueChange(item, value)
                      "
                    />
                  </td>
                  <td
                    class="
                      text-center align-middle
                    "
                  >
                    <VBtn
                      color="error"
                      variant="text"
                      density="compact"
                      @click="handleRemovePresetItem(item)"
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
            class="workspace-empty-state workspace-empty-state--compact"
          >
            {{ section.emptyText }}
          </div>
        </section>
      </div>

      <div v-else class="workspace-empty-state flex-col gap-4">
        <div>当前组合还没有参数项。</div>
        <div class="flex items-center justify-center gap-3">
          <VBtn variant="tonal" @click="handleFillDefaultPresetItems">
            补齐默认参数项
          </VBtn>
          <VBtn variant="text" @click="handleAddPresetItem">
            添加一条空参数项
          </VBtn>
        </div>
      </div>
    </div>
  </div>

  <VDialog v-model="ruleDialog" max-width="980" scrollable>
    <VCard class="border border-[#c6c6c6] bg-white">
      <VCardTitle class="border-b border-[#c6c6c6] px-5 py-4">
        配置规则
      </VCardTitle>
      <VCardText class="space-y-4">
        <div class="flex flex-wrap gap-2">
          <VBtn
            v-for="option in presetRuleModeOptions"
            :key="option.value"
            :variant="
              ruleDraft.mode === option.value ? 'flat' : 'tonal'
            "
            :color="ruleDraft.mode === option.value ? 'primary' : undefined"
            @click="handleRuleModeChange(option.value)"
          >
            {{ option.title }}
          </VBtn>
        </div>

        <div v-if="ruleDraft.mode === 'table'" class="space-y-4">
          <div class="surface-field">
            <div class="surface-field__label">规则表</div>
            <VSelect
              :model-value="ruleDraft.config.tableId"
              :items="availableTemplateTableOptions"
              item-title="title"
              item-value="value"
              class="surface-field__control"
              variant="plain"
              hide-details
              @update:model-value="handleDraftTableChange"
            />
          </div>

          <div
            v-if="currentTableArgLabels.length"
            class="grid gap-4 md:grid-cols-2"
          >
            <div
              v-for="(label, index) in currentTableArgLabels"
              :key="`table_arg_${index}`"
              class="surface-field"
            >
              <div class="surface-field__label">{{ label }}</div>
              <VSelect
                :model-value="ruleDraft.config.args?.[index] || ''"
                :items="presetRuleFieldOptions"
                item-title="title"
                item-value="value"
                class="surface-field__control"
                variant="plain"
                hide-details
                @update:model-value="
                  value => handleDraftArgChange(index, value)
                "
              />
            </div>
          </div>
        </div>

        <div v-else-if="ruleDraft.mode === 'condition'" class="space-y-4">
          <div class="grid gap-4 md:grid-cols-3">
            <div class="surface-field">
              <div class="surface-field__label">条件字段</div>
              <VSelect
                :model-value="ruleDraft.config.field"
                :items="presetRuleFieldOptions"
                item-title="title"
                item-value="value"
                class="surface-field__control"
                variant="plain"
                hide-details
                @update:model-value="
                  value => updateConditionConfig({ field: value })
                "
              />
            </div>
            <div class="surface-field">
              <div class="surface-field__label">条件运算</div>
              <VSelect
                :model-value="ruleDraft.config.operator"
                :items="presetRuleOperatorOptions"
                item-title="title"
                item-value="value"
                class="surface-field__control"
                variant="plain"
                hide-details
                @update:model-value="
                  value => updateConditionConfig({ operator: value })
                "
              />
            </div>
            <div
              v-if="ruleDraft.config.operator !== 'truthy'"
              class="surface-field"
            >
              <div class="surface-field__label">比较值</div>
              <VTextField
                :model-value="ruleDraft.config.compareValue"
                class="surface-field__control"
                variant="plain"
                hide-details
                @update:model-value="
                  value => updateConditionConfig({ compareValue: value })
                "
              />
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div class="border border-[#e0e0e0] bg-[#f8f8f8] p-4">
              <div class="text-sm font-semibold text-[#161616]">条件成立时</div>
              <div class="mt-4 space-y-4">
                <div class="surface-field">
                  <div class="surface-field__label">返回类型</div>
                  <VSelect
                    :model-value="ruleDraft.config.thenAction?.kind"
                    :items="presetRuleActionKindOptions"
                    item-title="title"
                    item-value="value"
                    class="surface-field__control"
                    variant="plain"
                    hide-details
                    @update:model-value="
                      value => resetConditionAction('thenAction', value)
                    "
                  />
                </div>

                <div
                  v-if="ruleDraft.config.thenAction?.kind === 'fixed'"
                  class="surface-field"
                >
                  <div class="surface-field__label">固定值</div>
                  <VTextField
                    :model-value="ruleDraft.config.thenAction?.value"
                    class="surface-field__control"
                    variant="plain"
                    hide-details
                    @update:model-value="
                      value => updateConditionAction('thenAction', { value })
                    "
                  />
                </div>

                <template v-else>
                  <div class="surface-field">
                    <div class="surface-field__label">规则表</div>
                    <VSelect
                      :model-value="ruleDraft.config.thenAction?.tableId"
                      :items="availableTemplateTableOptions"
                      item-title="title"
                      item-value="value"
                      class="surface-field__control"
                      variant="plain"
                      hide-details
                      @update:model-value="
                        value => handleConditionActionTableChange(
                          'thenAction',
                          value,
                        )
                      "
                    />
                  </div>
                  <div
                    v-if="getConditionActionArgLabels('thenAction').length"
                    class="grid gap-4 md:grid-cols-2"
                  >
                    <div
                      v-for="(label, index) in getConditionActionArgLabels(
                        'thenAction',
                      )"
                      :key="`then_arg_${index}`"
                      class="surface-field"
                    >
                      <div class="surface-field__label">{{ label }}</div>
                      <VSelect
                        :model-value="
                          ruleDraft.config.thenAction?.args?.[index] || ''
                        "
                        :items="presetRuleFieldOptions"
                        item-title="title"
                        item-value="value"
                        class="surface-field__control"
                        variant="plain"
                        hide-details
                        @update:model-value="
                          value => handleConditionActionArgChange(
                            'thenAction',
                            index,
                            value,
                          )
                        "
                      />
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <div class="border border-[#e0e0e0] bg-[#f8f8f8] p-4">
              <div class="text-sm font-semibold text-[#161616]">条件不成立时</div>
              <div class="mt-4 space-y-4">
                <div class="surface-field">
                  <div class="surface-field__label">返回类型</div>
                  <VSelect
                    :model-value="ruleDraft.config.elseAction?.kind"
                    :items="presetRuleActionKindOptions"
                    item-title="title"
                    item-value="value"
                    class="surface-field__control"
                    variant="plain"
                    hide-details
                    @update:model-value="
                      value => resetConditionAction('elseAction', value)
                    "
                  />
                </div>

                <div
                  v-if="ruleDraft.config.elseAction?.kind === 'fixed'"
                  class="surface-field"
                >
                  <div class="surface-field__label">固定值</div>
                  <VTextField
                    :model-value="ruleDraft.config.elseAction?.value"
                    class="surface-field__control"
                    variant="plain"
                    hide-details
                    @update:model-value="
                      value => updateConditionAction('elseAction', { value })
                    "
                  />
                </div>

                <template v-else>
                  <div class="surface-field">
                    <div class="surface-field__label">规则表</div>
                    <VSelect
                      :model-value="ruleDraft.config.elseAction?.tableId"
                      :items="availableTemplateTableOptions"
                      item-title="title"
                      item-value="value"
                      class="surface-field__control"
                      variant="plain"
                      hide-details
                      @update:model-value="
                        value => handleConditionActionTableChange(
                          'elseAction',
                          value,
                        )
                      "
                    />
                  </div>
                  <div
                    v-if="getConditionActionArgLabels('elseAction').length"
                    class="grid gap-4 md:grid-cols-2"
                  >
                    <div
                      v-for="(label, index) in getConditionActionArgLabels(
                        'elseAction',
                      )"
                      :key="`else_arg_${index}`"
                      class="surface-field"
                    >
                      <div class="surface-field__label">{{ label }}</div>
                      <VSelect
                        :model-value="
                          ruleDraft.config.elseAction?.args?.[index] || ''
                        "
                        :items="presetRuleFieldOptions"
                        item-title="title"
                        item-value="value"
                        class="surface-field__control"
                        variant="plain"
                        hide-details
                        @update:model-value="
                          value => handleConditionActionArgChange(
                            'elseAction',
                            index,
                            value,
                          )
                        "
                      />
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="space-y-4">
          <div class="flex flex-wrap gap-2">
            <VBtn
              variant="tonal"
              size="small"
              @click="appendToAdvancedExpression('if()')"
            >
              if()
            </VBtn>
            <VBtn
              variant="tonal"
              size="small"
              @click="appendToAdvancedExpression('round()')"
            >
              round()
            </VBtn>
            <VBtn
              variant="tonal"
              size="small"
              @click="appendToAdvancedExpression('min()')"
            >
              min()
            </VBtn>
            <VBtn
              variant="tonal"
              size="small"
              @click="appendToAdvancedExpression('max()')"
            >
              max()
            </VBtn>
          </div>

          <div class="flex flex-wrap gap-2">
            <VBtn
              v-for="field in presetRuleFieldOptions"
              :key="field.value"
              variant="text"
              size="small"
              @click="appendToAdvancedExpression(`{${field.value}}`)"
            >
              {{ field.title }}
            </VBtn>
          </div>

          <div class="flex flex-wrap gap-2">
            <VBtn
              v-for="table in templateTables"
              :key="table.id"
              variant="text"
              size="small"
              @click="
                appendToAdvancedExpression(
                  createAdvancedTableSnippet(table),
                )
              "
            >
              引用 {{ table.name }}
            </VBtn>
          </div>

          <div class="surface-field">
            <div class="surface-field__label">规则文本</div>
            <textarea
              :value="ruleDraft.config.expression"
              rows="6"
              class="surface-field__native min-h-[144px]"
              @input="
                updateConditionConfig({ expression: $event.target.value })
              "
            />
          </div>
        </div>

        <div class="border border-[#e0e0e0] bg-[#f8f8f8] px-4 py-3">
          <div class="text-sm font-semibold text-[#161616]">规则文本</div>
          <div class="mt-2 break-all text-sm text-[#525252]">
            {{ currentRulePreview }}
          </div>
        </div>

        <div class="text-sm text-[#6f6f6f]">
          规则项行内只读展示，所有规则都通过这里结构化配置。
        </div>
      </VCardText>
      <VCardActions class="justify-end">
        <VBtn variant="text" @click="closeRuleDialog">取消</VBtn>
        <VBtn color="primary" @click="saveRuleDialog">保存规则</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
