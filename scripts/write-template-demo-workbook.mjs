import { fileURLToPath } from "node:url"

import XLSXModule from "xlsx"

import { templateDemoTables } from "../src/constants/template.js"
import {
  APP_OPTION_GROUPS_SHEET_NAME,
  APP_OPTIONS_SHEET_NAME,
} from "../src/utils/options/excel.js"

const XLSX = XLSXModule.default ?? XLSXModule

const workbookPath = fileURLToPath(
  new URL("../excel/data.xlsx", import.meta.url),
)

const PRESET_GROUPS_SHEET_NAME = "preset_groups"
const PRESET_ITEMS_SHEET_NAME = "preset_items"
const PRESET_GROUP_COLUMNS = [
  "id",
  "country",
  "platform",
  "country_platform",
  "sort",
]
const PRESET_ITEM_COLUMNS = [
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
]
const ML_BR_PRESET_ID = "巴西_美客多"

const templateSheetNameMap = {
  ml_br_fixed_fee: "tpl_ml_br_fixed_fee",
  ml_br_shipping_fee: "tpl_ml_br_shipping_fee",
  ml_br_shipping_fast_under_79: "tpl_ml_br_ship_fast_79",
  ml_br_commission: "tpl_ml_br_commission",
}

function upsertSheet(workbook, name, sheet) {
  workbook.Sheets[name] = sheet

  if (!workbook.SheetNames.includes(name)) {
    workbook.SheetNames.push(name)
  }
}

function createTabularSheet(headers, rows) {
  const aoa = [headers, ...rows.map(row => headers.map(header => row[header] ?? ""))]

  return XLSX.utils.aoa_to_sheet(aoa)
}

function createMatrixSheet(table) {
  const headerRow = [
    `${table.yAxisLabel}\\${table.xAxisLabel}`,
    ...table.columns.map(column => column.label),
  ]
  const bodyRows = table.rows.map(row => [
    row.label,
    ...table.columns.map(column => row.values?.[column.id] ?? ""),
  ])

  return XLSX.utils.aoa_to_sheet([headerRow, ...bodyRows])
}

function readSheetRows(workbook, name) {
  const sheet = workbook.Sheets[name]

  if (!sheet) {
    return []
  }

  return XLSX.utils.sheet_to_json(sheet)
}

function createMlBrRulePresetItems() {
  return [
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
  ]
}

