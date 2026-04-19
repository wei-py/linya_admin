import XEUtils from "xe-utils"
import * as XLSX from "xlsx"

import {
  createTemplateDimension,
  createTemplateMatrixColumn,
  createTemplateMatrixRow,
  createTemplateRecord,
  createTemplateResultColumn,
  createTemplateRow,
  createTemplateTable,
  inferTemplateRuleType,
  mergeTemplateTableUiConfig,
} from "@/constants/template"
import {
  exportWorkbookToBytes,
  readWorkbookFromBytes,
  readWorkbookFromFile,
} from "@/utils/excel/workbook"

export const TEMPLATE_TABLES_SHEET_NAME = "template_tables"
export const TEMPLATE_UI_CONFIG_SHEET_NAME = "template_ui_config"
export const TEMPLATE_DIMENSIONS_SHEET_NAME = "template_dimensions"
export const TEMPLATE_RESULT_COLUMNS_SHEET_NAME = "template_result_columns"

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
  "ui_config",
]

export const TEMPLATE_UI_CONFIG_COLUMNS = [
  "table_id",
  "target_type",
  "target_key",
  "prop_key",
  "prop_value",
  "sort",
]

export const TEMPLATE_DIMENSION_COLUMNS = [
  "table_id",
  "dimension_id",
  "field_name",
  "kind",
  "sort",
]

