<script setup>
import { storeToRefs } from "pinia"
import { computed, watch } from "vue"

import {
  createCalculationInputFields,
  createProductBaseFields,
} from "@/constants/create"
import { countryOptions, platformOptions } from "@/constants/preset"
import {
  createTemplateDimension,
  createTemplateRecord,
  createTemplateResultColumn,
  createTemplateTable,
  getTemplateRuleTypeSummary,
  templateRuleTypeOptions,
} from "@/constants/template"
import { useOptionsStore } from "@/stores/options"
import { usePresetStore } from "@/stores/preset"
import { useTemplateStore } from "@/stores/template"
import {
  findOptionBackedFieldByName,
  optionBackedFieldDefinitions,
  resolveOptionGroupKey,
} from "@/utils/app-fields"

const optionsStore = useOptionsStore()
const presetStore = usePresetStore()
const templateStore = useTemplateStore()
const {
  templateTables,
  activeTableId,
  activeTemplateTable,
  syncStatus,
} = storeToRefs(templateStore)
const { getOptionLabelsByGroupKey, optionGroups } = storeToRefs(optionsStore)

const hasExcelBinding = computed(() =>
  Boolean(presetStore.hasBoundExcelFile),
)

const selectedTable = computed(() => activeTemplateTable.value || null)
const templateSchemaFieldCount = computed(
  () =>
    (selectedTable.value?.dimensions?.length || 0)
    + (selectedTable.value?.resultColumns?.length || 0),
)
const templateBaseFieldCount = computed(
  () => 6 + templateSchemaFieldCount.value,
)

function getOptionValuesByGroupKey(groupKey = "") {
  return getOptionLabelsByGroupKey.value(resolveOptionGroupKey(groupKey))
}

const configurableFieldCatalog = computed(() => {
  const fieldMap = new Map()

  createProductBaseFields.forEach((field) => {
    const fieldName = String(field.label || "").trim()

    if (!fieldName || fieldMap.has(fieldName)) {
      return
    }

    fieldMap.set(fieldName, {
      name: fieldName,
      type: field.type || "text",
      source: "product",
    })
  })

  createCalculationInputFields.forEach((field) => {
    const fieldName = String(field.label || "").trim()

    if (!fieldName || fieldMap.has(fieldName)) {
      return
    }

    fieldMap.set(fieldName, {
      name: fieldName,
      type: field.type || "text",
      source: "calculation",
    })
  })

  optionGroups.value.forEach((group) => {
    const fieldName = String(group.title || "").trim()

    if (!fieldName || fieldMap.has(fieldName)) {
      return
    }

    fieldMap.set(fieldName, {
      name: fieldName,
      type: "option",
      source: "options",
      optionGroupKey: group.key,
    })
  })

  optionBackedFieldDefinitions.forEach((field) => {
    if (fieldMap.has(field.fieldName)) {
      return
    }

    fieldMap.set(field.fieldName, {
      name: field.fieldName,
      type: "option",
      source: "options",
      optionGroupKey: field.optionGroupKey,
    })
  })

  return Array.from(fieldMap.values())
})

