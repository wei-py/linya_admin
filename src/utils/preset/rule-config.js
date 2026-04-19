export const presetRuleModeOptions = [
  { title: "查表规则", value: "table" },
  { title: "条件规则", value: "condition" },
  { title: "高级规则", value: "advanced" },
]

export const presetRuleFieldOptions = [
  { title: "折后售价", value: "折后售价" },
  { title: "折前价格", value: "折前价格" },
  { title: "收入", value: "收入" },
  { title: "利润率", value: "利润率" },
  { title: "净利润", value: "净利润" },
  { title: "重量", value: "重量" },
  { title: "类目", value: "类目" },
  { title: "广告类型", value: "广告类型" },
  { title: "物流", value: "物流" },
  { title: "是否包邮", value: "是否包邮" },
]

export const presetRuleOperatorOptions = [
  { title: "为真", value: "truthy" },
  { title: "等于", value: "eq" },
  { title: "不等于", value: "neq" },
  { title: "大于", value: "gt" },
  { title: "大于等于", value: "gte" },
  { title: "小于", value: "lt" },
  { title: "小于等于", value: "lte" },
]

export const presetRuleActionKindOptions = [
  { title: "固定值", value: "fixed" },
  { title: "查表", value: "table" },
]

function normalizeValue(value) {
  return String(value ?? "").trim()
}

export function normalizePresetRuleMode(mode) {
  if (["table", "condition", "advanced"].includes(mode)) {
    return mode
  }

  return "table"
}

export function createDefaultRuleAction(kind = "fixed") {
  return {
    kind: kind === "table" ? "table" : "fixed",
    value: "",
    tableId: "",
    args: [],
  }
}

export function createDefaultRuleConfig(mode = "table") {
  const nextMode = normalizePresetRuleMode(mode)

  if (nextMode === "condition") {
    return {
      field: "是否包邮",
      operator: "truthy",
      compareValue: "",
      thenAction: createDefaultRuleAction("fixed"),
      elseAction: createDefaultRuleAction("table"),
    }
  }

  if (nextMode === "advanced") {
    return {
      expression: "",
    }
  }

  return {
    tableId: "",
    args: [],
  }
}

function normalizeActionKind(kind) {
  return kind === "table" ? "table" : "fixed"
}

export function getTableArgCount(table) {
  if (!table) {
    return 0
  }

  if (Array.isArray(table.dimensions) && table.dimensions.length) {
    return table.dimensions.length
  }

  return 0
}

export function getTableArgLabels(table) {
  if (!table) {
    return []
  }

  if (Array.isArray(table.dimensions) && table.dimensions.length) {
    return table.dimensions.map(
      (dimension, index) =>
        normalizeValue(dimension.fieldName) || `参数 ${index + 1}`,
    )
  }

  return []
}

function normalizeArgs(args = [], count = 0) {
  const normalizedArgs = Array.isArray(args)
    ? args.map(arg => normalizeValue(arg))
    : []

  return Array.from({ length: count }, (_, index) => normalizedArgs[index] || "")
}

export function normalizeRuleAction(action = {}, templateTables = []) {
  const nextKind = normalizeActionKind(action.kind)
  const targetTable = templateTables.find(
    table => table.id === normalizeValue(action.tableId),
  )

  if (nextKind === "fixed") {
    return {
      kind: "fixed",
      value: normalizeValue(action.value),
      tableId: "",
      args: [],
    }
  }

  return {
    kind: "table",
    value: normalizeValue(action.value),
    tableId: targetTable?.id || normalizeValue(action.tableId),
    args: normalizeArgs(action.args, getTableArgCount(targetTable)),
  }
}

