import XEUtils from "xe-utils"
import * as XLSX from "xlsx"

export const APP_OPTIONS_SHEET_NAME = "app_options"
export const APP_OPTION_GROUPS_SHEET_NAME = "app_option_groups"

export const APP_OPTION_GROUP_COLUMNS = [
  "key",
  "title",
  "description",
  "sort",
  "enabled",
  "remark",
]

export const APP_OPTION_COLUMNS = [
  "id",
  "group_key",
  "label",
  "value",
  "sort",
  "enabled",
  "remark",
]

export function normalizeAppOptionGroup(item = {}, index = 0) {
  const key = normalizeValue(item.key || item.groupKey || item.group_key)

  return {
    key,
    title: normalizeValue(item.title) || key,
    description: normalizeValue(item.description),
    sort: normalizeSort(item.sort, index + 1),
    enabled: normalizeValue(item.enabled) === "0" ? 0 : 1,
    remark: normalizeValue(item.remark),
  }
}

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

export function normalizeAppOption(item = {}, index = 0) {
  const groupKey = normalizeValue(item.groupKey || item.group_key)
  const value = normalizeValue(item.value)
  const label = normalizeValue(item.label || value)
  const id
    = normalizeValue(item.id)
      || [groupKey, value || label].filter(Boolean).join("__")

  return {
    id,
    groupKey,
    label,
    value: value || label,
    sort: normalizeSort(item.sort, index + 1),
    enabled: normalizeValue(item.enabled) === "0" ? 0 : 1,
    remark: normalizeValue(item.remark),
  }
}

function isValidOption(item = {}) {
  return Boolean(item.groupKey && item.label && item.value)
}

function isValidOptionGroup(item = {}) {
  return Boolean(item.key && item.title)
}

export function readAppOptionGroupsSheet(workbook) {
  const worksheet = workbook?.Sheets?.[APP_OPTION_GROUPS_SHEET_NAME]

  if (!worksheet) {
    return []
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
  })

  return XEUtils.orderBy(
    rows
      .map(normalizeAppOptionGroup)
      .filter(isValidOptionGroup),
    ["sort", "title"],
    ["asc", "asc"],
  )
}

export function readAppOptionsSheet(workbook) {
  const worksheet = workbook?.Sheets?.[APP_OPTIONS_SHEET_NAME]

  if (!worksheet) {
    return []
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
  })

  return XEUtils.orderBy(
    rows
      .map(normalizeAppOption)
      .filter(isValidOption),
    ["groupKey", "sort", "label"],
    ["asc", "asc", "asc"],
  )
}

export function createAppOptionsSheet(list = []) {
  const rows = list
    .map(normalizeAppOption)
    .filter(isValidOption)
    .map(item => ({
      id: item.id,
      group_key: item.groupKey,
      label: item.label,
      value: item.value,
      sort: item.sort,
      enabled: item.enabled,
      remark: item.remark,
    }))

  return XLSX.utils.json_to_sheet(rows, {
    header: APP_OPTION_COLUMNS,
  })
}

export function createAppOptionGroupsSheet(list = []) {
  const rows = list
    .map(normalizeAppOptionGroup)
    .filter(isValidOptionGroup)
    .map(item => ({
      key: item.key,
      title: item.title,
      description: item.description,
      sort: item.sort,
      enabled: item.enabled,
      remark: item.remark,
    }))

  return XLSX.utils.json_to_sheet(rows, {
    header: APP_OPTION_GROUP_COLUMNS,
  })
}

export function writeAppOptionsWorkbook(workbook, payload = {}) {
  const nextWorkbook = workbook || XLSX.utils.book_new()
  const groups = Array.isArray(payload.groups) ? payload.groups : []
  const options = Array.isArray(payload.options) ? payload.options : []

  nextWorkbook.Sheets[APP_OPTION_GROUPS_SHEET_NAME]
    = createAppOptionGroupsSheet(groups)
  nextWorkbook.Sheets[APP_OPTIONS_SHEET_NAME] = createAppOptionsSheet(options)

  if (!nextWorkbook.SheetNames.includes(APP_OPTION_GROUPS_SHEET_NAME)) {
    nextWorkbook.SheetNames.push(APP_OPTION_GROUPS_SHEET_NAME)
  }

  if (!nextWorkbook.SheetNames.includes(APP_OPTIONS_SHEET_NAME)) {
    nextWorkbook.SheetNames.push(APP_OPTIONS_SHEET_NAME)
  }

  return nextWorkbook
}