const templateRuleContentMetaText = computed(() => {
  if (!selectedTable.value) {
    return "0 项"
  }

  return `${selectedTable.value.records?.length || 0} 行`
})
const templateRuleContentDescription = computed(() => {
  return "规则表由多个维度和结果列组成。枚举可任意增加，区间也可任意增加。"
})
const selectedDimensions = computed(() => selectedTable.value?.dimensions || [])
const selectedResultColumns = computed(
  () => selectedTable.value?.resultColumns || [],
)
const templateSyncStatusText = computed(() => {
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

function getLookupExample(table) {
  const args = (table?.dimensions || [])
    .map(dimension => `{${dimension.fieldName || "参数"}}`)
    .join(", ")

  return args
    ? `查表("${table.name || "未命名规则表"}", ${args})`
    : `查表("${table.name || "未命名规则表"}")`
}

function getTemplateTableClass(tableId) {
  if (activeTableId.value === tableId) {
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

function getTemplateTableSummary(table) {
  return `${getTemplateRuleTypeSummary(table.dimensions || [])} · ${table.records?.length || 0} 行`
}

function getRuleTableColumnStyle(column) {
  if (column.kind === "range") {
    return { width: "136px" }
  }

  if (column.kind === "enum") {
    return { width: "168px" }
  }

  return { width: "144px" }
}

const selectedRuleColumns = computed(() => {
  const dimensions = selectedDimensions.value.flatMap((dimension) => {
    const fieldSource = resolveFieldSourceDescriptor(dimension.fieldName)

    if (dimension.kind === "range") {
      return [
        {
          id: `${dimension.id}__min`,
          key: `${dimension.id}__min`,
          label: `${dimension.fieldName || "区间"}起始`,
          kind: "range",
          type: "number",
        },
        {
          id: `${dimension.id}__max`,
          key: `${dimension.id}__max`,
          label: `${dimension.fieldName || "区间"}结束`,
          kind: "range",
          type: "number",
        },
      ]
    }

    return [
      {
        id: dimension.id,
        key: dimension.id,
        label: dimension.fieldName || "枚举值",
        kind: "enum",
        type: "text",
        control: fieldSource.control,
        optionGroupKey: fieldSource.optionGroupKey,
      },
    ]
  })
  const resultColumns = selectedResultColumns.value.map(column => ({
    id: column.id,
    key: column.id,
    label: column.label || "结果值",
    kind: "result",
    type: column.type || "number",
  }))
  const remarkColumn = {
    id: "remark",
    key: "remark",
    label: "备注",
    kind: "remark",
    type: "text",
  }

  return [...dimensions, ...resultColumns, remarkColumn]
})

function getRuleColumnItems(column) {
  return getOptionValuesByGroupKey(column.optionGroupKey)
}

function resolveFieldSourceDescriptor(value = "") {
  const fieldName = String(value || "").trim()

  if (!fieldName) {
    return {
      fieldName: "",
      control: "text",
      optionGroupKey: "",
    }
  }

  const matchedGroup = optionGroups.value.find((group) => {
    const title = String(group.title || "").trim()
    const key = String(group.key || "").trim()

    return (
      title === fieldName
      || key === fieldName
      || key === resolveOptionGroupKey(fieldName)
    )
  })

  if (matchedGroup) {
    return {
      fieldName: String(matchedGroup.title || fieldName).trim(),
      control: "select",
      optionGroupKey: matchedGroup.key,
    }
  }

  const matchedField = findOptionBackedFieldByName(fieldName)

  if (matchedField) {
    return {
      fieldName: matchedField.fieldName,
      control: "select",
      optionGroupKey: matchedField.optionGroupKey,
    }
  }

  return {
    fieldName,
    control: "text",
    optionGroupKey: "",
  }
}

function handleAddTable() {
  if (!hasExcelBinding.value)
    return

  templateStore.addTemplateTable()
}

function handleRemoveTable(id) {
  if (!hasExcelBinding.value)
    return

  templateStore.removeTemplateTable(id)
}

function handleRuleTypeChange(value) {
  if (!selectedTable.value)
    return

  const nextShape = createTemplateTable(value)

  Object.assign(selectedTable.value, {
    ruleType: value,
    dimensions: nextShape.dimensions || [],
    resultColumns: nextShape.resultColumns || [],
    records: [createTemplateRecord(
      nextShape.dimensions || [],
      nextShape.resultColumns || [],
    )],
    rows: nextShape.rows || [],
    columns: nextShape.columns || [],
    xAxisLabel: nextShape.xAxisLabel || "",
    yAxisLabel: nextShape.yAxisLabel || "",
  })
  templateStore.persistTemplateChanges()
}

function handleAddRow() {
  if (!selectedTable.value)
    return

  selectedTable.value.records.push(
    createTemplateRecord(
      selectedTable.value.dimensions || [],
      selectedTable.value.resultColumns || [],
    ),
  )
  templateStore.persistTemplateChanges()
}

function handleRemoveRow(rowId) {
  if (!selectedTable.value)
    return

  selectedTable.value.records = selectedTable.value.records.filter(
    item => item.id !== rowId,
  )

  if (!selectedTable.value.records.length) {
    selectedTable.value.records = [
      createTemplateRecord(
        selectedTable.value.dimensions || [],
        selectedTable.value.resultColumns || [],
      ),
    ]
  }

  templateStore.persistTemplateChanges()
}

function handleAddDimension(kind = "enum") {
  if (!selectedTable.value)
    return

  const nextDimension = createTemplateDimension(kind)

  selectedTable.value.dimensions.push(nextDimension)
  selectedTable.value.records.forEach((record) => {
    if (!record.values) {
      record.values = {}
    }

    if (nextDimension.kind === "range") {
      record.values[`${nextDimension.id}__min`] = ""
      record.values[`${nextDimension.id}__max`] = ""
      return
    }

    record.values[nextDimension.id] = ""
  })
  templateStore.persistTemplateChanges()
}

function handleRemoveDimension(dimensionId) {
  if (!selectedTable.value)
    return

  selectedTable.value.dimensions = selectedTable.value.dimensions.filter(
    item => item.id !== dimensionId,
  )
  selectedTable.value.records.forEach((record) => {
    delete record.values?.[dimensionId]
    delete record.values?.[`${dimensionId}__min`]
    delete record.values?.[`${dimensionId}__max`]
  })

  templateStore.persistTemplateChanges()
}

function handleDimensionKindChange(dimension, nextKind) {
  if (!selectedTable.value || !dimension) {
    return
  }

  const normalizedKind = nextKind === "range" ? "range" : "enum"
  const previousKind = dimension.kind

  if (previousKind === normalizedKind) {
    return
  }

  selectedTable.value.records.forEach((record) => {
    if (normalizedKind === "range") {
      const previousValue = record.values?.[dimension.id] ?? ""

      delete record.values?.[dimension.id]
      record.values[`${dimension.id}__min`] = previousValue
      record.values[`${dimension.id}__max`] = ""
      return
    }

    const nextValue = record.values?.[`${dimension.id}__min`] ?? ""

    delete record.values?.[`${dimension.id}__min`]
    delete record.values?.[`${dimension.id}__max`]
    record.values[dimension.id] = nextValue
  })

  dimension.kind = normalizedKind
  templateStore.persistTemplateChanges()
}

function handleAddResultColumn() {
  if (!selectedTable.value)
    return

  const nextColumn = createTemplateResultColumn()

  selectedTable.value.resultColumns.push(nextColumn)
  selectedTable.value.records.forEach((record) => {
    if (!record.values) {
      record.values = {}
    }

    record.values[nextColumn.id] = ""
  })
  templateStore.persistTemplateChanges()
}

function handleRemoveResultColumn(columnId) {
  if (!selectedTable.value)
    return

  selectedTable.value.resultColumns = selectedTable.value.resultColumns.filter(
    item => item.id !== columnId,
  )
  selectedTable.value.records.forEach((record) => {
    delete record.values?.[columnId]
  })

  if (!selectedTable.value.resultColumns.length) {
    handleAddResultColumn()
    return
  }

  templateStore.persistTemplateChanges()
}

watch(
  templateTables,
  () => {
    if (!hasExcelBinding.value || !templateTables.value.length)
      return

    templateStore.persistTemplateChanges()
  },
  { deep: true },
)
</script>

<template>
  <div class="h-full min-h-0 overflow-y-auto pr-2">
    <div class="workspace-page-grid">
      <div v-if="selectedTable" class="space-y-4">
        <VCard
          class="
            workspace-sheet overflow-hidden border border-[#c6c6c6] bg-white
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
              <span>基础</span>
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
              <span>说明</span>
            </div>
            <div
              class="inline-flex items-center gap-2 text-[13px] text-[#161616]"
            >
              <span
                class="
                  inline-flex h-5 w-5 items-center justify-center border
                  border-[#c6c6c6] text-xs
                "
              >3</span>
              <span>规则</span>
            </div>
          </div>

          <div class="border-b border-[#c6c6c6] px-4 py-3">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div class="workspace-section-header">
                  <div class="workspace-section-title">1. 基础信息</div>
                  <div class="workspace-section-meta">
                    {{ templateBaseFieldCount }} 项
                  </div>
                </div>
                <div class="mt-0.5 text-sm text-[#525252]">
                  当前已改成从已绑定的 Excel 读取规则表，并同步回同一个文件。
                </div>
              </div>
              <div class="workspace-badge">
                {{ templateSyncStatusText }}
              </div>
            </div>
          </div>

          <div class="space-y-2.5 p-3.5">
            <div
              class="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
            >
              <div class="surface-field surface-field--compact">
                <div class="surface-field__label">规则表名称</div>
                <VTextField
                  v-model="selectedTable.name"
                  class="surface-field__control"
                  placeholder="例如 巴西美客多佣金表"
                  variant="plain"
                  hide-details
                  density="compact"
                />
              </div>
              <div class="surface-field surface-field--compact">
                <div class="surface-field__label">规则类型</div>
                <VSelect
                  :model-value="selectedTable.ruleType"
                  :items="templateRuleTypeOptions"
                  item-title="title"
                  item-value="value"
                  class="surface-field__control"
                  variant="plain"
                  hide-details
                  density="compact"
                  @update:model-value="handleRuleTypeChange"
                />
              </div>
              <div class="surface-field surface-field--compact">
                <div class="surface-field__label">国家</div>
                <VAutocomplete
                  v-model="selectedTable.country"
                  :items="countryOptions"
                  class="surface-field__control"
                  variant="plain"
                  hide-details
                  density="compact"
                />
              </div>
              <div class="surface-field surface-field--compact">
                <div class="surface-field__label">平台</div>
                <VAutocomplete
                  v-model="selectedTable.platform"
                  :items="platformOptions"
                  class="surface-field__control"
                  variant="plain"
                  hide-details
                  density="compact"
                />
              </div>
              <div class="surface-field surface-field--compact">
                <div class="surface-field__label">结果单位</div>
                <VTextField
                  v-model="selectedTable.valueUnit"
                  class="surface-field__control"
                  placeholder="例如 % / R$"
                  variant="plain"
                  hide-details
                  density="compact"
                />
              </div>
              <div class="surface-field surface-field--compact xl:col-span-3">
                <div class="surface-field__label">来源链接</div>
                <VTextField
                  v-model="selectedTable.sourceUrl"
                  class="surface-field__control"
                  placeholder="例如 Mercado Livre 官方帮助页"
                  variant="plain"
                  hide-details
                  density="compact"
                />
              </div>
            </div>

            <div class="surface-field surface-field--compact">
              <div class="surface-field__label">说明</div>
              <textarea
                v-model="selectedTable.remark"
                rows="2"
                placeholder="记录这张规则表的来源、适用条件或维护备注"
                class="surface-field__native min-h-[72px] text-sm leading-6"
              />
            </div>

            <div class="border border-[#e0e0e0] bg-[#f8f8f8] px-3 py-3">
              <div class="workspace-subsection-header">
                <div class="workspace-subsection-title">维度配置</div>
                <div class="workspace-subsection-meta">
                  {{ selectedDimensions.length }} 项
                </div>
              </div>

              <div class="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                <div
                  v-for="dimension in selectedDimensions"
                  :key="dimension.id"
                  class="surface-field surface-field--compact"
                >
                  <div class="surface-field__label">字段名</div>
                  <VTextField
                    v-model="dimension.fieldName"
                    class="surface-field__control"
                    :placeholder="
                      configurableFieldCatalog
                        .slice(0, 4)
                        .map(item => item.name)
                        .join(' / ')
                    "
                    variant="plain"
                    hide-details
                    density="compact"
                  />
                  <div class="mt-2 flex items-center justify-between gap-2">
                    <VSelect
                      :model-value="dimension.kind"
                      :items="[
                        { title: '枚举', value: 'enum' },
                        { title: '区间', value: 'range' },
                      ]"
                      item-title="title"
                      item-value="value"
                      class="surface-field__control"
                      variant="plain"
                      hide-details
                      density="compact"
                      @update:model-value="
                        value => handleDimensionKindChange(dimension, value)
                      "
                    />
                    <VBtn
                      color="error"
                      variant="text"
                      size="small"
                      density="compact"
                      @click="handleRemoveDimension(dimension.id)"
                    >
                      删除维度
                    </VBtn>
                  </div>
                </div>
              </div>
              <div class="mt-3 flex flex-wrap items-center gap-2">
                <VBtn
                  variant="tonal"
                  size="small"
                  density="compact"
                  @click="handleAddDimension('enum')"
                >
                  添加枚举维度
                </VBtn>
                <VBtn
                  variant="tonal"
                  size="small"
                  density="compact"
                  @click="handleAddDimension('range')"
                >
                  添加区间维度
                </VBtn>
              </div>
              <div class="mt-2 text-xs text-[#6f6f6f]">
                这里直接填写中文字段名，例如“类目”“广告类型”“是否包邮”“交易费率”“重量”。若存在同名选项分组，会自动按下拉渲染。
              </div>
            </div>

            <div class="border border-[#e0e0e0] bg-[#f8f8f8] px-3 py-3">
              <div class="workspace-subsection-header">
                <div class="workspace-subsection-title">结果列配置</div>
                <div class="workspace-subsection-meta">
                  {{ selectedResultColumns.length }} 项
                </div>
              </div>
              <div class="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                <div
                  v-for="column in selectedResultColumns"
                  :key="column.id"
                  class="surface-field surface-field--compact"
                >
                  <div class="surface-field__label">结果列名称</div>
                  <VTextField
                    v-model="column.label"
                    class="surface-field__control"
                    placeholder="例如 佣金费率 / 固定附加费"
                    variant="plain"
                    hide-details
                    density="compact"
                  />
                  <div class="mt-2 flex items-center justify-between gap-2">
                    <VSelect
                      v-model="column.type"
                      :items="[
                        { title: '数值', value: 'number' },
                        { title: '文本', value: 'text' },
                      ]"
                      item-title="title"
                      item-value="value"
                      class="surface-field__control"
                      variant="plain"
                      hide-details
                      density="compact"
                    />
                    <VBtn
                      color="error"
                      variant="text"
                      size="small"
                      density="compact"
                      @click="handleRemoveResultColumn(column.id)"
                    >
                      删除结果列
                    </VBtn>
                  </div>
                </div>
              </div>
              <div class="mt-3 flex flex-wrap items-center gap-2">
                <VBtn
                  variant="tonal"
                  size="small"
                  density="compact"
                  @click="handleAddResultColumn"
                >
                  添加结果列
                </VBtn>
              </div>
              <div class="mt-2 text-sm text-[#161616]">
                预设引用方式：
                <code
                  class="
                    border border-[#c6c6c6] bg-[#f8f8f8] px-2 py-[2px] text-xs
                  "
                >
                  {{ getLookupExample(selectedTable) }}
                </code>
              </div>
            </div>
          </div>
        </VCard>

        <VCard
          class="
            workspace-sheet overflow-hidden border border-[#c6c6c6] bg-white
          "
        >
          <div class="border-b border-[#c6c6c6] px-4 py-3">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div class="workspace-section-header">
                  <div class="workspace-section-title">2. 规则内容</div>
                  <div class="workspace-section-meta">
                    {{ templateRuleContentMetaText }}
                  </div>
                </div>
                <div class="mt-0.5 text-sm text-[#525252]">
                  {{ templateRuleContentDescription }}
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <VBtn
                  variant="tonal"
                  size="small"
                  density="compact"
                  @click="handleAddRow"
                >
                  添加行
                </VBtn>
              </div>
            </div>
          </div>

          <div class="overflow-x-auto p-4">
            <div
              class="
                overflow-hidden rounded-[2px] border border-[#c6c6c6]
              "
            >
              <VTable
                density="compact"
                class="w-max min-w-full table-fixed bg-white"
              >
                <colgroup>
                  <col
                    v-for="column in selectedRuleColumns"
                    :key="column.id"
                    :style="getRuleTableColumnStyle(column)"
                  >
                  <col style="width: 72px">
                </colgroup>
                <thead>
                  <tr
                    class="
                      bg-[#f4f4f4] text-left text-sm font-medium
                      text-[#525252]
                    "
                  >
                    <th
                      v-for="column in selectedRuleColumns"
                      :key="column.id"
                      class="border-r px-3 py-2 font-medium"
                    >
                      {{ column.label }}
                    </th>
                    <th
                      class="
                        px-1 py-2 text-center font-medium
                      "
                    >
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in selectedTable.records"
                    :key="row.id"
                    class="align-top hover:bg-[#f8f8f8]"
                  >
                    <td
                      v-for="column in selectedRuleColumns"
                      :key="column.id"
                      class="border-r px-3"
                    >
                      <VSelect
                        v-if="column.control === 'select'"
                        v-model="row.values[column.key]"
                        :items="getRuleColumnItems(column)"
                        :placeholder="column.placeholder || column.label"
                        variant="plain"
                        hide-details
                        density="compact"
                      />
                      <VTextField
                        v-else-if="column.key === 'remark'"
                        v-model="row.remark"
                        :type="column.type"
                        :placeholder="column.placeholder || column.label"
                        variant="plain"
                        hide-details
                        density="compact"
                      />
                      <VTextField
                        v-else
                        v-model="row.values[column.key]"
                        :type="column.type"
                        :placeholder="column.placeholder || column.label"
                        variant="plain"
                        hide-details
                        density="compact"
                      />
                    </td>
                    <td
                      class="
                        px-1 text-center align-middle
                      "
                    >
                      <VBtn
                        color="error"
                        variant="text"
                        size="small"
                        density="compact"
                        class="min-w-0 px-1 text-xs"
                        @click="handleRemoveRow(row.id)"
                      >
                        删除
                      </VBtn>
                    </td>
                  </tr>
                </tbody>
              </VTable>
            </div>
          </div>
        </VCard>
      </div>

      <VCard
        v-else
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
            <span>基础</span>
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
            <span>说明</span>
          </div>
          <div
            class="inline-flex items-center gap-2 text-[13px] text-[#161616]"
          >
            <span
              class="
                inline-flex h-5 w-5 items-center justify-center border
                border-[#c6c6c6] text-xs
              "
            >3</span>
            <span>规则</span>
          </div>
        </div>

        <div class="border-b border-[#c6c6c6] px-4 py-3">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="workspace-section-header">
                <div class="workspace-section-title">1. 基础信息</div>
                <div class="workspace-section-meta">
                  {{ templateBaseFieldCount }} 项
                </div>
              </div>
              <div class="mt-0.5 text-sm text-[#525252]">
                当前已改成从已绑定的 Excel 读取规则表，并同步回同一个文件。
              </div>
            </div>
            <div class="workspace-badge">
              {{ templateSyncStatusText }}
            </div>
          </div>
        </div>

        <div class="flex items-center justify-center p-6">
          <div class="workspace-empty-state">
            {{
              hasExcelBinding
                ? "当前 Excel 里还没有规则表，先新建一张模板表。"
                : "当前没有真实绑定 Excel，重新选择文件后才能读取模板规则表。"
            }}
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
            <div class="workspace-panel-title">规则表</div>
            <div class="workspace-panel-meta">
              {{ templateTables.length }} 项
            </div>
          </div>

          <div class="workspace-panel-body space-y-2.5">
            <div class="flex justify-end sm:justify-start lg:justify-end">
              <VBtn
                variant="tonal"
                size="small"
                density="compact"
                :disabled="!hasExcelBinding"
                @click="handleAddTable"
              >
                新建
              </VBtn>
            </div>

            <div
              v-if="templateTables.length"
              class="grid gap-2 sm:grid-cols-2 lg:grid-cols-1"
            >
              <button
                v-for="table in templateTables"
                :key="table.id"
                type="button"
                class="
                  w-full rounded-[2px] border px-3 py-2 text-left
                  transition-colors lg:py-2.5
                "
                :class="getTemplateTableClass(table.id)"
                @click="templateStore.setActiveTable(table.id)"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-sm font-semibold">
                      {{ table.name || "未命名规则表" }}
                    </div>
                    <div class="mt-1 text-xs text-[#525252]">
                      {{ getTemplateTableSummary(table) }}
                    </div>
                    <div class="mt-1 text-xs text-[#525252]">
                      {{ table.country || "未设置国家" }}
                      /
                      {{ table.platform || "未设置平台" }}
                    </div>
                  </div>
                  <VBtn
                    color="error"
                    variant="text"
                    size="small"
                    density="compact"
                    @click.stop="handleRemoveTable(table.id)"
                  >
                    删除
                  </VBtn>
                </div>
              </button>
            </div>

            <div v-else>
              <div class="workspace-empty-state workspace-empty-state--compact">
                {{
                  hasExcelBinding
                    ? "当前 Excel 里还没有规则表。"
                    : "当前没有真实绑定 Excel。浏览器刷新后需要重新选择文件。"
                }}
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
            <div class="workspace-panel-title">规则类型</div>
            <div class="workspace-panel-meta">
              {{ templateRuleTypeOptions.length }} 类
            </div>
          </div>

          <div class="workspace-panel-body">
            <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <div
                v-for="item in templateRuleTypeOptions"
                :key="item.value"
                class="border border-[#e0e0e0] bg-[#f8f8f8] px-3 py-2.5"
              >
                <div class="text-sm font-semibold text-[#161616]">
                  {{ item.title }}
                </div>
                <div class="mt-1 text-sm text-[#525252]">
                  {{ item.subtitle }}
                </div>
              </div>
            </div>
          </div>
        </VCard>
      </div>
    </div>
  </div>
</template>
