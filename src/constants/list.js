import { optionBackedFieldDefinitions } from "@/utils/app-fields"

function findOptionField(formKey) {
  return optionBackedFieldDefinitions.find(field => field.formKey === formKey)
}

const categoryField = findOptionField("category")
const adTypeField = findOptionField("adType")
const shippingIncludedField = findOptionField("shippingIncluded")

export const listRecordFieldConfigs = [
  {
    recordKey: "name",
    internalKey: "name",
    displayLabel: "名称",
    mainHeader: "名称",
    width: 18,
    aliases: ["名称"],
  },
  {
    recordKey: "sku",
    internalKey: "sku",
    displayLabel: "款号",
    mainHeader: "款号",
    width: 16,
    aliases: ["款号"],
  },
  {
    recordKey: "country",
    internalKey: "country",
    displayLabel: "国家",
    mainHeader: "国家",
    width: 10,
    aliases: ["国家"],
  },
  {
    recordKey: "platform",
    internalKey: "platform",
    displayLabel: "平台",
    mainHeader: "平台",
    width: 10,
    aliases: ["平台"],
  },
  {
    recordKey: "category",
    internalKey: "category",
    displayLabel: categoryField?.fieldName || "类目",
    mainHeader: categoryField?.fieldName || "类目",
    width: 12,
    aliases: [categoryField?.fieldName || "类目", "类目"],
  },
  {
    recordKey: "adType",
    internalKey: "ad_type",
    displayLabel: adTypeField?.fieldName || "广告类型",
    mainHeader: adTypeField?.fieldName || "广告类型",
    width: 12,
    aliases: [adTypeField?.fieldName || "广告类型", "广告类型"],
  },
  {
    recordKey: "shippingIncluded",
    internalKey: "shipping_included",
    displayLabel: `当前${shippingIncludedField?.fieldName || "是否包邮"}`,
    mainHeader: shippingIncludedField?.fieldName || "是否包邮",
    width: 12,
    aliases: [
      shippingIncludedField?.fieldName || "是否包邮",
      "是否包邮",
      "商品是否包邮",
    ],
  },
  {
    recordKey: "currentBenchmark",
    internalKey: "current_benchmark",
    displayLabel: "当前基准",
    mainHeader: "当前基准",
    width: 12,
    aliases: ["当前基准"],
  },
  {
    recordKey: "cost",
    internalKey: "cost",
    displayLabel: "成本",
    mainHeader: "成本",
    width: 12,
    type: "money",
    aliases: ["成本"],
  },
  {
    recordKey: "weight",
    internalKey: "weight",
    displayLabel: "重量(g)",
    mainHeader: "重量(g)",
    width: 12,
    aliases: ["重量(g)"],
  },
  {
    recordKey: "sellerShipping",
    internalKey: "seller_shipping",
    displayLabel: "卖家运费",
    mainHeader: "境内运费",
    width: 12,
    type: "money",
    aliases: ["境内运费", "卖家运费"],
  },
  {
    recordKey: "totalFee",
    internalKey: "total_fee",
    displayLabel: "总费用",
    mainHeader: "总费用(R$)",
    width: 14,
    type: "money",
    aliases: ["总费用(R$)", "总费用"],
  },
  {
    recordKey: "discountPrice",
    internalKey: "discount_price",
    displayLabel: "折后价",
    mainHeader: "折后价格(R$)",
    width: 14,
    type: "money",
    aliases: ["折后价格(R$)", "折后价", "折后售价"],
  },
  {
    recordKey: "listPrice",
    internalKey: "list_price",
    displayLabel: "折前价",
    mainHeader: "折前价格(R$)",
    width: 14,
    type: "money",
    aliases: ["折前价格(R$)", "折前价"],
  },
  {
    recordKey: "profitRate",
    internalKey: "profit_rate",
    displayLabel: "利润率",
    mainHeader: "利润率",
    width: 12,
    type: "percent",
    aliases: ["利润率"],
  },
  {
    recordKey: "netProfit",
    internalKey: "net_profit",
    displayLabel: "净利润",
    mainHeader: "净利润(R$)",
    width: 14,
    type: "money",
    aliases: ["净利润(R$)", "净利润"],
  },
  {
    recordKey: "revenue",
    internalKey: "revenue",
    displayLabel: "收入",
    mainHeader: "收入(R$)",
    width: 12,
    type: "money",
    aliases: ["收入(R$)", "收入"],
  },
  {
    recordKey: "shippingDefault",
    internalKey: "shipping_default",
    displayLabel: `预设${shippingIncludedField?.fieldName || "是否包邮"}`,
    mainHeader: `预设${shippingIncludedField?.fieldName || "是否包邮"}`,
    width: 14,
    aliases: [
      `预设${shippingIncludedField?.fieldName || "是否包邮"}`,
      "预设是否包邮",
    ],
  },
  {
    recordKey: "activityFee",
    internalKey: "activity_fee",
    displayLabel: "活动费",
    mainHeader: "活动费",
    width: 12,
    type: "money",
    aliases: ["活动费"],
  },
  {
    recordKey: "transactionFee",
    internalKey: "transaction_fee",
    displayLabel: "交易费",
    mainHeader: "交易费",
    width: 12,
    type: "money",
    aliases: ["交易费"],
  },
  {
    recordKey: "commissionFee",
    internalKey: "commission_fee",
    displayLabel: "佣金费",
    mainHeader: "佣金费",
    width: 12,
    type: "money",
    aliases: ["佣金费"],
  },
  {
    recordKey: "withdrawFee",
    internalKey: "withdraw_fee",
    displayLabel: "提现费",
    mainHeader: "提现费",
    width: 12,
    type: "money",
    aliases: ["提现费"],
  },
  {
    recordKey: "exchangeLossFee",
    internalKey: "exchange_loss_fee",
    displayLabel: "汇损金额",
    mainHeader: "汇损金额",
    width: 12,
    type: "money",
    aliases: ["汇损金额", "汇损"],
  },
  {
    recordKey: "taxFee",
    internalKey: "tax_fee",
    displayLabel: "税费",
    mainHeader: "税费",
    width: 12,
    type: "money",
    aliases: ["税费"],
  },
  {
    recordKey: "labelFee",
    internalKey: "label_fee",
    displayLabel: "贴单费",
    mainHeader: "贴单费",
    width: 12,
    type: "money",
    aliases: ["贴单费"],
  },
  {
    recordKey: "fixedSurcharge",
    internalKey: "fixed_surcharge",
    displayLabel: "固定附加费",
    mainHeader: "固定附加费",
    width: 14,
    type: "money",
    aliases: ["固定附加费", "固定附加"],
  },
  {
    recordKey: "notes",
    internalKey: "notes",
    displayLabel: "备注",
    mainHeader: "备注",
    width: 20,
    aliases: ["备注"],
  },
]