export function normalizeRuleConfig(mode, config = {}, templateTables = []) {
  const nextMode = normalizePresetRuleMode(mode)

  if (nextMode === "condition") {
    return {
      field: normalizeValue(config.field) || "是否包邮",
      operator: normalizeValue(config.operator) || "truthy",
      compareValue: normalizeValue(config.compareValue),
      thenAction: normalizeRuleAction(config.thenAction, templateTables),
      elseAction: normalizeRuleAction(config.elseAction, templateTables),
    }
  }

  if (nextMode === "advanced") {
    return {
      expression: normalizeValue(config.expression),
    }
  }

  const targetTable = templateTables.find(
    table => table.id === normalizeValue(config.tableId),
  )

  return {
    tableId: targetTable?.id || normalizeValue(config.tableId),
    args: normalizeArgs(config.args, getTableArgCount(targetTable)),
  }
}

export function parseRuleConfig(
  value,
  mode = "table",
  templateTables = [],
) {
  if (!value) {
    return createDefaultRuleConfig(mode)
  }

  if (typeof value === "object") {
    return normalizeRuleConfig(mode, value, templateTables)
  }

  try {
    return normalizeRuleConfig(mode, JSON.parse(value), templateTables)
  }
  catch {
    return createDefaultRuleConfig(mode)
  }
}

export function serializeRuleConfig(config) {
  return JSON.stringify(config || {})
}

function wrapField(field) {
  return field ? `{${field}}` : "{字段}"
}

function findTableName(templateTables, tableId) {
  return (
    templateTables.find(table => table.id === tableId)?.name || "未命名规则表"
  )
}

function buildTableCall(tableId, args = [], templateTables = []) {
  if (!tableId) {
    return "查表(\"未选择规则表\")"
  }

  const tableName = findTableName(templateTables, tableId)
  const normalizedArgs = args
    .map(arg => wrapField(arg))
    .filter(Boolean)

  if (!normalizedArgs.length) {
    return `查表("${tableName}")`
  }

  return `查表("${tableName}", ${normalizedArgs.join(", ")})`
}

function buildActionPreview(action, templateTables = []) {
  if (!action) {
    return "0"
  }

  if (action.kind === "table") {
    return buildTableCall(action.tableId, action.args, templateTables)
  }

  return normalizeValue(action.value) || "0"
}

function buildConditionExpression(config, templateTables = []) {
  const fieldRef = wrapField(config.field)
  const thenValue = buildActionPreview(config.thenAction, templateTables)
  const elseValue = buildActionPreview(config.elseAction, templateTables)

  if (config.operator === "truthy") {
    return `if(${fieldRef}, ${thenValue}, ${elseValue})`
  }

  const compareValue = normalizeValue(config.compareValue)
  const operatorMap = {
    eq: "==",
    neq: "!=",
    gt: ">",
    gte: ">=",
    lt: "<",
    lte: "<=",
  }
  const expressionOperator = operatorMap[config.operator] || "=="
  const nextCompareValue = compareValue
    ? `"${compareValue}"`
    : "\"\""

  return `if(${fieldRef} ${expressionOperator} ${nextCompareValue}, ${thenValue}, ${elseValue})`
}

export function buildRulePreview(mode, config, templateTables = []) {
  const nextMode = normalizePresetRuleMode(mode)

  if (nextMode === "condition") {
    return buildConditionExpression(config, templateTables)
  }

  if (nextMode === "advanced") {
    return normalizeValue(config.expression)
  }

  return buildTableCall(config.tableId, config.args, templateTables)
}

export function getRulePrimaryTableId(mode, config) {
  const nextMode = normalizePresetRuleMode(mode)

  if (nextMode === "table") {
    return normalizeValue(config.tableId)
  }

  if (nextMode === "condition") {
    return normalizeValue(
      config.elseAction?.tableId || config.thenAction?.tableId,
    )
  }

  return ""
}

export function getRuleResultUnit(mode, config, templateTables = [], fallback = "") {
  const nextMode = normalizePresetRuleMode(mode)

  if (nextMode === "table") {
    return (
      templateTables.find(table => table.id === config.tableId)?.valueUnit
      || fallback
    )
  }

  if (nextMode === "condition") {
    const tableId
      = config.thenAction?.kind === "table"
        ? config.thenAction.tableId
        : config.elseAction?.kind === "table"
          ? config.elseAction.tableId
          : ""

    return (
      templateTables.find(table => table.id === tableId)?.valueUnit || fallback
    )
  }

  return fallback
}
