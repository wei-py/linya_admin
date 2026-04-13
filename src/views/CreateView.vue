<script setup>
import { storeToRefs } from "pinia"
import { computed, reactive, ref, watch } from "vue"

import {
  createCalculationInputFields,
  createProductBaseFields,
} from "@/constants/create"
import { booleanValueOptions } from "@/constants/preset"
import { usePresetStore } from "@/stores/preset"
import { useTemplateStore } from "@/stores/template"

const presetStore = usePresetStore()
const templateStore = useTemplateStore()
const { activePresetId, presetRecords } = storeToRefs(presetStore)
const { templateTables } = storeToRefs(templateStore)

const selectedPresetId = ref("")
const extraProductFieldSeed = ref(1)
const imageLinkSeed = ref(2)
const variationGroupSeed = ref(1)
const variationOptionSeed = ref(1)
const calculationDriver = ref("listPrice")
const isPresetEditorOpen = ref(false)

const form = reactive({
  country: "",
  platform: "",
  listPrice: "",
  discountPrice: "",
  revenue: "",
  profitRate: "",
  netProfit: "",
  sellerShipping: "",
  fixedSurcharge: "",
  styleNo: "",
  cost: "",
  weight: "",
  category: "",
  adType: "",
  notes: "",
  presetItems: [],
  imageLinks: [
    {
      id: "product_image_1",
      value: "",
    },
  ],
  variationGroups: [],
  extraProductFields: [],
})

const presetOptions = computed(() =>
  presetRecords.value.map(item => ({
    title: item.country_platform,
    value: item.id,
    subtitle: `${item.country} / ${item.platform}`,
  })),
)

const selectedPresetRecord = computed(() =>
  presetRecords.value.find(item => item.id === selectedPresetId.value) || null,
)

const hasPresetRecords = computed(() => presetRecords.value.length > 0)
const presetPrimaryFieldNames = [
  "折扣",
  "活动费率",
  "交易费率",
  "提现费率",
  "税率",
  "贴单费用",
  "是否包邮",
  "汇损",
]
const presetSummaryFieldNames = [
  "折扣",
  "活动费率",
  "交易费率",
  "税率",
  "贴单费用",
  "是否包邮",
]
const productPrimaryFieldKeys = ["styleNo", "cost", "weight", "category"]
const productSecondaryFieldKeys = ["adType"]
const calculationTargetFieldKeys = [
  "listPrice",
  "discountPrice",
  "revenue",
  "profitRate",
  "netProfit",
]
const calculationCostFieldKeys = ["sellerShipping", "fixedSurcharge"]

const primaryProductFields = computed(() =>
  createProductBaseFields.filter(field =>
    productPrimaryFieldKeys.includes(field.key),
  ),
)

const secondaryProductFields = computed(() =>
  createProductBaseFields.filter(field =>
    productSecondaryFieldKeys.includes(field.key),
  ),
)

const visibleProductFieldCount = computed(
  () =>
    primaryProductFields.value.length
    + secondaryProductFields.value.length
    + 3,
)

const calculationDriverOptions = computed(() =>
  createCalculationInputFields
    .filter(field => calculationTargetFieldKeys.includes(field.key))
    .map(field => ({
      key: field.key,
      label: field.label,
      placeholder: field.placeholder,
      type: field.type,
    })),
)

const activeCalculationField = computed(
  () =>
    calculationDriverOptions.value.find(
      field => field.key === calculationDriver.value,
    )
    || calculationDriverOptions.value[0]
    || null,
)

const calculationCostFields = computed(() =>
  createCalculationInputFields.filter(field =>
    calculationCostFieldKeys.includes(field.key),
  ),
)

const presetPrimaryItems = computed(() =>
  form.presetItems
    .filter(item => presetPrimaryFieldNames.includes(item.name))
    .sort(
      (left, right) =>
        presetPrimaryFieldNames.indexOf(left.name)
        - presetPrimaryFieldNames.indexOf(right.name),
    ),
)

const presetSecondaryItems = computed(() =>
  form.presetItems.filter(item => !presetPrimaryFieldNames.includes(item.name)),
)

const presetSummaryItems = computed(() =>
  presetSummaryFieldNames
    .map((name) => {
      const item = form.presetItems.find(entry => entry.name === name)

      if (!item) {
        return null
      }

      const value
        = item.type === "rule"
          ? getPresetSnapshotRuleName(item) || "未绑定规则表"
          : item.value || "未设置"

      return {
        id: item.id,
        label: item.name,
        value: item.unit ? `${value} ${item.unit}` : value,
      }
    })
    .filter(Boolean),
)

function createExtraProductField() {
  const id = `product_extra_${Date.now()}_${extraProductFieldSeed.value}`

  extraProductFieldSeed.value += 1

  return {
    id,
    label: "",
    value: "",
  }
}

function createImageLink(value = "") {
  const id = `product_image_${Date.now()}_${imageLinkSeed.value}`

  imageLinkSeed.value += 1

  return {
    id,
    value,
  }
}

