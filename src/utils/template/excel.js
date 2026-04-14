import XEUtils from "xe-utils"
import * as XLSX from "xlsx"

import {
  createTemplateMatrixColumn,
  createTemplateMatrixRow,
  createTemplateRow,
  createTemplateTable,
} from "@/constants/template"
import {
  exportWorkbookToBytes,
  readWorkbookFromBytes,
  readWorkbookFromFile,
} from "@/utils/excel/workbook"

export const TEMPLATE_TABLES_SHEET_NAME = "template_tables"

export const TEMPLATE_TABLE_COLUMNS = [
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
]

const SUPPORTED_RULE_TYPES = new Set([
  "fixed",
  "range_1d",
  "range_2d",
  "enum",
  "enum_range",
  "enum_pair",
])

function normalizeValue(value) {
  return String(value ?? "").trim()
}

function normalizeSort(value, fallback = 0) {
  const nextValue = Number(value)

  if (Number.isFinite(nextValue) && nextValue > 0) {
    return nextValue
  }

  return fallback
}

function normalizeRuleType(value) {
  const nextValue = normalizeValue(value)

  return SUPPORTED_RULE_TYPES.has(nextValue) ? nextValue : "fixed"
}

function normalizeSheetName(value, fallback) {
  const nextValue = normalizeValue(value || fallback)
    .replaceAll(":", "_")
    .replaceAll("\\", "_")
    .replaceAll("/", "_")
    .replaceAll("?", "_")
    .replaceAll("*", "_")
    .replaceAll("[", "_")
    .replaceAll("]", "_")
    .slice(0, 31)

  return nextValue || "template_sheet"
}

function createTableColumnId(tableId, index) {
  return `${tableId}__column__${index + 1}`
}

function createTableRowId(tableId, index) {
  return `${tableId}__row__${index + 1}`
}

function isEmptyRuleRow(row = {}, keys = []) {
  return keys.every(key => !normalizeValue(row[key]))
}

function normalizeTemplateRows(ruleType, rows = [], tableId = "") {
  if (ruleType === "fixed") {
    const nextRows = rows
      .map((row, index) => ({
        id: row?.id || createTableRowId(tableId, index),
        value: normalizeValue(row?.value),
        remark: normalizeValue(row?.remark),
      }))
      .filter(row => !isEmptyRuleRow(row, ["value", "remark"]))

    return nextRows.length ? nextRows : [createTemplateRow(ruleType)]
  }

  if (ruleType === "range_1d") {
    const nextRows = rows
      .map((row, index) => ({
        id: row?.id || createTableRowId(tableId, index),
        xMin: normalizeValue(row?.xMin ?? row?.x_min),
        xMax: normalizeValue(row?.xMax ?? row?.x_max),
        value: normalizeValue(row?.value),
        remark: normalizeValue(row?.remark),
      }))
      .filter(row => !isEmptyRuleRow(row, ["xMin", "xMax", "value", "remark"]))

    return nextRows.length ? nextRows : [createTemplateRow(ruleType)]
  }

  if (ruleType === "enum") {
    const nextRows = rows
      .map((row, index) => ({
        id: row?.id || createTableRowId(tableId, index),
        matchKey: normalizeValue(row?.matchKey ?? row?.match_key),
        value: normalizeValue(row?.value),
        remark: normalizeValue(row?.remark),
      }))
      .filter(row => !isEmptyRuleRow(row, ["matchKey", "value", "remark"]))

    return nextRows.length ? nextRows : [createTemplateRow(ruleType)]
  }

  if (ruleType === "enum_range") {
    const nextRows = rows
      .map((row, index) => ({
        id: row?.id || createTableRowId(tableId, index),
        matchKey: normalizeValue(row?.matchKey ?? row?.match_key),
        xMin: normalizeValue(row?.xMin ?? row?.x_min),
        xMax: normalizeValue(row?.xMax ?? row?.x_max),
        value: normalizeValue(row?.value),
        remark: normalizeValue(row?.remark),
      }))
      .filter(row =>
        !isEmptyRuleRow(row, ["matchKey", "xMin", "xMax", "value", "remark"]),
      )

    return nextRows.length ? nextRows : [createTemplateRow(ruleType)]
  }

  if (ruleType === "enum_pair") {
    const nextRows = rows
      .map((row, index) => ({
        id: row?.id || createTableRowId(tableId, index),
        matchKey: normalizeValue(row?.matchKey ?? row?.match_key),
        matchKey2: normalizeValue(row?.matchKey2 ?? row?.match_key_2),
        value: normalizeValue(row?.value),
        remark: normalizeValue(row?.remark),
      }))
      .filter(row =>
        !isEmptyRuleRow(row, ["matchKey", "matchKey2", "value", "remark"]),
      )

    return nextRows.length ? nextRows : [createTemplateRow(ruleType)]
  }

  return [createTemplateRow("fixed")]
}