export const listMainSheetAuxColumnConfigs = [
  { header: "图片", key: "图片", width: 18 },
  { header: "变体", key: "变体", width: 18 },
]

export const listMainSheetColumnConfigs = [
  ...listRecordFieldConfigs
    .filter(config => ["name", "sku"].includes(config.recordKey))
    .map(config => ({
      header: config.mainHeader,
      key: config.mainHeader,
      width: config.width,
    })),
  ...listMainSheetAuxColumnConfigs,
  ...listRecordFieldConfigs.filter(
    config => !["name", "sku"].includes(config.recordKey),
  ).map(config => ({
    header: config.mainHeader,
    key: config.mainHeader,
    width: config.width,
  })),
]

export const listRecordSheetBaseColumns = [
  "id",
  ...listRecordFieldConfigs.map(config => config.internalKey),
]

export const listRecordSheetExtraColumns = [
  "global_sku",
  "current_benchmark_key",
  "cover_image_id",
  "variant_summary",
  "preset_snapshot_json",
  "calculation_snapshot_json",
  "created_at",
  "updated_at",
]

export const listRecordSheetColumnConfigs = [
  "id",
  "name",
  "sku",
  "global_sku",
  "country",
  "platform",
  "category",
  "ad_type",
  "shipping_included",
  "current_benchmark",
  "current_benchmark_key",
  "cost",
  "weight",
  "seller_shipping",
  "total_fee",
  "discount_price",
  "list_price",
  "profit_rate",
  "net_profit",
  "revenue",
  "shipping_default",
  "activity_fee",
  "transaction_fee",
  "commission_fee",
  "withdraw_fee",
  "exchange_loss_fee",
  "tax_fee",
  "label_fee",
  "fixed_surcharge",
  "notes",
  "cover_image_id",
  "variant_summary",
  "preset_snapshot_json",
  "calculation_snapshot_json",
  "created_at",
  "updated_at",
]

export const listTableColumnConfigs = [
  { key: "countryPlatform", label: "国家 / 平台" },
  ...listRecordFieldConfigs
    .filter(
      config =>
        ![
          "name",
          "sku",
          "country",
          "platform",
          "notes",
        ].includes(config.recordKey),
    )
    .map(config => ({
      key: config.recordKey,
      label: config.displayLabel,
      type: config.type || "",
    })),
]

export function findListRecordFieldConfig(recordKey = "") {
  return (
    listRecordFieldConfigs.find(
      config => config.recordKey === recordKey,
    ) || null
  )
}
