<script setup>
import { storeToRefs } from "pinia"
import { computed, reactive, ref, watch } from "vue"

import {
  createCalculationInputFields,
  createProductBaseFields,
} from "@/constants/create"
import { booleanValueOptions } from "@/constants/preset"
import { usePresetStore } from "@/stores/preset"

const presetStore = usePresetStore()
const { activePresetId, presetRecords } = storeToRefs(presetStore)

const selectedPresetId = ref("")
const extraProductFieldSeed = ref(1)
const calculationDriver = ref("listPrice")

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
  image: "",
  cost: "",
  weight: "",
  category: "",
  adType: "",
  notes: "",
  presetItems: [],
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

function createExtraProductField() {
  const id = `product_extra_${Date.now()}_${extraProductFieldSeed.value}`

  extraProductFieldSeed.value += 1

  return {
    id,
    label: "",
    value: "",
  }
}

function createPresetSnapshotItem(item) {
  const nextType = item?.type === "boolean" ? "boolean" : "number"
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
}

function addExtraProductField() {
  form.extraProductFields.push(createExtraProductField())
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

const calculationCards = computed(() => [
  {
    label: "收入",
    value: formatNumber(calculationSnapshot.value.revenue, " R$"),
  },
  {
    label: "总费用",
    value: formatNumber(calculationSnapshot.value.totalFee, " R$"),
  },
  {
    label: "当前联动基准",
    value:
      calculationDriver.value === "discountPrice"
        ? "折后售价"
        : calculationDriver.value === "revenue"
          ? "收入"
          : calculationDriver.value === "profitRate"
            ? "利润率"
            : calculationDriver.value === "netProfit"
              ? "净利润"
              : "折前价格",
  },
  {
    label: "是否包邮",
    value: calculationSnapshot.value.shippingIncluded,
  },
])

const calculationDetails = computed(() => [
  {
    label: "折扣率",
    value: formatNumber(calculationSnapshot.value.discountRate, "%"),
  },
  {
    label: "活动费率",
    value: formatNumber(calculationSnapshot.value.activityRate, "%"),
  },
  {
    label: "交易费率",
    value: formatNumber(calculationSnapshot.value.transactionRate, "%"),
  },
  {
    label: "提现费率",
    value: formatNumber(calculationSnapshot.value.withdrawRate, "%"),
  },
  {
    label: "汇损",
    value: formatNumber(calculationSnapshot.value.exchangeLossRate, "%"),
  },
  {
    label: "税率",
    value: formatNumber(calculationSnapshot.value.taxRate, "%"),
  },
  {
    label: "活动费",
    value: formatNumber(calculationSnapshot.value.activityFee, " R$"),
  },
  {
    label: "交易费",
    value: formatNumber(calculationSnapshot.value.transactionFee, " R$"),
  },
  {
    label: "提现费",
    value: formatNumber(calculationSnapshot.value.withdrawFee, " R$"),
  },
  {
    label: "汇损金额",
    value: formatNumber(calculationSnapshot.value.exchangeLossFee, " R$"),
  },
  {
    label: "税费",
    value: formatNumber(calculationSnapshot.value.taxFee, " R$"),
  },
  {
    label: "贴单费用",
    value: formatNumber(calculationSnapshot.value.labelFee, " R$"),
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
</script>

<template>
  <div class="h-full min-h-0 overflow-y-auto pr-2">
    <div class="grid gap-4 xl:grid-cols-[minmax(0,1.35fr),minmax(340px,0.8fr)]">
      <div class="space-y-4">
        <VCard class="panel-card overflow-hidden">
          <div class="border-b border-slate-200 px-5 py-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-lg font-semibold text-slate-900">预设字段</div>
                <div class="mt-1 text-sm text-slate-500">
                  选择一个预设组合，并把参数快照带入当前订单。
                </div>
              </div>
              <VBtn
                v-if="selectedPresetRecord"
                variant="tonal"
                size="small"
                @click="resetPresetItemsFromSource"
              >
                重新应用预设
              </VBtn>
            </div>
          </div>

          <div v-if="hasPresetRecords" class="space-y-4 p-5">
            <div class="grid gap-4 md:grid-cols-3">
              <VAutocomplete
                v-model="selectedPresetId"
                :items="presetOptions"
                item-title="title"
                item-value="value"
                label="预设组合"
                variant="outlined"
                hide-details
              />
              <VTextField
                :model-value="form.country"
                label="国家"
                variant="outlined"
                hide-details
                readonly
              />
              <VTextField
                :model-value="form.platform"
                label="平台"
                variant="outlined"
                hide-details
                readonly
              />
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              <div
                v-for="item in form.presetItems"
                :key="item.id"
                class="rounded-5 border border-slate-200 bg-slate-50/80 p-4"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="text-sm font-semibold text-slate-900">
                    {{ item.name }}
                  </div>
                  <div class="text-xs text-slate-400">
                    {{ item.type === "boolean" ? "布尔值" : "数值" }}
                    <span v-if="item.unit"> / {{ item.unit }}</span>
                  </div>
                </div>

                <div class="mt-3">
                  <VSelect
                    v-if="item.type === 'boolean'"
                    :model-value="item.value"
                    :items="booleanValueOptions"
                    item-title="title"
                    item-value="value"
                    variant="outlined"
                    hide-details
                    @update:model-value="
                      (value) => updatePresetSnapshotItem(item, 'value', value)
                    "
                  />
                  <VTextField
                    v-else
                    :model-value="item.value"
                    variant="outlined"
                    hide-details
                    :placeholder="item.unit ? `输入${item.unit}` : '输入数值'"
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
            class="flex flex-col items-center justify-center gap-3 px-5 py-12"
          >
            <div class="text-sm text-slate-400">
              还没有可用预设，先去预设页创建国家 / 平台组合。
            </div>
            <RouterLink to="/preset">
              <VBtn variant="tonal">前往预设页</VBtn>
            </RouterLink>
          </div>
        </VCard>

        <VCard class="panel-card overflow-hidden">
          <div class="border-b border-slate-200 px-5 py-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-lg font-semibold text-slate-900">商品字段</div>
                <div class="mt-1 text-sm text-slate-500">
                  固定商品字段 + 可扩展字段，后续用于保存订单表。
                </div>
              </div>
              <VBtn variant="tonal" size="small" @click="addExtraProductField">
                添加自定义字段
              </VBtn>
            </div>
          </div>

          <div class="space-y-4 p-5">
            <div class="grid gap-4 md:grid-cols-2">
              <VTextField
                v-for="field in createProductBaseFields"
                :key="field.key"
                v-model="form[field.key]"
                :label="field.label"
                :placeholder="field.placeholder"
                :type="field.type"
                variant="outlined"
                hide-details
              />
            </div>

            <VTextarea
              v-model="form.notes"
              label="备注"
              placeholder="补充商品说明、备注或外部链接"
              variant="outlined"
              rows="3"
              auto-grow
              hide-details
            />

            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div class="text-sm font-semibold text-slate-900">
                  自定义商品字段
                </div>
                <div class="text-xs text-slate-400">
                  共 {{ form.extraProductFields.length }} 项
                </div>
              </div>

              <div
                v-if="form.extraProductFields.length"
                class="space-y-3"
              >
                <div
                  v-for="field in form.extraProductFields"
                  :key="field.id"
                  class="grid gap-3 md:grid-cols-[180px,minmax(0,1fr),56px]"
                >
                  <VTextField
                    v-model="field.label"
                    label="字段名"
                    placeholder="例如 供应商"
                    variant="outlined"
                    hide-details
                  />
                  <VTextField
                    v-model="field.value"
                    label="字段值"
                    placeholder="输入内容"
                    variant="outlined"
                    hide-details
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
                class="
                  rounded-5 border border-dashed p-4
                  text-sm text-slate-400
                "
              >
                还没有额外商品字段，点击右上角按钮可以继续添加。
              </div>
            </div>
          </div>
        </VCard>
      </div>

      <div class="space-y-4">
        <VCard class="panel-card overflow-hidden">
          <div class="border-b border-slate-200 px-5 py-4">
            <div class="text-lg font-semibold text-slate-900">计算字段</div>
            <div class="mt-1 text-sm text-slate-500">
              支持按折前价格、折后售价或利润率任一方向联动反算。
            </div>
          </div>

          <div class="space-y-4 p-5">
            <div class="grid gap-4">
              <VTextField
                v-for="field in createCalculationInputFields"
                :key="field.key"
                :model-value="getCalculationFieldValue(field.key)"
                :label="field.label"
                :placeholder="field.placeholder"
                :suffix="field.suffix"
                :type="field.type"
                variant="outlined"
                hide-details
                @update:model-value="
                  (value) => updateCalculationField(field.key, value)
                "
              />
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <div
                v-for="card in calculationCards"
                :key="card.label"
                class="rounded-5 bg-slate-950 px-4 py-4 text-white"
              >
                <div class="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {{ card.label }}
                </div>
                <div class="mt-2 text-2xl font-semibold">
                  {{ card.value }}
                </div>
              </div>
            </div>

            <div class="rounded-5 border border-slate-200 bg-slate-50/80 p-4">
              <div class="text-sm font-semibold text-slate-900">费用明细</div>
              <div class="mt-3 space-y-3">
                <div
                  v-for="item in calculationDetails"
                  :key="item.label"
                  class="flex items-center justify-between gap-3 text-sm"
                >
                  <span class="text-slate-500">{{ item.label }}</span>
                  <span class="font-medium text-slate-900">
                    {{ item.value }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </VCard>
      </div>
    </div>
  </div>
</template>
