function normalizeText(value) {
  return String(value ?? "").trim()
}

function toNumber(value) {
  const nextValue = Number(value)

  return Number.isFinite(nextValue) ? nextValue : 0
}

function parseRangeUpperBound(value) {
  const normalized = normalizeText(value)

  if (!normalized || normalized === "最后区间及以上") {
    return Number.POSITIVE_INFINITY
  }

  const nextValue = Number(normalized)

  return Number.isFinite(nextValue) ? nextValue : Number.POSITIVE_INFINITY
}

export function getTemplateDimensions(table) {
  return Array.isArray(table?.dimensions) ? table.dimensions : []
}

export function getTemplateResultColumns(table) {
  return Array.isArray(table?.resultColumns) ? table.resultColumns : []
}

export function getTemplateRecords(table) {
  return Array.isArray(table?.records) ? table.records : []
}

export function buildTemplateLookupArgsMap(table, args = []) {
  const dimensions = getTemplateDimensions(table)
  const nextMap = {}

  dimensions.forEach((dimension, index) => {
    nextMap[dimension.id] = args[index]
  })

  return nextMap
}

function getRangeMin(record, dimension) {
  return toNumber(record?.values?.[`${dimension.id}__min`])
}

function getRangeMax(record, dimension) {
  return parseRangeUpperBound(record?.values?.[`${dimension.id}__max`])
}

function isEnumDimensionMatched(record, dimension, inputValue) {
  return (
    normalizeText(record?.values?.[dimension.id])
    === normalizeText(inputValue)
  )
}

function isRangeDimensionMatched(record, dimension, inputValue) {
  const targetValue = Number(inputValue)

  if (!Number.isFinite(targetValue)) {
    return false
  }

  const min = getRangeMin(record, dimension)
  const max = getRangeMax(record, dimension)

  return targetValue >= min && targetValue <= max
}

export function findTemplateLookupRecord(table, args = []) {
  const dimensions = getTemplateDimensions(table)
  const records = getTemplateRecords(table)
  const argsMap = Array.isArray(args)
    ? buildTemplateLookupArgsMap(table, args)
    : args

  if (!dimensions.length || !records.length) {
    return null
  }

  return (
    records.find((record) => {
      return dimensions.every((dimension) => {
        const inputValue = argsMap?.[dimension.id]

        if (dimension.kind === "range") {
          return isRangeDimensionMatched(record, dimension, inputValue)
        }

        return isEnumDimensionMatched(record, dimension, inputValue)
      })
    }) || null
  )
}

export function getTemplateLookupValue(table, args = [], resultColumnId = "") {
  const resultColumns = getTemplateResultColumns(table)
  const resultColumn = resultColumnId
    ? resultColumns.find(column => column.id === resultColumnId) || null
    : resultColumns[0] || null
  const record = findTemplateLookupRecord(table, args)

  if (!record || !resultColumn) {
    return ""
  }

  return record.values?.[resultColumn.id] ?? ""
}

export function describeTemplateLookupHit(table, args = []) {
  const dimensions = getTemplateDimensions(table)
  const record = findTemplateLookupRecord(table, args)
  const argsMap = Array.isArray(args)
    ? buildTemplateLookupArgsMap(table, args)
    : args

  if (!record) {
    return []
  }

  return dimensions.map((dimension) => {
    if (dimension.kind === "range") {
      const min = normalizeText(record.values?.[`${dimension.id}__min`])
      const max = normalizeText(record.values?.[`${dimension.id}__max`])

      return {
        fieldName: dimension.fieldName,
        kind: "range",
        inputValue: argsMap?.[dimension.id] ?? "",
        matchedLabel: `${min} ~ ${max || "以上"}`,
      }
    }

    return {
      fieldName: dimension.fieldName,
      kind: "enum",
      inputValue: argsMap?.[dimension.id] ?? "",
      matchedLabel: normalizeText(record.values?.[dimension.id]),
    }
  })
}