function createVariationOption(value = "") {
  const id = `variation_option_${Date.now()}_${variationOptionSeed.value}`

  variationOptionSeed.value += 1

  return {
    id,
    value,
  }
}

function createVariationGroup() {
  const id = `variation_group_${Date.now()}_${variationGroupSeed.value}`

  variationGroupSeed.value += 1

  return {
    id,
    name: "",
    options: [createVariationOption()],
  }
}

function createPresetSnapshotItem(item) {
  const nextType
    = item?.type === "boolean"
      ? "boolean"
      : item?.type === "rule"
        ? "rule"
        : "number"
  const nextValue
    = nextType === "boolean"
      ? ["是", "否"].includes(item?.value)
          ? item.value
          : ""
      : String(item?.value ?? "")

  return {
    id: item?.id || "",
    name: item?.name || "",
    type: nextType,
    unit: item?.unit || "",
    value: nextValue,
    rule_table_id: item?.rule_table_id || "",
  }
}

function resetPresetSnapshot() {
  form.country = ""
  form.platform = ""
  form.presetItems = []
}

function applyPresetRecord(record) {
  if (!record) {
    resetPresetSnapshot()
    return
  }

  form.country = record.country
  form.platform = record.platform
  form.presetItems = (record.items || []).map(createPresetSnapshotItem)
}

function ensureSelectedPreset() {
  const hasCurrent = presetRecords.value.some(
    item => item.id === selectedPresetId.value,
  )

  if (hasCurrent)
    return

  const nextPresetId = presetRecords.value.some(
    item => item.id === activePresetId.value,
  )
    ? activePresetId.value
    : presetRecords.value[0]?.id || ""

  selectedPresetId.value = nextPresetId
}

watch([presetRecords, activePresetId], ensureSelectedPreset, {
  immediate: true,
})

watch(
  selectedPresetRecord,
  (record) => {
    isPresetEditorOpen.value = false
    applyPresetRecord(record)
  },
  { immediate: true },
)

function resetPresetItemsFromSource() {
  applyPresetRecord(selectedPresetRecord.value)
}

function updatePresetSnapshotItem(item, key, value) {
  item[key] = value

  if (key !== "type")
    return

  item.value = value === "boolean" ? "" : String(item.value ?? "")
  item.rule_table_id = value === "rule" ? item.rule_table_id || "" : ""
}

function getPresetSnapshotTypeText(item) {
  if (item.type === "boolean")
    return "布尔值"

  if (item.type === "rule")
    return "规则"

  return "数值"
}

function getPresetSnapshotRuleName(item) {
  if (item.type !== "rule" || !item.rule_table_id)
    return ""

  return (
    templateTables.value.find(table => table.id === item.rule_table_id)?.name || ""
  )
}

function addExtraProductField() {
  form.extraProductFields.push(createExtraProductField())
}

function addImageLink() {
  form.imageLinks.push(createImageLink())
}

function removeImageLink(id) {
  if (form.imageLinks.length === 1) {
    form.imageLinks[0].value = ""
    return
  }

  form.imageLinks = form.imageLinks.filter(item => item.id !== id)
}

function addVariationGroup() {
  form.variationGroups.push(createVariationGroup())
}

function removeVariationGroup(id) {
  form.variationGroups = form.variationGroups.filter(item => item.id !== id)
}

function addVariationOption(groupId) {
  const target = form.variationGroups.find(item => item.id === groupId)

  if (!target)
    return

  target.options.push(createVariationOption())
}

function removeVariationOption(groupId, optionId) {
  const target = form.variationGroups.find(item => item.id === groupId)

  if (!target)
    return

  target.options = target.options.filter(item => item.id !== optionId)

  if (!target.options.length) {
    target.options = [createVariationOption()]
  }
}

function removeExtraProductField(id) {
  form.extraProductFields = form.extraProductFields.filter(
    item => item.id !== id,
  )
}

function toNumber(value) {
  const nextValue = Number(value)

  return Number.isFinite(nextValue) ? nextValue : 0
}

function roundValue(value) {
  return Math.round(value * 100) / 100
}

function formatNumber(value, suffix = "") {
  return `${roundValue(value).toFixed(2)}${suffix}`
}

function formatEditableNumber(value) {
  const roundedValue = roundValue(value)

  if (!roundedValue)
    return "0"

  return `${roundedValue}`.replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1")
}

function findPresetSnapshotValue(name) {
  return form.presetItems.find(item => item.name === name)?.value || ""
}

function findPresetSnapshotNumber(name) {
  return toNumber(findPresetSnapshotValue(name))
}

function findPresetSnapshotUnit(name) {
  return form.presetItems.find(item => item.name === name)?.unit || ""
}

function findPresetMoneyUnit() {
  return form.presetItems.find(
    item => item.unit && item.unit !== "%",
  )?.unit || ""
}