function normalizeTemplateMatrix(tableId, table = {}) {
  const columns = Array.isArray(table?.columns)
    ? table.columns
        .map((column, index) => ({
          id: column?.id || createTableColumnId(tableId, index),
          label: normalizeValue(column?.label),
        }))
        .filter(column => column.label)
    : []

  const nextColumns = columns.length
    ? columns
    : [createTemplateMatrixColumn(), createTemplateMatrixColumn()]

  const rows = Array.isArray(table?.rows)
    ? table.rows
        .map((row, rowIndex) => ({
          id: row?.id || createTableRowId(tableId, rowIndex),
          label: normalizeValue(row?.label),
          values: Object.fromEntries(
            nextColumns.map(column => [
              column.id,
              normalizeValue(row?.values?.[column.id]),
            ]),
          ),
        }))
        .filter(row =>
          row.label
          || Object.values(row.values).some(value => normalizeValue(value)),
        )
    : []

  const nextRows = rows.length
    ? rows
    : [
        createTemplateMatrixRow(nextColumns),
        createTemplateMatrixRow(nextColumns),
      ]

  return {
    columns: nextColumns,
    rows: nextRows,
  }
}

export function normalizeTemplateTable(table = {}, index = 0) {
  const baseTable = createTemplateTable(
    normalizeRuleType(table.ruleType || table.rule_type),
  )
  const id = normalizeValue(table.id) || `template_${index + 1}`
  const sheetName = normalizeSheetName(
    table.sheetName || table.sheet_name,
    `tpl_${id}`,
  )
  const ruleType = normalizeRuleType(table.ruleType || table.rule_type)

  const nextTable = {
    ...baseTable,
    id,
    name: normalizeValue(table.name),
    sheetName,
    country: normalizeValue(table.country),
    platform: normalizeValue(table.platform),
    ruleType,
    valueUnit: normalizeValue(table.valueUnit || table.value_unit),
    sourceUrl: normalizeValue(table.sourceUrl || table.source_url),
    remark: normalizeValue(table.remark),
    xAxisLabel: normalizeValue(table.xAxisLabel || table.x_axis_label)
      || baseTable.xAxisLabel
      || "售价",
    yAxisLabel: normalizeValue(table.yAxisLabel || table.y_axis_label)
      || baseTable.yAxisLabel
      || "重量",
    enabled: normalizeValue(table.enabled) === "0" ? 0 : 1,
    sort: normalizeSort(table.sort, index + 1),
  }

  if (ruleType === "range_2d") {
    return {
      ...nextTable,
      ...normalizeTemplateMatrix(id, table),
    }
  }

  return {
    ...nextTable,
    rows: normalizeTemplateRows(ruleType, table.rows, id),
    columns: [],
  }
}

function createTemplateTablesSheet(tables = []) {
  return XLSX.utils.json_to_sheet(
    tables.map((table, index) => {
      const normalizedTable = normalizeTemplateTable(
        table,
        index,
      )

      return {
        id: normalizedTable.id,
        name: normalizedTable.name,
        sheet_name: normalizedTable.sheetName,
        rule_type: normalizedTable.ruleType,
        country: normalizedTable.country,
        platform: normalizedTable.platform,
        value_unit: normalizedTable.valueUnit,
        x_axis_label: normalizedTable.ruleType === "range_2d"
          ? normalizedTable.xAxisLabel
          : "",
        y_axis_label: normalizedTable.ruleType === "range_2d"
          ? normalizedTable.yAxisLabel
          : "",
        source_url: normalizedTable.sourceUrl,
        enabled: normalizedTable.enabled,
        sort: normalizedTable.sort || index + 1,
        remark: normalizedTable.remark,
      }
    }),
    {
      header: TEMPLATE_TABLE_COLUMNS,
    },
  )
}

export function readTemplateTablesSheet(workbook) {
  const worksheet = workbook?.Sheets?.[TEMPLATE_TABLES_SHEET_NAME]

  if (!worksheet) {
    return []
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
  })

  return XEUtils.orderBy(
    rows.map(normalizeTemplateTable),
    ["sort", "name"],
    ["asc", "asc"],
  )
}

function readTemplateMatrixSheet(table, worksheet) {
  const matrix = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
  })

  if (!Array.isArray(matrix) || !matrix.length) {
    return normalizeTemplateTable(table)
  }

  const [headerRow = [], ...bodyRows] = matrix
  const axisValue = normalizeValue(headerRow[0])
  const [derivedYAxisLabel = "", derivedXAxisLabel = ""]
    = axisValue.split("\\")
  const columns = headerRow
    .slice(1)
    .map((label, index) => ({
      id: createTableColumnId(table.id, index),
      label: normalizeValue(label),
    }))
    .filter(column => column.label)
  const rows = bodyRows
    .map((cells, rowIndex) => ({
      id: createTableRowId(table.id, rowIndex),
      label: normalizeValue(cells?.[0]),
      values: Object.fromEntries(
        columns.map((column, columnIndex) => [
          column.id,
          normalizeValue(cells?.[columnIndex + 1]),
        ]),
      ),
    }))
    .filter(row =>
      row.label
      || Object.values(row.values).some(value => normalizeValue(value)),
    )

  return normalizeTemplateTable({
    ...table,
    xAxisLabel: table.xAxisLabel || derivedXAxisLabel,
    yAxisLabel: table.yAxisLabel || derivedYAxisLabel,
    columns,
    rows,
  })
}