function upsertMlBrPreset(workbook) {
  const presetGroups = readSheetRows(workbook, PRESET_GROUPS_SHEET_NAME)
  const presetItems = readSheetRows(workbook, PRESET_ITEMS_SHEET_NAME)
  const existingGroupIndex = presetGroups.findIndex(
    row => row.id === ML_BR_PRESET_ID,
  )

  if (existingGroupIndex === -1) {
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

  nextPresetItems.push(...createMlBrRulePresetItems())
  nextPresetItems.sort((a, b) => Number(a.sort) - Number(b.sort))

  upsertSheet(
    workbook,
    PRESET_GROUPS_SHEET_NAME,
    createTabularSheet(PRESET_GROUP_COLUMNS, presetGroups),
  )
  upsertSheet(
    workbook,
    PRESET_ITEMS_SHEET_NAME,
    createTabularSheet(PRESET_ITEM_COLUMNS, nextPresetItems),
  )
}

function createTemplateTablesRows() {
  return templateDemoTables.map((table, index) => ({
    id: table.id,
    name: table.name,
    sheet_name: templateSheetNameMap[table.id] || `tpl_${table.id}`.slice(0, 31),
    rule_type: table.ruleType,
    country: table.country,
    platform: table.platform,
    value_unit: table.valueUnit,
    x_axis_label: table.xAxisLabel || "",
    y_axis_label: table.yAxisLabel || "",
    source_url: table.sourceUrl,
    enabled: 1,
    sort: index + 1,
    remark: table.remark,
  }))
}

function createTemplateSheet(table) {
  if (table.ruleType === "range_2d") {
    return createMatrixSheet(table)
  }

  if (table.ruleType === "fixed") {
    return createTabularSheet(["value", "remark"], table.rows || [])
  }

  if (table.ruleType === "range_1d") {
    return createTabularSheet(
      ["x_min", "x_max", "value", "remark"],
      (table.rows || []).map(row => ({
        x_min: row.xMin,
        x_max: row.xMax,
        value: row.value,
        remark: row.remark,
      })),
    )
  }

  if (table.ruleType === "enum") {
    return createTabularSheet(
      ["match_key", "value", "remark"],
      (table.rows || []).map(row => ({
        match_key: row.matchKey,
        value: row.value,
        remark: row.remark,
      })),
    )
  }

  if (table.ruleType === "enum_pair") {
    return createTabularSheet(
      ["match_key", "match_key_2", "value", "remark"],
      (table.rows || []).map(row => ({
        match_key: row.matchKey,
        match_key_2: row.matchKey2,
        value: row.value,
        remark: row.remark,
      })),
    )
  }

  return createTabularSheet(
    ["match_key", "x_min", "x_max", "value", "remark"],
    (table.rows || []).map(row => ({
      match_key: row.matchKey,
      x_min: row.xMin,
      x_max: row.xMax,
      value: row.value,
      remark: row.remark,
    })),
  )
}

function createAppOptionsRows() {
  return [
    {
      id: "shipping_included__yes",
      group_key: "shipping_included",
      label: "是",
      value: "是",
      sort: 1,
      enabled: 1,
      remark: "",
    },
    {
      id: "shipping_included__no",
      group_key: "shipping_included",
      label: "否",
      value: "否",
      sort: 2,
      enabled: 1,
      remark: "",
    },
    {
      id: "ad_type__classico",
      group_key: "ad_type",
      label: "Clássico",
      value: "Clássico",
      sort: 1,
      enabled: 1,
      remark: "Mercado Livre 广告类型。",
    },
    {
      id: "ad_type__premium",
      group_key: "ad_type",
      label: "Premium",
      value: "Premium",
      sort: 4,
      enabled: 1,
      remark: "Mercado Livre 广告类型。",
    },
    {
      id: "category__default",
      group_key: "category",
      label: "默认",
      value: "默认",
      sort: 1,
      enabled: 1,
      remark: "",
    },
    {
      id: "category__fashion",
      group_key: "category",
      label: "服饰",
      value: "服饰",
      sort: 2,
      enabled: 1,
      remark: "",
    },
    {
      id: "category__3c",
      group_key: "category",
      label: "3C",
      value: "3C",
      sort: 3,
      enabled: 1,
      remark: "",
    },
    {
      id: "category__home",
      group_key: "category",
      label: "家居",
      value: "家居",
      sort: 4,
      enabled: 1,
      remark: "",
    },
    {
      id: "category__beauty",
      group_key: "category",
      label: "美妆",
      value: "美妆",
      sort: 5,
      enabled: 1,
      remark: "",
    },
  ]
}

function createAppOptionGroupsRows() {
  return [
    {
      key: "ad_type",
      title: "广告类型",
      description: "创建页和佣金表里使用的广告类型选项。",
      sort: 2,
      enabled: 1,
      remark: "",
    },
    {
      key: "category",
      title: "类目",
      description: "创建页和佣金表里使用的类目选项。",
      sort: 3,
      enabled: 1,
      remark: "",
    },
    {
      key: "shipping_included",
      title: "是否包邮",
      description: "创建页当前包邮状态使用的选项。",
      sort: 1,
      enabled: 1,
      remark: "",
    },
  ]
}

const workbook = XLSX.readFile(workbookPath)

upsertSheet(
  workbook,
  "template_tables",
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
    createTemplateTablesRows(),
  ),
)

templateDemoTables.forEach((table) => {
  const sheetName = templateSheetNameMap[table.id] || `tpl_${table.id}`.slice(0, 31)

  upsertSheet(workbook, sheetName, createTemplateSheet(table))
})

upsertMlBrPreset(workbook)
upsertSheet(
  workbook,
  APP_OPTION_GROUPS_SHEET_NAME,
  createTabularSheet(
    ["key", "title", "description", "sort", "enabled", "remark"],
    createAppOptionGroupsRows(),
  ),
)
upsertSheet(
  workbook,
  APP_OPTIONS_SHEET_NAME,
  createTabularSheet(
    ["id", "group_key", "label", "value", "sort", "enabled", "remark"],
    createAppOptionsRows(),
  ),
)

XLSX.writeFile(workbook, workbookPath)
