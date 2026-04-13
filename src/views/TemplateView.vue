<script setup>
import { storeToRefs } from "pinia"
import { computed, watch } from "vue"

import { countryOptions, platformOptions } from "@/constants/preset"
import {
  createTemplateMatrixColumn,
  createTemplateMatrixRow,
  createTemplateRow,
  createTemplateTable,
  templateRuleTypeMetaMap,
  templateRuleTypeOptions,
} from "@/constants/template"
import { usePresetStore } from "@/stores/preset"
import { useTemplateStore } from "@/stores/template"

const presetStore = usePresetStore()
const templateStore = useTemplateStore()
const {
  templateTables,
  activeTableId,
  activeTemplateTable,
  syncStatus,
} = storeToRefs(templateStore)

const hasExcelBinding = computed(() =>
  Boolean(presetStore.hasBoundExcelFile),
)

const selectedTable = computed(() => activeTemplateTable.value || null)

const selectedRuleMeta = computed(() =>
  selectedTable.value
    ? templateRuleTypeMetaMap[selectedTable.value.ruleType]
    : null,
)

const isRange2DTable = computed(
  () => selectedTable.value?.ruleType === "range_2d",
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
  const ruleMeta = templateRuleTypeMetaMap[table.ruleType]
  const args = ruleMeta?.lookupArgs || "{输入值}"

  return `查表("${table.name || "未命名规则表"}", ${args})`
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

  selectedTable.value.ruleType = value
  selectedTable.value.rows = nextShape.rows
  selectedTable.value.columns = nextShape.columns || []
  selectedTable.value.xAxisLabel = nextShape.xAxisLabel || "售价"
  selectedTable.value.yAxisLabel = nextShape.yAxisLabel || "重量"
  templateStore.persistTemplateChanges()
}

function handleAddRow() {
  if (!selectedTable.value)
    return

  if (selectedTable.value.ruleType === "range_2d") {
    selectedTable.value.rows.push(
      createTemplateMatrixRow(selectedTable.value.columns || []),
    )
    return
  }

  selectedTable.value.rows.push(createTemplateRow(selectedTable.value.ruleType))
  templateStore.persistTemplateChanges()
}

function handleRemoveRow(rowId) {
  if (!selectedTable.value)
    return

  selectedTable.value.rows = selectedTable.value.rows.filter(
    item => item.id !== rowId,
  )

  if (!selectedTable.value.rows.length) {
    selectedTable.value.rows = selectedTable.value.ruleType === "range_2d"
      ? [createTemplateMatrixRow(selectedTable.value.columns || [])]
      : [createTemplateRow(selectedTable.value.ruleType)]
  }

  templateStore.persistTemplateChanges()
}

function handleAddColumn() {
  if (!selectedTable.value || selectedTable.value.ruleType !== "range_2d")
    return

  const nextColumn = createTemplateMatrixColumn()

  selectedTable.value.columns.push(nextColumn)
  selectedTable.value.rows.forEach((row) => {
    row.values[nextColumn.id] = ""
  })
  templateStore.persistTemplateChanges()
}

