import { optionBackedFieldDefinitions } from "@/utils/app-fields"

const shippingIncludedFieldDefinition = optionBackedFieldDefinitions.find(
  field => field.formKey === "shippingIncluded",
)

const categoryFieldDefinition = optionBackedFieldDefinitions.find(
  field => field.formKey === "category",
)

const adTypeFieldDefinition = optionBackedFieldDefinitions.find(
  field => field.formKey === "adType",
)

export const createPresetFieldDefinitions = {
  discountRate: { name: "折扣", control: "number" },
  activityRate: { name: "活动费率", control: "number" },
  transactionRate: { name: "交易费率", control: "number" },
  withdrawRate: { name: "提现费率", control: "number" },
  exchangeLossRate: { name: "汇损", control: "number" },
  taxRate: { name: "税率", control: "number" },
  labelFee: { name: "贴单费用", control: "number" },
  shippingRule: { name: "卖家支付运费", control: "rule" },
}

export const createPresetSummaryFieldConfigs = [
  createPresetFieldDefinitions.discountRate,
  createPresetFieldDefinitions.activityRate,
  createPresetFieldDefinitions.transactionRate,
  createPresetFieldDefinitions.taxRate,
  createPresetFieldDefinitions.labelFee,
  {
    ...shippingIncludedFieldDefinition,
    name: shippingIncludedFieldDefinition?.fieldName || "是否包邮",
    control: "select",
  },
]

export const createPrimaryResultHighlightConfigs = [
  { label: "净利润", snapshotKey: "netProfit", valueType: "money" },
  { label: "利润率", snapshotKey: "profitRate", valueType: "percent" },
]

export const createResultSummaryConfigs = [
  { label: "当前基准", valueKey: "currentBenchmark", valueType: "plain" },
  { label: "折前价", snapshotKey: "listPrice", valueType: "money" },
  { label: "折后价", snapshotKey: "discountPrice", valueType: "money" },
  { label: "收入", snapshotKey: "revenue", valueType: "money" },
  { label: "总费用", snapshotKey: "totalFee", valueType: "money" },
  {
    label: `当前${shippingIncludedFieldDefinition?.fieldName || "是否包邮"}`,
    snapshotKey: "shippingIncluded",
    valueType: "plain",
  },
  {
    label: `预设${shippingIncludedFieldDefinition?.fieldName || "是否包邮"}`,
    snapshotKey: "shippingDefault",
    valueType: "plain",
  },
]

export const createFeeSummaryConfigs = [
  { label: "活动费", snapshotKey: "activityFee", valueType: "money" },
  { label: "交易费", snapshotKey: "transactionFee", valueType: "money" },
  { label: "提现费", snapshotKey: "withdrawFee", valueType: "money" },
  { label: "汇损金额", snapshotKey: "exchangeLossFee", valueType: "money" },
  { label: "税费", snapshotKey: "taxFee", valueType: "money" },
  {
    label: "贴单费",
    snapshotKey: "labelFee",
    valueType: "money",
    unitPresetFieldKey: "labelFee",
  },
  { label: "卖家运费", snapshotKey: "sellerShipping", valueType: "money" },
  { label: "固定附加", snapshotKey: "fixedSurcharge", valueType: "money" },
  { label: "成本", formKey: "cost", valueType: "money" },
]

export const createCalculationInputFields = [
  {
    key: "listPrice",
    label: "折前价格",
    placeholder: "输入折前价格",
    type: "number",
  },
  {
    key: "discountPrice",
    label: "折后售价",
    placeholder: "输入折后售价",
    type: "number",
  },
  {
    key: "revenue",
    label: "收入",
    placeholder: "输入收入",
    type: "number",
  },
  {
    key: "profitRate",
    label: "利润率",
    placeholder: "输入利润率",
    type: "number",
  },
  {
    key: "netProfit",
    label: "净利润",
    placeholder: "输入净利润",
    type: "number",
  },
  {
    key: "sellerShipping",
    label: "卖家支付运费",
    placeholder: "按规则自动计算",
    type: "number",
  },
  {
    key: "fixedSurcharge",
    label: "固定附加费",
    placeholder: "输入固定附加费",
    type: "number",
  },
]

export const createCalculationDriverFieldConfigs = [
  { key: "listPrice", label: "折前价格" },
  { key: "discountPrice", label: "折后售价" },
  { key: "revenue", label: "收入" },
  { key: "profitRate", label: "利润率" },
  { key: "netProfit", label: "净利润" },
]

export const createProductBaseFields = [
  {
    key: "name",
    label: "名称",
    placeholder: "输入名称",
    type: "text",
    control: "text",
  },
  {
    key: "styleNo",
    label: "款号",
    placeholder: "输入款号",
    type: "text",
    control: "text",
  },
  {
    key: "image",
    label: "图片",
    placeholder: "输入图片路径或 URL",
    type: "text",
    control: "text",
  },
  {
    key: "cost",
    label: "成本",
    placeholder: "输入成本",
    type: "number",
    control: "text",
  },
  {
    key: "weight",
    label: "重量",
    placeholder: "输入重量",
    type: "number",
    control: "text",
  },
  {
    key: "category",
    label: categoryFieldDefinition?.fieldName || "类目",
    placeholder: `选择${categoryFieldDefinition?.fieldName || "类目"}`,
    type: "text",
    control: "select",
    optionSource: categoryFieldDefinition?.optionSource || "category",
  },
  {
    key: "adType",
    label: adTypeFieldDefinition?.fieldName || "广告类型",
    placeholder: `选择${adTypeFieldDefinition?.fieldName || "广告类型"}`,
    type: "text",
    control: "select",
    optionSource: adTypeFieldDefinition?.optionSource || "adType",
  },
  {
    key: "shippingIncluded",
    label: shippingIncludedFieldDefinition?.fieldName || "是否包邮",
    placeholder: `选择${shippingIncludedFieldDefinition?.fieldName || "是否包邮"}`,
    type: "text",
    control: "select",
    optionSource:
      shippingIncludedFieldDefinition?.optionSource || "shippingIncluded",
  },
]