const calculationSnapshot = computed(() => {
  const baseListPrice = toNumber(form.listPrice)
  const baseDiscountPrice = toNumber(form.discountPrice)
  const baseRevenue = toNumber(form.revenue)
  const baseProfitRate = toNumber(form.profitRate)
  const baseNetProfit = toNumber(form.netProfit)
  const sellerShipping = toNumber(form.sellerShipping)
  const fixedSurcharge = toNumber(form.fixedSurcharge)
  const cost = toNumber(form.cost)
  const discountRate = findPresetSnapshotNumber("折扣")
  const activityRate = findPresetSnapshotNumber("活动费率")
  const transactionRate = findPresetSnapshotNumber("交易费率")
  const withdrawRate = findPresetSnapshotNumber("提现费率")
  const exchangeLossRate = findPresetSnapshotNumber("汇损")
  const taxRate = findPresetSnapshotNumber("税率")
  const labelFee = findPresetSnapshotNumber("贴单费用")
  const discountFactor = 1 - discountRate / 100
  const variableRate
    = (activityRate
      + transactionRate
      + withdrawRate
      + exchangeLossRate
      + taxRate)
    / 100
  const baseFixedCost = labelFee + sellerShipping + fixedSurcharge + cost
  let discountPrice = 0

  if (calculationDriver.value === "discountPrice") {
    discountPrice = baseDiscountPrice
  }
  else if (calculationDriver.value === "revenue") {
    discountPrice = baseRevenue
  }
  else if (calculationDriver.value === "profitRate") {
    const denominator = 1 - variableRate - baseProfitRate / 100

    discountPrice = denominator > 0 ? baseFixedCost / denominator : 0
  }
  else if (calculationDriver.value === "netProfit") {
    const denominator = 1 - variableRate

    discountPrice = denominator > 0
      ? (baseNetProfit + baseFixedCost) / denominator
      : 0
  }
  else {
    discountPrice = baseListPrice * discountFactor
  }

  const listPrice = discountFactor > 0 ? discountPrice / discountFactor : 0
  const activityFee = discountPrice * (activityRate / 100)
  const transactionFee = discountPrice * (transactionRate / 100)
  const withdrawFee = discountPrice * (withdrawRate / 100)
  const exchangeLossFee = discountPrice * (exchangeLossRate / 100)
  const taxFee = discountPrice * (taxRate / 100)
  const totalFee
    = activityFee
      + transactionFee
      + withdrawFee
      + exchangeLossFee
      + taxFee
      + labelFee
      + sellerShipping
      + fixedSurcharge
  const revenue = discountPrice
  const netProfit = revenue - totalFee - cost
  const profitRate
    = calculationDriver.value === "profitRate" && revenue > 0
      ? baseProfitRate
      : revenue > 0
        ? (netProfit / revenue) * 100
        : 0

  return {
    discountRate,
    activityRate,
    transactionRate,
    withdrawRate,
    exchangeLossRate,
    taxRate,
    labelFee,
    listPrice,
    discountPrice,
    sellerShipping,
    fixedSurcharge,
    activityFee,
    transactionFee,
    withdrawFee,
    exchangeLossFee,
    taxFee,
    totalFee,
    revenue,
    netProfit,
    profitRate,
    shippingIncluded: findPresetSnapshotValue("是否包邮") || "未设置",
  }
})

const calculationDriverText = computed(() =>
  calculationDriver.value === "discountPrice"
    ? "折后售价"
    : calculationDriver.value === "revenue"
      ? "收入"
      : calculationDriver.value === "profitRate"
        ? "利润率"
        : calculationDriver.value === "netProfit"
          ? "净利润"
          : "折前价格",
)

const moneyUnitSuffix = computed(() =>
  findPresetMoneyUnit() ? ` ${findPresetMoneyUnit()}` : "",
)

const primaryResultHighlights = computed(() => [
  {
    label: "净利润",
    value: formatNumber(
      calculationSnapshot.value.netProfit,
      moneyUnitSuffix.value,
    ),
  },
  {
    label: "利润率",
    value: formatNumber(calculationSnapshot.value.profitRate, " %"),
  },
])

const resultSummaryItems = computed(() => [
  {
    label: "组合",
    value:
      form.country && form.platform
        ? `${form.country} / ${form.platform}`
        : "未选择",
  },
  {
    label: "当前基准",
    value: calculationDriverText.value,
  },
  {
    label: "折前价",
    value: formatNumber(
      calculationSnapshot.value.listPrice,
      moneyUnitSuffix.value,
    ),
  },
  {
    label: "折后价",
    value: formatNumber(
      calculationSnapshot.value.discountPrice,
      moneyUnitSuffix.value,
    ),
  },
  {
    label: "收入",
    value: formatNumber(
      calculationSnapshot.value.revenue,
      moneyUnitSuffix.value,
    ),
  },
  {
    label: "总费用",
    value: formatNumber(
      calculationSnapshot.value.totalFee,
      moneyUnitSuffix.value,
    ),
  },
  {
    label: "包邮",
    value: calculationSnapshot.value.shippingIncluded,
  },
])