function handleRemoveColumn(columnId) {
  if (!selectedTable.value || selectedTable.value.ruleType !== "range_2d")
    return

  selectedTable.value.columns = selectedTable.value.columns.filter(
    item => item.id !== columnId,
  )

  selectedTable.value.rows.forEach((row) => {
    delete row.values[columnId]
  })

  if (!selectedTable.value.columns.length) {
    handleAddColumn()
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
    <div class="grid gap-4 xl:grid-cols-[320px,minmax(0,1fr)]">
      <div class="space-y-4">
        <VCard class="overflow-hidden border border-[#c6c6c6] bg-white">
          <div class="border-b border-[#c6c6c6] px-5 py-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-lg font-semibold text-[#161616]">规则表</div>
              </div>
              <VBtn
                variant="tonal"
                size="small"
                :disabled="!hasExcelBinding"
                @click="handleAddTable"
              >
                新建
              </VBtn>
            </div>
          </div>

          <div v-if="templateTables.length" class="space-y-3 p-4">
            <button
              v-for="table in templateTables"
              :key="table.id"
              type="button"
              class="
                w-full border px-4 py-3 text-left transition-colors
                rounded-[2px]
              "
              :class="getTemplateTableClass(table.id)"
              @click="templateStore.setActiveTable(table.id)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm font-semibold">
                    {{ table.name || "未命名规则表" }}
                  </div>
                </div>
                <VBtn
                  color="error"
                  variant="text"
                  size="small"
                  density="comfortable"
                  @click.stop="handleRemoveTable(table.id)"
                >
                  删除
                </VBtn>
              </div>
            </button>
          </div>
          <div v-else class="px-5 py-8 text-sm text-[#6f6f6f]">
            {{
              hasExcelBinding
                ? "当前 Excel 里还没有规则表。"
                : "当前没有真实绑定 Excel。浏览器刷新后需要重新选择文件。"
            }}
          </div>
        </VCard>

        <VCard class="overflow-hidden border border-[#c6c6c6] bg-white">
          <div class="border-b border-[#c6c6c6] px-5 py-4">
            <div class="text-lg font-semibold text-[#161616]">规则类型</div>
            <!-- <div class="mt-1 text-sm text-slate-500">
              第一版先只支持 5 种结构，后面都复用这套编辑器。
            </div> -->
          </div>

          <div class="space-y-3 p-4">
            <div
              v-for="item in templateRuleTypeOptions"
              :key="item.value"
              class="border border-[#e0e0e0] bg-[#f8f8f8] p-4"
            >
              <div class="text-sm font-semibold text-[#161616]">
                {{ item.title }}
              </div>
              <div class="mt-1 text-sm text-[#525252]">
                {{ item.subtitle }}
              </div>
            </div>
          </div>
        </VCard>
      </div>

      <div v-if="selectedTable" class="space-y-4">
        <VCard class="overflow-hidden border border-[#c6c6c6] bg-white">
          <div class="border-b border-[#c6c6c6] px-5 py-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-lg font-semibold text-[#161616]">
                  模板页
                </div>
                <div class="mt-1 text-sm text-[#525252]">
                  当前已改成从已绑定的 Excel 读取规则表，并同步回同一个文件。
                </div>
              </div>
              <div
                class="
                  inline-flex items-center border border-[#c6c6c6]
                  bg-[#f4f4f4] px-3 py-1 text-xs font-medium text-[#525252]
                "
              >
                {{ templateSyncStatusText }}
              </div>
            </div>
          </div>

          <div class="space-y-4 p-5">
            <div class="grid gap-4 md:grid-cols-2">
              <div class="surface-field">
                <div class="surface-field__label">规则表名称</div>
                <VTextField
                  v-model="selectedTable.name"
                  class="surface-field__control"
                  placeholder="例如 巴西美客多佣金表"
                  variant="plain"
                  hide-details
                />
              </div>
              <div class="surface-field">
                <div class="surface-field__label">规则类型</div>
                <VSelect
                  :model-value="selectedTable.ruleType"
                  :items="templateRuleTypeOptions"
                  item-title="title"
                  item-value="value"
                  class="surface-field__control"
                  variant="plain"
                  hide-details
                  @update:model-value="handleRuleTypeChange"
                />
              </div>
              <div class="surface-field">
                <div class="surface-field__label">国家</div>
                <VAutocomplete
                  v-model="selectedTable.country"
                  :items="countryOptions"
                  class="surface-field__control"
                  variant="plain"
                  hide-details
                  clearable
                />
              </div>
              <div class="surface-field">
                <div class="surface-field__label">平台</div>
                <VAutocomplete
                  v-model="selectedTable.platform"
                  :items="platformOptions"
                  class="surface-field__control"
                  variant="plain"
                  hide-details
                  clearable
                />
              </div>
              <div class="surface-field">
                <div class="surface-field__label">结果单位</div>
                <VTextField
                  v-model="selectedTable.valueUnit"
                  class="surface-field__control"
                  placeholder="例如 % / R$"
                  variant="plain"
                  hide-details
                />
              </div>
              <div class="surface-field">
                <div class="surface-field__label">来源链接</div>
                <VTextField
                  v-model="selectedTable.sourceUrl"
                  class="surface-field__control"
                  placeholder="例如 Mercado Livre 官方帮助页"
                  variant="plain"
                  hide-details
                />
              </div>
            </div>

            <div class="surface-field">
              <div class="surface-field__label">说明</div>
              <textarea
                v-model="selectedTable.remark"
                rows="4"
                placeholder="记录这张规则表的来源、适用条件或维护备注"
                class="surface-field__native min-h-[104px]"
              />
            </div>

            <div
              v-if="selectedRuleMeta"
              class="border border-[#e0e0e0] bg-[#f8f8f8] p-4"
            >
              <div class="text-sm font-semibold text-[#161616]">
                {{ selectedRuleMeta.title }}
              </div>
              <div class="mt-1 text-sm text-[#525252]">
                {{ selectedRuleMeta.description }}
              </div>
              <div class="mt-3 text-sm text-[#161616]">
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

        <VCard class="overflow-hidden border border-[#c6c6c6] bg-white">
          <div class="border-b border-[#c6c6c6] px-5 py-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-lg font-semibold text-[#161616]">
                  {{ isRange2DTable ? "二维规则矩阵" : "规则行" }}
                </div>
                <div class="mt-1 text-sm text-[#525252]">
                  {{
                    isRange2DTable
                      ? "横向是售价区间，纵向是重量区间，每个单元格表示命中的结果值。"
                      : "按当前规则类型编辑每一行条件和值。"
                  }}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <VBtn
                  v-if="isRange2DTable"
                  variant="tonal"
                  size="small"
                  @click="handleAddColumn"
                >
                  添加本列
                </VBtn>
                <VBtn variant="tonal" size="small" @click="handleAddRow">
                  {{ isRange2DTable ? "添加本行" : "添加规则行" }}
                </VBtn>
              </div>
            </div>
          </div>

          <div v-if="isRange2DTable" class="space-y-4 p-5">
            <div class="grid gap-4 md:grid-cols-2">
              <div class="surface-field">
                <div class="surface-field__label">横轴名称</div>
                <VTextField
                  v-model="selectedTable.xAxisLabel"
                  class="surface-field__control"
                  placeholder="例如 售价"
                  variant="plain"
                  hide-details
                />
              </div>
              <div class="surface-field">
                <div class="surface-field__label">纵轴名称</div>
                <VTextField
                  v-model="selectedTable.yAxisLabel"
                  class="surface-field__control"
                  placeholder="例如 重量"
                  variant="plain"
                  hide-details
                />
              </div>
            </div>

            <div
              class="
                overflow-x-auto rounded-[2px] border border-[#c6c6c6]
              "
            >
              <VTable density="compact" class="bg-white">
                <thead>
                  <tr
                    class="
                      border-b border-[#c6c6c6] bg-[#f4f4f4] text-center
                      text-sm
                    "
                  >
                    <th
                      class="
                        relative h-24 min-w-[124px]
                        border-r border-[#c6c6c6] bg-[#f4f4f4]
                      "
                    >
                      <div
                        class="absolute inset-0"
                        style="
                          background: linear-gradient(
                            to top right,
                            transparent 49.5%,
                            rgb(198 198 198) 50%,
                            transparent 50.5%
                          );
                        "
                      />
                      <div class="absolute left-4 bottom-3 text-[#525252]">
                        {{ selectedTable.yAxisLabel || "纵轴" }}
                      </div>
                      <div class="absolute top-3 right-4 text-[#525252]">
                        {{ selectedTable.xAxisLabel || "横轴" }}
                      </div>
                    </th>
                    <th
                      v-for="column in selectedTable.columns"
                      :key="column.id"
                      class="
                        min-w-[160px] border-r border-[#c6c6c6] px-3 py-3
                      "
                    >
                      <VTextField
                        v-model="column.label"
                        variant="plain"
                        placeholder="区间上限"
                        hide-details
                        density="comfortable"
                      />
                      <div class="mt-2">
                        <VBtn
                          color="error"
                          variant="text"
                          density="comfortable"
                          @click="handleRemoveColumn(column.id)"
                        >
                          删除本列
                        </VBtn>
                      </div>
                    </th>
                    <th class="min-w-[92px] px-3 py-3 text-[#525252]">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in selectedTable.rows"
                    :key="row.id"
                    class="border-b border-[#e0e0e0] hover:bg-[#f8f8f8]"
                  >
                    <td class="border-r border-[#e0e0e0] px-3 py-3">
                      <VTextField
                        v-model="row.label"
                        variant="plain"
                        placeholder="行区间上限"
                        hide-details
                        density="comfortable"
                      />
                    </td>
                    <td
                      v-for="column in selectedTable.columns"
                      :key="`${row.id}_${column.id}`"
                      class="border-r border-[#e0e0e0] px-3 py-3"
                    >
                      <VTextField
                        v-model="row.values[column.id]"
                        variant="plain"
                        placeholder="结果值"
                        hide-details
                        density="comfortable"
                      />
                    </td>
                    <td class="px-3 py-3 text-right">
                      <VBtn
                        color="error"
                        variant="text"
                        density="comfortable"
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

          <div v-else class="overflow-x-auto p-5">
            <div
              class="
                overflow-hidden rounded-[2px] border border-[#c6c6c6]
              "
            >
              <VTable density="compact" class="bg-white">
                <thead>
                  <tr
                    class="
                      bg-[#f4f4f4] text-left text-sm font-medium
                      text-[#525252]
                    "
                  >
                    <th
                      v-for="column in selectedRuleMeta?.columns || []"
                      :key="column.key"
                      class="px-2 pb-2 font-medium"
                    >
                      {{ column.label }}
                    </th>
                    <th class="px-2 pb-2 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in selectedTable.rows"
                    :key="row.id"
                    class="align-top hover:bg-[#f8f8f8]"
                  >
                    <td
                      v-for="column in selectedRuleMeta?.columns || []"
                      :key="column.key"
                      class="px-2"
                    >
                      <VTextField
                        v-model="row[column.key]"
                        :type="column.type"
                        :placeholder="column.label"
                        variant="plain"
                        hide-details
                        density="comfortable"
                      />
                    </td>
                    <td class="px-2 text-right align-middle">
                      <VBtn
                        color="error"
                        variant="text"
                        density="comfortable"
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

      <div v-else class="flex items-center justify-center p-10">
        <div
          class="
            flex min-h-[240px] w-full items-center justify-center border
            border-dashed border-[#c6c6c6] bg-[#f8f8f8] p-10
          "
        >
          <div class="text-sm text-[#6f6f6f]">
            {{
              hasExcelBinding
                ? "当前 Excel 里还没有规则表，先新建一张模板表。"
                : "当前没有真实绑定 Excel，重新选择文件后才能读取模板规则表。"
            }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