function readTemplateRuleSheet(table, worksheet) {
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
  })

  return normalizeTemplateTable({
    ...table,
    rows,
  })
}

export function readTemplateWorkbook(workbook) {
  const tables = readTemplateTablesSheet(workbook)

  return tables.map((table, index) => {
    const worksheet = workbook?.Sheets?.[table.sheetName]

    if (!worksheet) {
      return normalizeTemplateTable(table, index)
    }

    if (table.ruleType === "range_2d") {
      return readTemplateMatrixSheet(table, worksheet)
    }

    return readTemplateRuleSheet(table, worksheet)
  })
}

function createRuleSheet(table) {
  if (table.ruleType === "range_2d") {
    const aoa = [
      [
        `${table.yAxisLabel || "重量"}\\${table.xAxisLabel || "售价"}`,
        ...table.columns.map(column => column.label),
      ],
      ...table.rows.map(row => [
        row.label,
        ...table.columns.map(column => row.values?.[column.id] ?? ""),
      ]),
    ]

    return XLSX.utils.aoa_to_sheet(aoa)
  }

  if (table.ruleType === "fixed") {
    return XLSX.utils.json_to_sheet(
      table.rows.map(row => ({
        value: row.value,
        remark: row.remark,
      })),
      { header: ["value", "remark"] },
    )
  }

  if (table.ruleType === "range_1d") {
    return XLSX.utils.json_to_sheet(
      table.rows.map(row => ({
        x_min: row.xMin,
        x_max: row.xMax,
        value: row.value,
        remark: row.remark,
      })),
      { header: ["x_min", "x_max", "value", "remark"] },
    )
  }

  if (table.ruleType === "enum") {
    return XLSX.utils.json_to_sheet(
      table.rows.map(row => ({
        match_key: row.matchKey,
        value: row.value,
        remark: row.remark,
      })),
      { header: ["match_key", "value", "remark"] },
    )
  }

  if (table.ruleType === "enum_pair") {
    return XLSX.utils.json_to_sheet(
      table.rows.map(row => ({
        match_key: row.matchKey,
        match_key_2: row.matchKey2,
        value: row.value,
        remark: row.remark,
      })),
      { header: ["match_key", "match_key_2", "value", "remark"] },
    )
  }

  return XLSX.utils.json_to_sheet(
    table.rows.map(row => ({
      match_key: row.matchKey,
      x_min: row.xMin,
      x_max: row.xMax,
      value: row.value,
      remark: row.remark,
    })),
    { header: ["match_key", "x_min", "x_max", "value", "remark"] },
  )
}

function removeSheet(workbook, sheetName) {
  delete workbook.Sheets[sheetName]
  workbook.SheetNames = workbook.SheetNames.filter(name => name !== sheetName)
}

export function writeTemplateWorkbook(workbook, tables = []) {
  const nextWorkbook = workbook || XLSX.utils.book_new()
  const previousTables = readTemplateTablesSheet(nextWorkbook)
  const normalizedTables = XEUtils.orderBy(
    tables.map((table, index) => normalizeTemplateTable(table, index)),
    ["sort", "name"],
    ["asc", "asc"],
  )
  const previousSheetNames = previousTables
    .map(table => table.sheetName)
    .filter(Boolean)
  const nextSheetNames = normalizedTables
    .map(table => table.sheetName)
    .filter(Boolean)

  previousSheetNames
    .filter(sheetName => !nextSheetNames.includes(sheetName))
    .forEach(sheetName => removeSheet(nextWorkbook, sheetName))

  nextWorkbook.Sheets[TEMPLATE_TABLES_SHEET_NAME] = createTemplateTablesSheet(
    normalizedTables,
  )

  if (!nextWorkbook.SheetNames.includes(TEMPLATE_TABLES_SHEET_NAME)) {
    nextWorkbook.SheetNames.push(TEMPLATE_TABLES_SHEET_NAME)
  }

  normalizedTables.forEach((table) => {
    nextWorkbook.Sheets[table.sheetName] = createRuleSheet(table)

    if (!nextWorkbook.SheetNames.includes(table.sheetName)) {
      nextWorkbook.SheetNames.push(table.sheetName)
    }
  })

  return nextWorkbook
}

export async function importTemplatesFromExcel(file) {
  const workbook = await readWorkbookFromFile(file)

  return readTemplateWorkbook(workbook)
}

export function importTemplatesFromBytes(input) {
  const workbook = readWorkbookFromBytes(input)

  return readTemplateWorkbook(workbook)
}

export function exportTemplatesToBytes(tables = [], workbook) {
  const nextWorkbook = writeTemplateWorkbook(workbook, tables)

  return exportWorkbookToBytes(nextWorkbook)
}