export const TEMPLATE_RESULT_COLUMN_COLUMNS = [
  "table_id",
  "column_id",
  "label",
  "type",
  "sort",
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

function normalizeTemplateUiConfig(value, tableId = "") {
  if (!value) {
    return mergeTemplateTableUiConfig(tableId)
  }

  let parsedValue = value

  if (typeof value === "string") {
    try {
      parsedValue = JSON.parse(value)
    }
    catch {
      parsedValue = {}
    }
  }

  return mergeTemplateTableUiConfig(
    tableId,
    XEUtils.isPlainObject(parsedValue) ? parsedValue : {},
  )
}

function createEmptyTemplateUiConfig() {
  return {
    columnOverrides: {},
  }
}

function createDimensionValueKey(dimension) {
  return dimension?.id || ""
}

function createRangeMinKey(dimension) {
  return `${dimension?.id || ""}__min`
}

function createRangeMaxKey(dimension) {
  return `${dimension?.id || ""}__max`
}

function getLegacyDimensionFieldName(
  ruleType,
  index,
  table = {},
  uiConfig = {},
) {
  const columnOverrides = uiConfig?.columnOverrides || {}

  if (ruleType === "range_2d") {
    return index === 0
      ? normalizeValue(table.xAxisLabel || "售价")
      : normalizeValue(table.yAxisLabel || "重量")
  }

  if (ruleType === "range_1d") {
    return normalizeValue(table.xAxisLabel || "参数 1")
  }

  if (ruleType === "enum") {
    return normalizeValue(columnOverrides.matchKey?.fieldName || "参数 1")
  }

  if (ruleType === "enum_pair") {
    return normalizeValue(
      index === 0
        ? columnOverrides.matchKey?.fieldName || "参数 1"
        : columnOverrides.matchKey2?.fieldName || "参数 2",
    )
  }

  if (ruleType === "enum_range") {
    return normalizeValue(
      index === 0
        ? columnOverrides.matchKey?.fieldName || "参数 1"
        : table.xAxisLabel || "参数 2",
    )
  }

  return `参数 ${index + 1}`
}

function normalizeTemplateDimensions(table = {}, tableId = "", uiConfig = {}) {
  const sourceDimensions = Array.isArray(table.dimensions)
    ? table.dimensions
    : []

  if (sourceDimensions.length) {
    return sourceDimensions.map((dimension, index) => ({
      id:
        normalizeValue(dimension.id)
        || `${tableId}__dimension__${index + 1}`,
      fieldName: normalizeValue(dimension.fieldName || dimension.field_name)
        || `参数 ${index + 1}`,
      kind: normalizeValue(dimension.kind) === "range" ? "range" : "enum",
      sort: normalizeSort(dimension.sort, index + 1),
    }))
  }

  const ruleType = normalizeRuleType(table.ruleType || table.rule_type)
  const kindList = []

  if (ruleType === "range_1d") {
    kindList.push("range")
  }
  else if (ruleType === "range_2d") {
    kindList.push("range", "range")
  }
  else if (ruleType === "enum") {
    kindList.push("enum")
  }
  else if (ruleType === "enum_pair") {
    kindList.push("enum", "enum")
  }
  else if (ruleType === "enum_range") {
    kindList.push("enum", "range")
  }

  return kindList.map((kind, index) => ({
    ...createTemplateDimension(kind),
    id: `${tableId}__dimension__${index + 1}`,
    fieldName: getLegacyDimensionFieldName(ruleType, index, table, uiConfig),
    sort: index + 1,
  }))
}

function normalizeTemplateResultColumns(table = {}, tableId = "") {
  const sourceColumns = Array.isArray(table.resultColumns)
    ? table.resultColumns
    : Array.isArray(table.result_columns)
      ? table.result_columns
      : []

  if (sourceColumns.length) {
    return sourceColumns.map((column, index) => ({
      id: normalizeValue(column.id) || `${tableId}__result__${index + 1}`,
      label: normalizeValue(column.label) || `结果值 ${index + 1}`,
      type: normalizeValue(column.type) || "number",
      sort: normalizeSort(column.sort, index + 1),
    }))
  }

  return [
    {
      ...createTemplateResultColumn(),
      id: `${tableId}__result__1`,
      label: normalizeValue(table.resultLabel || table.result_label) || "结果值",
      type: "number",
      sort: 1,
    },
  ]
}

function buildLegacyRecordsFromRows(
  table = {},
  dimensions = [],
  resultColumns = [],
  tableId = "",
) {
  const ruleType = normalizeRuleType(table.ruleType || table.rule_type)
  const rows = Array.isArray(table.rows) ? table.rows : []
  const resultColumn = resultColumns[0]

  if (!resultColumn) {
    return [createTemplateRecord(dimensions, resultColumns)]
  }

  if (ruleType === "fixed") {
    const nextRecords = rows
      .map((row, index) => ({
        id: row?.id || `${tableId}__record__${index + 1}`,
        values: {
          [resultColumn.id]: normalizeValue(row?.value),
        },
        remark: normalizeValue(row?.remark),
      }))
      .filter(record =>
        Object.values(record.values).some(value => normalizeValue(value))
        || record.remark,
      )

    return nextRecords.length
      ? nextRecords
      : [createTemplateRecord(dimensions, resultColumns)]
  }

  if (ruleType === "range_2d") {
    const columns = Array.isArray(table.columns) ? table.columns : []
    const matrixRows = Array.isArray(table.rows) ? table.rows : []
    const xDimension = dimensions[0]
    const yDimension = dimensions[1]

    const getMin = (labels, index) =>
      index === 0 ? "0" : normalizeValue(labels[index - 1]?.label)
    const getMax = (labels, index) => normalizeValue(labels[index]?.label)

    const nextRecords = []

    matrixRows.forEach((row, rowIndex) => {
      columns.forEach((column, columnIndex) => {
        const cellValue = normalizeValue(row?.values?.[column.id])

        if (!cellValue) {
          return
        }

        nextRecords.push({
          id: `${tableId}__record__${rowIndex + 1}_${columnIndex + 1}`,
          values: {
            [createRangeMinKey(xDimension)]: getMin(columns, columnIndex),
            [createRangeMaxKey(xDimension)]: getMax(columns, columnIndex),
            [createRangeMinKey(yDimension)]: getMin(matrixRows, rowIndex),
            [createRangeMaxKey(yDimension)]: getMax(matrixRows, rowIndex),
            [resultColumn.id]: cellValue,
          },
          remark: "",
        })
      })
    })

    return nextRecords.length
      ? nextRecords
      : [createTemplateRecord(dimensions, resultColumns)]
  }

  const nextRecords = rows
    .map((row, index) => {
      const values = {}

      dimensions.forEach((dimension, dimensionIndex) => {
        if (dimension.kind === "enum") {
          const legacyKey = dimensionIndex === 0 ? "matchKey" : "matchKey2"

          values[createDimensionValueKey(dimension)]
            = normalizeValue(
              row?.[legacyKey]
              ?? row?.[
                legacyKey === "matchKey" ? "match_key" : "match_key_2"
              ],
            )
          return
        }

        const minKey = dimensionIndex === 0 ? "xMin" : "yMin"
        const maxKey = dimensionIndex === 0 ? "xMax" : "yMax"

        values[createRangeMinKey(dimension)]
          = normalizeValue(
            row?.[minKey] ?? row?.[minKey === "xMin" ? "x_min" : "y_min"],
          )
        values[createRangeMaxKey(dimension)]
          = normalizeValue(
            row?.[maxKey] ?? row?.[maxKey === "xMax" ? "x_max" : "y_max"],
          )
      })

      values[resultColumn.id] = normalizeValue(row?.value)

      return {
        id: row?.id || `${tableId}__record__${index + 1}`,
        values,
        remark: normalizeValue(row?.remark),
      }
    })
    .filter(record =>
      Object.values(record.values).some(value => normalizeValue(value))
      || record.remark,
    )

  return nextRecords.length
    ? nextRecords
    : [createTemplateRecord(dimensions, resultColumns)]
}

function normalizeTemplateRecords(
  table = {},
  dimensions = [],
  resultColumns = [],
  tableId = "",
) {
  const sourceRecords = Array.isArray(table.records) ? table.records : []

  if (sourceRecords.length) {
    return sourceRecords.map((record, index) => ({
      id: normalizeValue(record.id) || `${tableId}__record__${index + 1}`,
      values: Object.fromEntries([
        ...dimensions.flatMap(dimension =>
          dimension.kind === "range"
            ? [
                [
                  createRangeMinKey(dimension),
                  normalizeValue(
                    record?.values?.[createRangeMinKey(dimension)],
                  ),
                ],
                [
                  createRangeMaxKey(dimension),
                  normalizeValue(
                    record?.values?.[createRangeMaxKey(dimension)],
                  ),
                ],
              ]
            : [
                [
                  createDimensionValueKey(dimension),
                  normalizeValue(
                    record?.values?.[createDimensionValueKey(dimension)],
                  ),
                ],
              ],
        ),
        ...resultColumns.map(column => [
          column.id,
          normalizeValue(record?.values?.[column.id]),
        ]),
      ]),
      remark: normalizeValue(record.remark),
    }))
  }

  return buildLegacyRecordsFromRows(table, dimensions, resultColumns, tableId)
}

function normalizeTemplateUiConfigRows(rows = [], tableId = "") {
  const nextConfig = createEmptyTemplateUiConfig()

  rows
    .slice()
    .sort((a, b) => normalizeSort(a.sort, 0) - normalizeSort(b.sort, 0))
    .forEach((row) => {
      const targetType = normalizeValue(row.target_type || row.targetType)
      const targetKey = normalizeValue(row.target_key || row.targetKey)
      const propKey = normalizeValue(row.prop_key || row.propKey)
      const propValue = normalizeValue(row.prop_value || row.propValue)

      if (!targetType || !propKey) {
        return
      }

      if (targetType === "column" && targetKey) {
        nextConfig.columnOverrides[targetKey] = {
          ...(nextConfig.columnOverrides[targetKey] || {}),
          [propKey]: propValue,
        }
      }
    })

  return mergeTemplateTableUiConfig(tableId, nextConfig)
}

function createTemplateUiConfigRows(tables = []) {
  const rows = []

  tables.forEach((table) => {
    const normalizedTable = normalizeTemplateTable(table)
    const uiConfig = normalizedTable.uiConfig || createEmptyTemplateUiConfig()
    let sort = 1

    Object.entries(uiConfig.columnOverrides || {}).forEach(
      ([targetKey, config]) => {
        Object.entries(config || {}).forEach(([propKey, propValue]) => {
          if (!normalizeValue(propValue)) {
            return
          }

          rows.push({
            table_id: normalizedTable.id,
            target_type: "column",
            target_key: targetKey,
            prop_key: propKey,
            prop_value: normalizeValue(propValue),
            sort: sort++,
          })
        })
      },
    )
  })

  return rows
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
  const uiConfig = normalizeTemplateUiConfig(
    table.uiConfig || table.ui_config,
    id,
  )
  const dimensions = normalizeTemplateDimensions(table, id, uiConfig)
  const resultColumns = normalizeTemplateResultColumns(table, id)
  const records = normalizeTemplateRecords(table, dimensions, resultColumns, id)
  const inferredRuleType = inferTemplateRuleType(dimensions)

  const nextTable = {
    ...baseTable,
    id,
    name: normalizeValue(table.name),
    sheetName,
    country: normalizeValue(table.country),
    platform: normalizeValue(table.platform),
    ruleType: inferredRuleType === "generic" ? ruleType : inferredRuleType,
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
    uiConfig,
    dimensions,
    resultColumns,
    records,
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
        ui_config: JSON.stringify(normalizedTable.uiConfig || {}),
      }
    }),
    {
      header: TEMPLATE_TABLE_COLUMNS,
    },
  )
}