const feeSummaryItems = computed(() => [
  {
    label: "活动费",
    value: formatNumber(
      calculationSnapshot.value.activityFee,
      moneyUnitSuffix.value,
    ),
  },
  {
    label: "交易费",
    value: formatNumber(
      calculationSnapshot.value.transactionFee,
      moneyUnitSuffix.value,
    ),
  },
  {
    label: "提现费",
    value: formatNumber(
      calculationSnapshot.value.withdrawFee,
      moneyUnitSuffix.value,
    ),
  },
  {
    label: "汇损金额",
    value: formatNumber(
      calculationSnapshot.value.exchangeLossFee,
      moneyUnitSuffix.value,
    ),
  },
  {
    label: "税费",
    value: formatNumber(
      calculationSnapshot.value.taxFee,
      moneyUnitSuffix.value,
    ),
  },
  {
    label: "贴单费",
    value: formatNumber(
      calculationSnapshot.value.labelFee,
      findPresetSnapshotUnit("贴单费用")
        ? ` ${findPresetSnapshotUnit("贴单费用")}`
        : moneyUnitSuffix.value
          ? moneyUnitSuffix.value
          : "",
    ),
  },
  {
    label: "卖家运费",
    value: formatNumber(
      calculationSnapshot.value.sellerShipping,
      moneyUnitSuffix.value,
    ),
  },
  {
    label: "固定附加",
    value: formatNumber(
      calculationSnapshot.value.fixedSurcharge,
      moneyUnitSuffix.value,
    ),
  },
  {
    label: "成本",
    value: formatNumber(toNumber(form.cost), moneyUnitSuffix.value),
  },
])

function getCalculationFieldValue(key) {
  if (key === "listPrice") {
    return calculationDriver.value === "listPrice"
      ? form.listPrice
      : formatEditableNumber(calculationSnapshot.value.listPrice)
  }

  if (key === "discountPrice") {
    return calculationDriver.value === "discountPrice"
      ? form.discountPrice
      : formatEditableNumber(calculationSnapshot.value.discountPrice)
  }

  if (key === "revenue") {
    return calculationDriver.value === "revenue"
      ? form.revenue
      : formatEditableNumber(calculationSnapshot.value.revenue)
  }

  if (key === "profitRate") {
    return calculationDriver.value === "profitRate"
      ? form.profitRate
      : formatEditableNumber(calculationSnapshot.value.profitRate)
  }

  if (key === "netProfit") {
    return calculationDriver.value === "netProfit"
      ? form.netProfit
      : formatEditableNumber(calculationSnapshot.value.netProfit)
  }

  return form[key]
}

function updateCalculationField(key, value) {
  form[key] = value

  if (
    ["listPrice", "discountPrice", "revenue", "profitRate", "netProfit"].includes(
      key,
    )
  ) {
    calculationDriver.value = key
  }
}

function setCalculationDriver(key) {
  calculationDriver.value = key
}
</script>

