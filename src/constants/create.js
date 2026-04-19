import { optionBackedFieldDefinitions } from "@/utils/app-fields"

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
    ...optionBackedFieldDefinitions.find(
      field => field.formKey === "shippingIncluded",
    ),
    name:
      optionBackedFieldDefinitions.find(
        field => field.formKey === "shippingIncluded",
      )?.fieldName || "是否包邮",
    control: "select",
  },
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
    label: "类目",
    placeholder: "选择类目",
    type: "text",
    control: "select",
    optionSource: optionBackedFieldDefinitions.find(
      field => field.formKey === "category",
    )?.optionSource || "category",
  },
  {
    key: "adType",
    label: "广告类型",
    placeholder: "选择广告类型",
    type: "text",
    control: "select",
    optionSource: optionBackedFieldDefinitions.find(
      field => field.formKey === "adType",
    )?.optionSource || "adType",
  },
  {
    key: "shippingIncluded",
    label: "是否包邮",
    placeholder: "选择是否包邮",
    type: "text",
    control: "select",
    optionSource: optionBackedFieldDefinitions.find(
      field => field.formKey === "shippingIncluded",
    )?.optionSource || "shippingIncluded",
  },
]