function createTemplateUiConfigSheet(tables = []) {
  return XLSX.utils.json_to_sheet(createTemplateUiConfigRows(tables), {
    header: TEMPLATE_UI_CONFIG_COLUMNS,
  })
}

function createTemplateDimensionsSheet(tables = []) {
  return XLSX.utils.json_to_sheet(
    tables.flatMap((table) => {
      const normalizedTable = normalizeTemplateTable(table)

      return normalizedTable.dimensions.map((dimension, index) => ({
        table_id: normalizedTable.id,
        dimension_id: dimension.id,
        field_name: dimension.fieldName,
        kind: dimension.kind,
        sort: normalizeSort(dimension.sort, index + 1),
      }))
    }),
    { header: TEMPLATE_DIMENSION_COLUMNS },
  )
}

function createTemplateResultColumnsSheet(tables = []) {
  return XLSX.utils.json_to_sheet(
    tables.flatMap((table) => {
      const normalizedTable = normalizeTemplateTable(table)

      return normalizedTable.resultColumns.map((column, index) => ({
        table_id: normalizedTable.id,
        column_id: column.id,
        label: column.label,
        type: column.type,
        sort: normalizeSort(column.sort, index + 1),
      }))
    }),
    { header: TEMPLATE_RESULT_COLUMN_COLUMNS },
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

export function readTemplateUiConfigSheet(workbook) {
  const worksheet = workbook?.Sheets?.[TEMPLATE_UI_CONFIG_SHEET_NAME]

  if (!worksheet) {
    return new Map()
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
  })
  const rowsByTableId = new Map()

  rows.forEach((row) => {
    const tableId = normalizeValue(row.table_id || row.tableId)

    if (!tableId) {
      return
    }

    const nextRows = rowsByTableId.get(tableId) || []

    nextRows.push(row)
    rowsByTableId.set(tableId, nextRows)
  })

  return new Map(
    Array.from(rowsByTableId.entries()).map(([tableId, tableRows]) => [
      tableId,
      normalizeTemplateUiConfigRows(tableRows, tableId),
    ]),
  )
}

function readTemplateDimensionsSheet(workbook) {
  const worksheet = workbook?.Sheets?.[TEMPLATE_DIMENSIONS_SHEET_NAME]

  if (!worksheet) {
    return new Map()
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" })
  const rowsByTableId = new Map()

  rows.forEach((row) => {
    const tableId = normalizeValue(row.table_id)

    if (!tableId) {
      return
    }

    const nextRows = rowsByTableId.get(tableId) || []

    nextRows.push(row)
    rowsByTableId.set(tableId, nextRows)
  })

  return new Map(
    Array.from(rowsByTableId.entries()).map(([tableId, tableRows]) => [
      tableId,
      tableRows
        .slice()
        .sort((a, b) => normalizeSort(a.sort, 0) - normalizeSort(b.sort, 0))
        .map((row, index) => ({
          id: normalizeValue(row.dimension_id) || `${tableId}__dimension__${index + 1}`,
          fieldName: normalizeValue(row.field_name) || `参数 ${index + 1}`,
          kind: normalizeValue(row.kind) === "range" ? "range" : "enum",
          sort: normalizeSort(row.sort, index + 1),
        })),
    ]),
  )
}

function readTemplateResultColumnsSheet(workbook) {
  const worksheet = workbook?.Sheets?.[TEMPLATE_RESULT_COLUMNS_SHEET_NAME]

  if (!worksheet) {
    return new Map()
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" })
  const rowsByTableId = new Map()

  rows.forEach((row) => {
    const tableId = normalizeValue(row.table_id)

    if (!tableId) {
      return
    }

    const nextRows = rowsByTableId.get(tableId) || []

    nextRows.push(row)
    rowsByTableId.set(tableId, nextRows)
  })

  return new Map(
    Array.from(rowsByTableId.entries()).map(([tableId, tableRows]) => [
      tableId,
      tableRows
        .slice()
        .sort((a, b) => normalizeSort(a.sort, 0) - normalizeSort(b.sort, 0))
        .map((row, index) => ({
          id: normalizeValue(row.column_id) || `${tableId}__result__${index + 1}`,
          label: normalizeValue(row.label) || `结果值 ${index + 1}`,
          type: normalizeValue(row.type) || "number",
          sort: normalizeSort(row.sort, index + 1),
        })),
    ]),
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

  const dimensions = Array.isArray(table.dimensions) ? table.dimensions : []
  const resultColumns = Array.isArray(table.resultColumns)
    ? table.resultColumns
    : []

  if (dimensions.length || resultColumns.length) {
    const records = rows
      .map((row, index) => {
        const values = {}

        dimensions.forEach((dimension, index) => {
          if (dimension.kind === "range") {
            values[createRangeMinKey(dimension)]
              = normalizeValue(
                row?.[`${dimension.fieldName}起始`]
                ?? row?.[createRangeMinKey(dimension)]
                ?? row?.[index === 0 ? "x_min" : "y_min"],
              )
            values[createRangeMaxKey(dimension)]
              = normalizeValue(
                row?.[`${dimension.fieldName}结束`]
                ?? row?.[createRangeMaxKey(dimension)]
                ?? row?.[index === 0 ? "x_max" : "y_max"],
              )
            return
          }

          values[createDimensionValueKey(dimension)]
            = normalizeValue(
              row?.[dimension.fieldName]
              ?? row?.[createDimensionValueKey(dimension)]
              ?? row?.[index === 0 ? "match_key" : "match_key_2"],
            )
        })

        resultColumns.forEach((column) => {
          values[column.id]
            = normalizeValue(
              row?.[column.label] ?? row?.[column.id] ?? row?.value,
            )
        })

        return {
          id: normalizeValue(row.id) || `${table.id}__record__${index + 1}`,
          values,
          remark: normalizeValue(row.remark ?? row["备注"]),
        }
      })
      .filter(record =>
        Object.values(record.values).some(value => normalizeValue(value))
        || record.remark,
      )

    return normalizeTemplateTable({
      ...table,
      records,
    })
  }

  return normalizeTemplateTable({
    ...table,
    rows,
  })
}

export function readTemplateWorkbook(workbook) {
  const tables = readTemplateTablesSheet(workbook)
  const uiConfigMap = readTemplateUiConfigSheet(workbook)
  const dimensionsMap = readTemplateDimensionsSheet(workbook)
  const resultColumnsMap = readTemplateResultColumnsSheet(workbook)

  return tables.map((table, index) => {
    const tableWithUiConfig = uiConfigMap.has(table.id)
      ? {
          ...table,
          uiConfig: uiConfigMap.get(table.id),
        }
      : table
    const tableWithSchema = {
      ...tableWithUiConfig,
      dimensions: dimensionsMap.get(table.id) || table.dimensions,
      resultColumns: resultColumnsMap.get(table.id) || table.resultColumns,
    }
    const worksheet = workbook?.Sheets?.[table.sheetName]

    if (!worksheet) {
      return normalizeTemplateTable(tableWithSchema, index)
    }

    if (table.ruleType === "range_2d") {
      return readTemplateMatrixSheet(tableWithSchema, worksheet)
    }

    return readTemplateRuleSheet(tableWithSchema, worksheet)
  })
}

function createRuleSheet(table) {
  const normalizedTable = normalizeTemplateTable(table)
  const header = [
    ...normalizedTable.dimensions.flatMap(dimension =>
      dimension.kind === "range"
        ? [`${dimension.fieldName}起始`, `${dimension.fieldName}结束`]
        : [dimension.fieldName],
    ),
    ...normalizedTable.resultColumns.map(column => column.label),
    "备注",
  ]
  const rows = normalizedTable.records.map((record) => {
    const nextRow = {}

    normalizedTable.dimensions.forEach((dimension) => {
      if (dimension.kind === "range") {
        nextRow[`${dimension.fieldName}起始`]
          = record.values?.[createRangeMinKey(dimension)] ?? ""
        nextRow[`${dimension.fieldName}结束`]
          = record.values?.[createRangeMaxKey(dimension)] ?? ""
        return
      }

      nextRow[dimension.fieldName]
        = record.values?.[createDimensionValueKey(dimension)] ?? ""
    })

    normalizedTable.resultColumns.forEach((column) => {
      nextRow[column.label] = record.values?.[column.id] ?? ""
    })

    nextRow["备注"] = record.remark || ""

    return nextRow
  })

  return XLSX.utils.json_to_sheet(rows, { header })
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
  nextWorkbook.Sheets[TEMPLATE_UI_CONFIG_SHEET_NAME]
    = createTemplateUiConfigSheet(normalizedTables)
  nextWorkbook.Sheets[TEMPLATE_DIMENSIONS_SHEET_NAME]
    = createTemplateDimensionsSheet(normalizedTables)
  nextWorkbook.Sheets[TEMPLATE_RESULT_COLUMNS_SHEET_NAME]
    = createTemplateResultColumnsSheet(normalizedTables)

  if (!nextWorkbook.SheetNames.includes(TEMPLATE_TABLES_SHEET_NAME)) {
    nextWorkbook.SheetNames.push(TEMPLATE_TABLES_SHEET_NAME)
  }

  if (!nextWorkbook.SheetNames.includes(TEMPLATE_UI_CONFIG_SHEET_NAME)) {
    nextWorkbook.SheetNames.push(TEMPLATE_UI_CONFIG_SHEET_NAME)
  }

  if (!nextWorkbook.SheetNames.includes(TEMPLATE_DIMENSIONS_SHEET_NAME)) {
    nextWorkbook.SheetNames.push(TEMPLATE_DIMENSIONS_SHEET_NAME)
  }

  if (!nextWorkbook.SheetNames.includes(TEMPLATE_RESULT_COLUMNS_SHEET_NAME)) {
    nextWorkbook.SheetNames.push(TEMPLATE_RESULT_COLUMNS_SHEET_NAME)
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