<template>
  <div class="h-full min-h-0 overflow-y-auto pr-2">
    <div class="workspace-page-grid">
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
            <span>预设</span>
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
            <span>商品</span>
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
            <span>目标</span>
          </div>
          <div
            class="inline-flex items-center gap-2 text-[13px] text-[#6f6f6f]"
          >
            <span
              class="
                inline-flex h-5 w-5 items-center justify-center border
                border-[#c6c6c6] text-xs
              "
            >4</span>
            <span>结果</span>
          </div>
        </div>

        <div>
          <div
            class="
              flex flex-wrap items-start justify-between gap-3 px-4 py-3
            "
          >
            <div class="workspace-section-header">
              <div class="workspace-section-title">1. 选择预设</div>
              <div class="workspace-section-meta">
                {{ form.presetItems.length }} 项
              </div>
            </div>
            <div class="flex items-center gap-2">
              <VBtn
                v-if="selectedPresetRecord"
                variant="tonal"
                size="small"
                @click="isPresetEditorOpen = !isPresetEditorOpen"
              >
                {{ isPresetEditorOpen ? "收起参数" : "编辑参数" }}
              </VBtn>
              <VBtn
                v-if="selectedPresetRecord && isPresetEditorOpen"
                variant="text"
                size="small"
                @click="resetPresetItemsFromSource"
              >
                重置
              </VBtn>
            </div>
          </div>

          <div v-if="hasPresetRecords" class="grid gap-3 px-4 pb-3">
            <div
              class="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
            >
              <div class="surface-field surface-field--compact">
                <div class="surface-field__label">预设组合</div>
                <VAutocomplete
                  v-model="selectedPresetId"
                  :items="presetOptions"
                  item-title="title"
                  item-value="value"
                  class="surface-field__control"
                  variant="plain"
                  hide-details
                  density="compact"
                />
              </div>
              <div class="surface-field surface-field--compact">
                <div class="surface-field__label">国家</div>
                <VTextField
                  :model-value="form.country"
                  class="surface-field__control"
                  variant="plain"
                  hide-details
                  density="compact"
                  readonly
                />
              </div>
              <div class="surface-field surface-field--compact">
                <div class="surface-field__label">平台</div>
                <VTextField
                  :model-value="form.platform"
                  class="surface-field__control"
                  variant="plain"
                  hide-details
                  density="compact"
                  readonly
                />
              </div>
            </div>

            <div class="grid gap-2.5">
              <div class="workspace-subsection-header">
                <div class="workspace-subsection-title">关键参数</div>
                <div class="workspace-subsection-meta">
                  {{ presetSummaryItems.length }}
                </div>
              </div>

              <div
                v-if="presetSummaryItems.length"
                class="
                  grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4
                "
              >
                <div
                  v-for="item in presetSummaryItems"
                  :key="item.id"
                  class="border border-[#e0e0e0] bg-[#f8f8f8] px-3 py-2.5"
                >
                  <div class="text-xs text-[#525252]">
                    {{ item.label }}
                  </div>
                  <div class="mt-1 text-sm font-medium text-[#161616]">
                    {{ item.value }}
                  </div>
                </div>
              </div>

              <div
                v-else
                class="workspace-empty-state workspace-empty-state--tight"
              >
                暂无关键参数。
              </div>
            </div>

            <div
              v-if="isPresetEditorOpen && presetPrimaryItems.length"
              class="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
            >
              <div
                v-for="item in presetPrimaryItems"
                :key="item.id"
                class="border-b border-[#e0e0e0] pb-2"
              >
                <div class="text-sm font-medium text-[#161616]">
                  {{ item.name || "未命名字段" }}
                </div>
                <div class="mb-1.5 mt-0.5 text-xs text-[#525252]">
                  {{ item.unit || getPresetSnapshotTypeText(item) }}
                </div>
                <div class="min-w-0">
                  <VSelect
                    v-if="item.type === 'boolean'"
                    :model-value="item.value"
                    :items="booleanValueOptions"
                    item-title="title"
                    item-value="value"
                    variant="plain"
                    hide-details
                    density="compact"
                    @update:model-value="
                      (value) => updatePresetSnapshotItem(item, 'value', value)
                    "
                  />
                  <VTextField
                    v-else-if="item.type === 'rule'"
                    :model-value="
                      getPresetSnapshotRuleName(item) || '未绑定规则表'
                    "
                    variant="plain"
                    hide-details
                    density="compact"
                    readonly
                  />
                  <VTextField
                    v-else
                    :model-value="item.value"
                    variant="plain"
                    hide-details
                    density="compact"
                    :suffix="item.unit || undefined"
                    placeholder="输入数值"
                    @update:model-value="
                      (value) => updatePresetSnapshotItem(item, 'value', value)
                    "
                  />
                </div>
              </div>
            </div>

            <div
              v-if="isPresetEditorOpen && presetSecondaryItems.length"
              class="border-t border-[#e0e0e0]"
            >
              <div
                class="
                  hidden border-b border-[#e0e0e0] py-2 text-xs text-[#525252]
                  md:grid md:grid-cols-[minmax(0,1fr),88px,200px] md:gap-3
                "
              >
                <div>字段</div>
                <div>类型</div>
                <div>值</div>
              </div>
              <div
                v-for="item in presetSecondaryItems"
                :key="item.id"
                class="
                  grid gap-3 border-b border-[#e0e0e0] py-3
                  md:grid-cols-[minmax(0,1fr),88px,200px]
                  md:items-center
                "
              >
                <div class="min-w-0">
                  <div class="text-sm font-medium text-[#161616]">
                    {{ item.name || "未命名字段" }}
                  </div>
                  <div class="mt-1 text-xs text-[#525252]">
                    {{ item.unit || "无单位" }}
                  </div>
                </div>

                <div class="text-xs text-[#525252]">
                  {{ getPresetSnapshotTypeText(item) }}
                </div>

                <div class="min-w-0">
                  <VSelect
                    v-if="item.type === 'boolean'"
                    :model-value="item.value"
                    :items="booleanValueOptions"
                    item-title="title"
                    item-value="value"
                    variant="plain"
                    hide-details
                    density="compact"
                    @update:model-value="
                      (value) => updatePresetSnapshotItem(item, 'value', value)
                    "
                  />
                  <VTextField
                    v-else-if="item.type === 'rule'"
                    :model-value="
                      getPresetSnapshotRuleName(item) || '未绑定规则表'
                    "
                    variant="plain"
                    hide-details
                    density="compact"
                    readonly
                  />
                  <VTextField
                    v-else
                    :model-value="item.value"
                    variant="plain"
                    hide-details
                    density="compact"
                    :suffix="item.unit || undefined"
                    placeholder="输入数值"
                    @update:model-value="
                      (value) => updatePresetSnapshotItem(item, 'value', value)
                    "
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            v-else
            class="workspace-panel-body"
          >
            <div class="workspace-empty-state flex-col gap-3">
              <div>还没有预设组合。</div>
              <RouterLink to="/preset">
                <VBtn variant="tonal" size="small" density="compact">去预设页</VBtn>
              </RouterLink>
            </div>
          </div>
        </div>

        <div class="border-t border-[#c6c6c6]">
          <div
            class="
              flex flex-wrap items-start justify-between gap-3 px-4 py-3
            "
          >
            <div class="workspace-section-header">
              <div class="workspace-section-title">2. 核心商品信息</div>
              <div class="workspace-section-meta">
                {{ visibleProductFieldCount }} 项
              </div>
            </div>
          </div>

          <div class="grid gap-3 px-4 pb-3">
            <div
              class="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
            >
              <div
                v-for="field in primaryProductFields"
                :key="field.key"
                class="surface-field surface-field--compact"
              >
                <div class="surface-field__label">{{ field.label }}</div>
                <VTextField
                  v-model="form[field.key]"
                  class="surface-field__control"
                  :placeholder="field.placeholder"
                  :type="field.type"
                  variant="plain"
                  hide-details
                  density="compact"
                />
              </div>
            </div>

            <div
              class="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
            >
              <div
                v-for="field in secondaryProductFields"
                :key="field.key"
                class="surface-field surface-field--compact"
              >
                <div class="surface-field__label">{{ field.label }}</div>
                <VTextField
                  v-model="form[field.key]"
                  class="surface-field__control"
                  :placeholder="field.placeholder"
                  :type="field.type"
                  variant="plain"
                  hide-details
                  density="compact"
                />
              </div>
            </div>

            <div class="grid gap-2.5">
              <div class="workspace-subsection-header">
                <div class="workspace-subsection-title">图片链接</div>
                <div class="flex items-center gap-3">
                  <div class="workspace-subsection-meta">
                    {{ form.imageLinks.length }}
                  </div>
                  <VBtn
                    variant="tonal"
                    size="small"
                    @click="addImageLink"
                  >
                    添加图片
                  </VBtn>
                </div>
              </div>

              <div class="grid gap-2.5">
                <div
                  v-for="(image, index) in form.imageLinks"
                  :key="image.id"
                  class="relative"
                >
                  <VBtn
                    color="error"
                    variant="text"
                    size="small"
                    density="compact"
                    class="!absolute right-1 top-1 z-10 min-w-0 px-1.5"
                    @click="removeImageLink(image.id)"
                  >
                    删除
                  </VBtn>
                  <div class="surface-field surface-field--compact pr-12">
                    <div class="surface-field__label">
                      图片链接 {{ index + 1 }}
                    </div>
                    <VTextField
                      v-model="image.value"
                      class="surface-field__control"
                      placeholder="输入图片路径或 URL"
                      variant="plain"
                      hide-details
                      density="compact"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="grid gap-2.5">
              <div class="workspace-subsection-header">
                <div class="workspace-subsection-title">变体</div>
                <div class="flex items-center gap-3">
                  <div class="workspace-subsection-meta">
                    {{ form.variationGroups.length }}
                  </div>
                  <VBtn
                    variant="tonal"
                    size="small"
                    @click="addVariationGroup"
                  >
                    添加变体
                  </VBtn>
                </div>
              </div>

              <div
                v-if="form.variationGroups.length"
                class="grid gap-3"
              >
                <div
                  v-for="(group, groupIndex) in form.variationGroups"
                  :key="group.id"
                  class="border border-[#e0e0e0] bg-[#f8f8f8] px-3 py-2.5"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-sm font-semibold text-[#161616]">
                      变体 {{ groupIndex + 1 }}
                    </div>
                    <VBtn
                      color="error"
                      variant="text"
                      size="small"
                      @click="removeVariationGroup(group.id)"
                    >
                      删除变体
                    </VBtn>
                  </div>

                  <div class="mt-3 surface-field surface-field--compact">
                    <div class="surface-field__label">变体名称</div>
                    <VTextField
                      v-model="group.name"
                      class="surface-field__control"
                      placeholder="例如 尺码 / 颜色"
                      variant="plain"
                      hide-details
                      density="compact"
                    />
                  </div>

                  <div class="mt-3 grid gap-2.5">
                    <div class="workspace-subsection-header">
                      <div class="workspace-subsection-title">选项</div>
                      <VBtn
                        variant="tonal"
                        size="small"
                        @click="addVariationOption(group.id)"
                      >
                        添加选项
                      </VBtn>
                    </div>

                    <div
                      class="
                        grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3
                        2xl:grid-cols-4
                      "
                    >
                      <div
                        v-for="(option, optionIndex) in group.options"
                        :key="option.id"
                        class="relative"
                      >
                        <VBtn
                          color="error"
                          variant="text"
                          size="small"
                          density="compact"
                          class="!absolute right-1 top-1 z-10 min-w-0 px-1.5"
                          @click="removeVariationOption(group.id, option.id)"
                        >
                          删除
                        </VBtn>
                        <div class="surface-field surface-field--compact pr-12">
                          <div class="surface-field__label">
                            选项 {{ optionIndex + 1 }}
                          </div>
                          <VTextField
                            v-model="option.value"
                            class="surface-field__control"
                            placeholder="例如 S / M / XL"
                            variant="plain"
                            hide-details
                            density="compact"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-else
                class="
                  border border-dashed border-[#c6c6c6] bg-[#f8f8f8] px-3 py-2.5
                  text-sm text-[#6f6f6f]
                "
              >
                暂无变体，可按需添加。
              </div>
            </div>

            <div class="surface-field surface-field--compact">
              <div class="surface-field__label">备注</div>
              <textarea
                v-model="form.notes"
                rows="3"
                placeholder="补充内容"
                class="surface-field__native min-h-[72px]"
              />
            </div>
          </div>
        </div>

        <div class="border-t border-[#c6c6c6]">
          <div
            class="
              flex flex-wrap items-start justify-between gap-3 px-4 py-3
            "
          >
            <div class="workspace-section-header">
              <div class="workspace-section-title">3. 目标与费用</div>
              <div class="workspace-section-meta">
                {{ calculationDriverText }}
              </div>
            </div>
          </div>

          <div class="grid gap-3 px-4 pb-3">
            <div class="grid gap-2.5">
              <div class="workspace-subsection-title">反推目标</div>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="field in calculationDriverOptions"
                  :key="field.key"
                  type="button"
                  class="
                    min-h-8 border border-[#c6c6c6] bg-white px-3 py-1
                    text-[13px]
                    text-[#525252] transition-colors
                  "
                  :class="
                    calculationDriver === field.key
                      ? 'border-[#0f62fe] bg-[#edf5ff] text-[#161616]'
                      : `
                        hover:border-[#8d8d8d] hover:bg-[#f8f8f8]
                        hover:text-[#161616]
                      `
                  "
                  @click="setCalculationDriver(field.key)"
                >
                  {{ field.label }}
                </button>
              </div>
            </div>

            <div
              v-if="activeCalculationField"
              class="grid gap-3 lg:grid-cols-2"
            >
              <div class="surface-field surface-field--compact">
                <div class="surface-field__label">
                  {{ activeCalculationField.label }}
                </div>
                <VTextField
                  :model-value="
                    getCalculationFieldValue(activeCalculationField.key)
                  "
                  class="surface-field__control"
                  :placeholder="activeCalculationField.placeholder"
                  :type="activeCalculationField.type"
                  variant="plain"
                  hide-details
                  density="compact"
                  @update:model-value="
                    (value) =>
                      updateCalculationField(activeCalculationField.key, value)
                  "
                />
              </div>
            </div>

            <div class="grid gap-2.5 sm:grid-cols-2">
              <div
                v-for="field in calculationCostFields"
                :key="field.key"
                class="surface-field surface-field--compact"
              >
                <div class="surface-field__label">{{ field.label }}</div>
                <VTextField
                  :model-value="getCalculationFieldValue(field.key)"
                  class="surface-field__control"
                  :placeholder="field.placeholder"
                  :suffix="field.suffix"
                  :type="field.type"
                  variant="plain"
                  hide-details
                  density="compact"
                  @update:model-value="
                    (value) => updateCalculationField(field.key, value)
                  "
                />
              </div>
            </div>
          </div>
        </div>

        <details class="border-t border-[#e0e0e0] px-4">
          <summary
            class="
              flex cursor-pointer list-none items-center justify-between gap-3
              py-4
            "
          >
            <span class="workspace-subsection-title">补充字段</span>
            <span class="workspace-subsection-meta">
              {{ form.extraProductFields.length }}
            </span>
          </summary>

          <div class="grid gap-3 pb-3">
            <div class="grid gap-2.5">
              <div class="workspace-subsection-header">
                <div class="workspace-subsection-title">补充字段</div>
                <div class="flex items-center gap-3">
                  <div class="workspace-subsection-meta">
                    {{ form.extraProductFields.length }}
                  </div>
                  <VBtn
                    variant="tonal"
                    size="small"
                    @click="addExtraProductField"
                  >
                    添加字段
                  </VBtn>
                </div>
              </div>

              <div
                v-if="form.extraProductFields.length"
                class="border-t border-[#e0e0e0]"
              >
                <div
                  class="
                    hidden border-b border-[#e0e0e0] py-2 text-xs text-[#525252]
                    md:grid md:grid-cols-[180px,minmax(0,1fr),56px] md:gap-3
                  "
                >
                  <div>字段名</div>
                  <div>字段值</div>
                  <div />
                </div>
                <div
                  v-for="field in form.extraProductFields"
                  :key="field.id"
                  class="
                    grid gap-3 border-b border-[#e0e0e0] py-3
                    md:grid-cols-[180px,minmax(0,1fr),56px]
                    md:items-end
                  "
                >
                  <VTextField
                    v-model="field.label"
                    label="字段名"
                    placeholder="例如 供应商"
                    variant="plain"
                    hide-details
                    density="compact"
                  />
                  <VTextField
                    v-model="field.value"
                    label="字段值"
                    placeholder="输入内容"
                    variant="plain"
                    hide-details
                    density="compact"
                  />
                  <VBtn
                    color="error"
                    variant="text"
                    @click="removeExtraProductField(field.id)"
                  >
                    删除
                  </VBtn>
                </div>
              </div>

              <div
                v-else
                class="workspace-empty-state workspace-empty-state--tight"
              >
                暂无补充字段。
              </div>
            </div>
          </div>
        </details>
      </VCard>

      <div class="workspace-sidebar">
        <VCard
          class="
            workspace-sheet overflow-hidden border border-[#c6c6c6] bg-white
            lg:hidden
          "
        >
          <div class="workspace-panel-header">
            <div class="workspace-panel-title">结果</div>
            <div class="workspace-panel-meta">
              {{
                primaryResultHighlights.length
                  + resultSummaryItems.length
                  + feeSummaryItems.length
              }} 项
            </div>
          </div>

          <div class="workspace-panel-body space-y-3">
            <div class="grid gap-2 sm:grid-cols-2">
              <div
                v-for="item in primaryResultHighlights"
                :key="item.label"
                class="
                  border border-[#c6c6c6] border-t-[2px] border-t-[#0f62fe]
                  bg-[#f8f8f8] px-3 py-2
                "
              >
                <div class="text-[11px] font-medium text-[#525252]">
                  {{ item.label }}
                </div>
                <div class="mt-1 text-[1.15rem] font-semibold text-[#161616]">
                  {{ item.value }}
                </div>
              </div>
            </div>

            <details class="border-t border-[#e0e0e0] pt-3">
              <summary
                class="
                  flex cursor-pointer list-none items-center justify-between
                  gap-3 text-sm font-medium text-[#161616]
                "
              >
                <span>展开概览与费用</span>
                <span class="text-xs text-[#525252]">
                  {{ resultSummaryItems.length + feeSummaryItems.length }} 项
                </span>
              </summary>

              <div class="mt-3 space-y-3">
                <div class="border-t border-[#e0e0e0] pt-3">
                  <div class="text-sm font-semibold text-[#161616]">概览</div>
                  <dl class="mt-3">
                    <div
                      v-for="item in resultSummaryItems"
                      :key="item.label"
                      class="
                        flex items-center justify-between gap-3 py-1 text-sm
                      "
                    >
                      <dt class="m-0 text-[#525252]">{{ item.label }}</dt>
                      <dd class="m-0 font-medium text-[#161616]">
                        {{ item.value }}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div class="border-t border-[#e0e0e0] pt-3">
                  <div class="text-sm font-semibold text-[#161616]">费用</div>
                  <dl class="mt-3">
                    <div
                      v-for="item in feeSummaryItems"
                      :key="item.label"
                      class="
                        flex items-center justify-between gap-3 py-1 text-sm
                      "
                    >
                      <dt class="m-0 text-[#525252]">{{ item.label }}</dt>
                      <dd class="m-0 font-medium text-[#161616]">
                        {{ item.value }}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </details>
          </div>
        </VCard>

        <VCard
          class="
            workspace-sheet hidden overflow-hidden border border-[#c6c6c6]
            bg-white lg:block
          "
        >
          <div class="workspace-panel-header">
            <div class="workspace-panel-title">结果</div>
            <div class="workspace-panel-meta">
              {{
                primaryResultHighlights.length
                  + resultSummaryItems.length
                  + feeSummaryItems.length
              }} 项
            </div>
          </div>

          <div class="workspace-panel-body space-y-3">
            <div class="space-y-3">
              <div
                v-for="item in primaryResultHighlights"
                :key="item.label"
                class="
                  border border-[#c6c6c6] border-t-[2px] border-t-[#0f62fe]
                  bg-[#f8f8f8] px-3 py-2.5
                "
              >
                <div class="text-xs font-medium text-[#525252]">
                  {{ item.label }}
                </div>
                <div class="mt-1 text-[1.45rem] font-semibold text-[#161616]">
                  {{ item.value }}
                </div>
              </div>
            </div>

            <div class="border-t border-[#e0e0e0] pt-3">
              <div class="text-sm font-semibold text-[#161616]">概览</div>
              <dl class="mt-3">
                <div
                  v-for="item in resultSummaryItems"
                  :key="item.label"
                  class="
                    flex items-center justify-between gap-3 py-1 text-sm
                  "
                >
                  <dt class="m-0 text-[#525252]">{{ item.label }}</dt>
                  <dd class="m-0 font-medium text-[#161616]">
                    {{ item.value }}
                  </dd>
                </div>
              </dl>
            </div>

            <div class="border-t border-[#e0e0e0] pt-3">
              <div class="text-sm font-semibold text-[#161616]">费用</div>
              <dl class="mt-3">
                <div
                  v-for="item in feeSummaryItems"
                  :key="item.label"
                  class="
                    flex items-center justify-between gap-3 py-1 text-sm
                  "
                >
                  <dt class="m-0 text-[#525252]">{{ item.label }}</dt>
                  <dd class="m-0 font-medium text-[#161616]">
                    {{ item.value }}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </VCard>
      </div>
    </div>
  </div>
</template>
