import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const XLSX = require("xlsx")

const workbookPath = fileURLToPath(
  new URL("../excel/data.xlsx", import.meta.url),
)

const PRESET_GROUPS_SHEET_NAME = "preset_groups"
const PRESET_ITEMS_SHEET_NAME = "preset_items"
const TEMPLATE_TABLES_SHEET_NAME = "template_tables"
const FIXED_FEE_SHEET_NAME = "tpl_ml_br_fixed_fee"
const ML_BR_PRESET_ID = "巴西_美客多"

function upsertSheet(workbook, name, sheet) {
  workbook.Sheets[name] = sheet

  if (!workbook.SheetNames.includes(name)) {
    workbook.SheetNames.push(name)
  }
}

function createTabularSheet(headers, rows) {
  return XLSX.utils.aoa_to_sheet([
    headers,
    ...rows.map(row => headers.map(header => row[header] ?? "")),
  ])
}

function readRows(workbook, name) {
  const sheet = workbook.Sheets[name]

  if (!sheet) {
    return []
  }

  return XLSX.utils.sheet_to_json(sheet)
}

const workbook = XLSX.readFile(workbookPath)

const templateTables = readRows(
  workbook,
  TEMPLATE_TABLES_SHEET_NAME,
).map((row) => {
  if (row.id !== "ml_br_fixed_fee") {
    return row
  }

  return {
    ...row,
    remark:
      "来源页当前说明：79 以上不收固定费，12.50 以下按售价一半收取固定费。",
  }
})

upsertSheet(
  workbook,
  TEMPLATE_TABLES_SHEET_NAME,
  createTabularSheet(
    [
      "id",
      "name",
      "sheet_name",
      "rule_type",
      "country",
      "platform",
      "value_unit",
      "x_axis_label",
      "y_axis_label",
      "source_url",
      "enabled",
      "sort",
      "remark",
    ],
    templateTables,
  ),
)

upsertSheet(
  workbook,
  FIXED_FEE_SHEET_NAME,
  createTabularSheet(
    ["x_min", "x_max", "value", "remark"],
    [
      {
        x_min: "12.5",
        x_max: "29",
        value: "6.25",
        remark: "来源页还说明商品售价至少应为 R$ 8。",
      },
      {
        x_min: "29",
        x_max: "50",
        value: "6.50",
        remark: "",
      },
      {
        x_min: "50",
        x_max: "79",
        value: "6.75",
        remark: "",
      },
    ],
  ),
)

const presetGroups = readRows(workbook, PRESET_GROUPS_SHEET_NAME)
const presetItems = readRows(workbook, PRESET_ITEMS_SHEET_NAME)

if (!presetGroups.find(row => row.id === ML_BR_PRESET_ID)) {
  presetGroups.push({
    id: ML_BR_PRESET_ID,
    country: "巴西",
    platform: "美客多",
    country_platform: ML_BR_PRESET_ID,
    sort: presetGroups.length + 1,
  })
}

const nextPresetItems = presetItems.filter(item =>
  ![
    "卖家支付运费",
    "佣金费率",
    "固定附加费",
  ].includes(item.name),
)

nextPresetItems.push(
  {
    id: `${ML_BR_PRESET_ID}__item__seller_shipping`,
    preset_id: ML_BR_PRESET_ID,
    name: "卖家支付运费",
    type: "rule",
    unit: "R$",
    value:
      "if({是否包邮} == \"是\", 0, 查表(\"巴西美客多运费补贴表\", {折后售价}, {重量}))",
    rule_mode: "condition",
    rule_table_id: "ml_br_shipping_fee",
    rule_config: JSON.stringify({
      field: "是否包邮",
      operator: "eq",
      compareValue: "是",
      thenAction: {
        kind: "fixed",
        value: "0",
        tableId: "",
        args: [],
      },
      elseAction: {
        kind: "table",
        value: "",
        tableId: "ml_br_shipping_fee",
        args: ["折后售价", "重量"],
      },
    }),
    sort: 10,
  },
  {
    id: `${ML_BR_PRESET_ID}__item__commission_rate`,
    preset_id: ML_BR_PRESET_ID,
    name: "佣金费率",
    type: "rule",
    unit: "%",
    value: "查表(\"巴西美客多佣金表\", {类目}, {广告类型})",
    rule_mode: "advanced",
    rule_table_id: "ml_br_commission",
    rule_config: JSON.stringify({
      expression: "查表(\"巴西美客多佣金表\", {类目}, {广告类型})",
    }),
    sort: 11,
  },
  {
    id: `${ML_BR_PRESET_ID}__item__fixed_surcharge`,
    preset_id: ML_BR_PRESET_ID,
    name: "固定附加费",
    type: "rule",
    unit: "R$",
    value:
      "if({折后售价} < 12.5, {折后售价} * 0.5, 查表(\"巴西美客多固定附加费表\", {折后售价}))",
    rule_mode: "advanced",
    rule_table_id: "ml_br_fixed_fee",
    rule_config: JSON.stringify({
      expression:
        "if({折后售价} < 12.5, {折后售价} * 0.5, 查表(\"巴西美客多固定附加费表\", {折后售价}))",
    }),
    sort: 12,
  },
)

nextPresetItems.sort((a, b) => Number(a.sort) - Number(b.sort))

upsertSheet(
  workbook,
  PRESET_GROUPS_SHEET_NAME,
  createTabularSheet(
    ["id", "country", "platform", "country_platform", "sort"],
    presetGroups,
  ),
)

upsertSheet(
  workbook,
  PRESET_ITEMS_SHEET_NAME,
  createTabularSheet(
    [
      "id",
      "preset_id",
      "name",
      "type",
      "unit",
      "value",
      "rule_mode",
      "rule_table_id",
      "rule_config",
      "sort",
    ],
    nextPresetItems,
  ),
)

XLSX.writeFile(workbook, workbookPath)
