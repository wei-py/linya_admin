import XEUtils from "xe-utils"
import * as XLSX from "xlsx"

/**
 * 组合主数据。
 *
 * @typedef {object} PresetGroupItem
 * @property {string} id 组合 ID。
 * @property {string} country 国家名称。
 * @property {string} platform 平台名称。
 * @property {string} country_platform 国家和平台拼接值。
 * @property {number} sort 排序值。
 */

/**
 * 参数项数据。
 *
 * @typedef {object} PresetItem
 * @property {string} id 参数项 ID。
 * @property {string} preset_id 所属组合 ID。
 * @property {string} name 参数名称。
 * @property {string} type 参数类型。
 * @property {string} unit 单位。
 * @property {string} value 值或规则。
 * @property {string} rule_mode 规则模式。
 * @property {string} rule_table_id 绑定的规则表 ID。
 * @property {object} rule_config 规则配置对象。
 * @property {number} sort 排序值。
 */

/**
 * 预设页完整数据。
 *
 * @typedef {PresetGroupItem & { items: PresetItem[] }} PresetRecord
 */

/**
 * 兼容当前页面使用的最小组合数据。
 *
 * @typedef {object} CountryPlatformItem
 * @property {string} country 国家名称。
 * @property {string} platform 平台名称。
 * @property {string} country_platform 国家和平台拼接值。
 */

export const PRESET_GROUPS_SHEET_NAME = "preset_groups"
export const PRESET_ITEMS_SHEET_NAME = "preset_items"
export const COUNTRY_PLATFORM_SHEET_NAME = "country_platform"

export const PRESET_GROUP_COLUMNS = [
  "id",
  "country",
  "platform",
  "country_platform",
  "sort",
]

export const PRESET_ITEM_COLUMNS = [
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

/**
 * 清洗单元格、表单输入。
 *
 * @param {unknown} value 原始值。
 * @returns {string} 去掉前后空格后的字符串。
 */
function normalizeValue(value) {
  return String(value ?? "").trim()
}

/**
 * 清洗排序值。
 *
 * @param {unknown} value 原始排序值。
 * @returns {number} 可用的数字排序值。
 */
function normalizeSort(value) {
  const nextValue = Number(value)

  if (Number.isFinite(nextValue))
    return nextValue

  return 0
}

/**
 * 生成国家与平台拼接值。
 *
 * @param {string} country 国家名称。
 * @param {string} platform 平台名称。
 * @returns {string} 形如 `巴西_美客多` 的组合值。
 */
export function createCountryPlatformValue(country, platform) {
  const normalizedCountry = normalizeValue(country)
  const normalizedPlatform = normalizeValue(platform)

  return [normalizedCountry, normalizedPlatform].filter(Boolean).join("_")
}

/**
 * 标准化组合主数据。
 *
 * @param {Partial<PresetGroupItem>} item 原始组合对象。
 * @returns {PresetGroupItem} 标准化后的组合对象。
 */
export function normalizePresetGroupItem(item = {}) {
  const country = normalizeValue(item.country)
  const platform = normalizeValue(item.platform)
  const country_platform = createCountryPlatformValue(country, platform)
  const id = normalizeValue(item.id) || country_platform

  return {
    id,
    country,
    platform,
    country_platform,
    sort: normalizeSort(item.sort),
  }
}

/**
 * 标准化参数项。
 *
 * @param {Partial<PresetItem>} item 原始参数项对象。
 * @returns {PresetItem} 标准化后的参数项对象。
 */
export function normalizePresetItem(item = {}) {
  const preset_id = normalizeValue(item.preset_id)
  const name = normalizeValue(item.name)
  const fallbackId = [preset_id, name].filter(Boolean).join("__")
  const id = normalizeValue(item.id) || fallbackId

  return {
    id,
    preset_id,
    name,
    type: normalizeValue(item.type) || "text",
    unit: normalizeValue(item.unit),
    value: normalizeValue(item.value),
    rule_mode: normalizeValue(item.rule_mode || item.ruleMode),
    rule_table_id: normalizeValue(item.rule_table_id || item.ruleTableId),
    rule_config:
      typeof item.rule_config === "object"
        ? item.rule_config
        : typeof item.ruleConfig === "object"
          ? item.ruleConfig
          : normalizeValue(item.rule_config || item.ruleConfig),
    sort: normalizeSort(item.sort),
  }
}

/**
 * 判断组合主数据是否有效。
 *
 * @param {Partial<PresetGroupItem>} item 组合对象。
 * @returns {boolean} 国家和平台都有值时返回 true。
 */
export function isValidPresetGroupItem(item = {}) {
  return Boolean(item.country && item.platform)
}

/**
 * 判断参数项是否有效。
 *
 * @param {Partial<PresetItem>} item 参数项对象。
 * @returns {boolean} `preset_id` 和 `name` 都存在时返回 true。
 */
export function isValidPresetItem(item = {}) {
  return Boolean(item.preset_id && item.name)
}

/**
 * 标准化并去重组合主数据。
 *
 * @param {Array<Partial<PresetGroupItem>>} list 原始组合列表。
 * @returns {PresetGroupItem[]} 去重后的组合列表。
 */
export function dedupePresetGroupList(list = []) {
  const normalizedList = list
    .map(normalizePresetGroupItem)
    .filter(isValidPresetGroupItem)

  return XEUtils.uniq(normalizedList, "id")
}

/**
 * 标准化并去重参数项列表。
 *
 * @param {Array<Partial<PresetItem>>} list 原始参数项列表。
 * @returns {PresetItem[]} 去重后的参数项列表。
 */
export function dedupePresetItemList(list = []) {
  const normalizedList = list.map(normalizePresetItem).filter(isValidPresetItem)

  return XEUtils.uniq(normalizedList, "id")
}

/**
 * 将组合列表转换为 groups sheet 行数据。
 *
 * @param {Array<Partial<PresetGroupItem>>} list 组合列表。
 * @returns {PresetGroupItem[]} 可直接写入 sheet 的行数据。
 */
export function presetGroupsToRows(list = []) {
  return dedupePresetGroupList(list)
}

/**
 * 将参数项列表转换为 items sheet 行数据。
 *
 * @param {Array<Partial<PresetItem>>} list 参数项列表。
 * @returns {PresetItem[]} 可直接写入 sheet 的行数据。
 */
export function presetItemsToRows(list = []) {
  return dedupePresetItemList(list).map(item => ({
    ...item,
    rule_config:
      typeof item.rule_config === "string"
        ? item.rule_config
        : JSON.stringify(item.rule_config || {}),
  }))
}

/**
 * 从 groups sheet 行数据恢复组合列表。
 *
 * @param {Array<Partial<PresetGroupItem>>} rows groups sheet 行数据。
 * @returns {PresetGroupItem[]} 标准化后的组合列表。
 */
export function rowsToPresetGroups(rows = []) {
  return dedupePresetGroupList(rows)
}

/**
 * 从 items sheet 行数据恢复参数项列表。
 *
 * @param {Array<Partial<PresetItem>>} rows items sheet 行数据。
 * @returns {PresetItem[]} 标准化后的参数项列表。
 */
export function rowsToPresetItems(rows = []) {
  return dedupePresetItemList(rows)
}

/**
 * 根据组合列表和参数项列表组装页面标准数据。
 *
 * @param {Array<Partial<PresetGroupItem>>} groups 组合列表。
 * @param {Array<Partial<PresetItem>>} items 参数项列表。
 * @returns {PresetRecord[]} 页面使用的完整数据。
 */
export function buildPresetRecords(groups = [], items = []) {
  const normalizedGroups = rowsToPresetGroups(groups)
  const normalizedItems = rowsToPresetItems(items)
  const sortedGroups = XEUtils.orderBy(
    normalizedGroups,
    ["sort", "country", "platform"],
    ["asc", "asc", "asc"],
  )

  return sortedGroups.map((group) => {
    const groupItems = normalizedItems.filter(
      item => item.preset_id === group.id,
    )

    return {
      ...group,
      items: XEUtils.orderBy(groupItems, ["sort", "name"], ["asc", "asc"]),
    }
  })
}

/**
 * 将页面标准数据拆成可写入 Excel 的两张表。
 *
 * @param {Array<Partial<PresetRecord>>} records 页面数据。
 * @returns {{ groups: PresetGroupItem[], items: PresetItem[] }} 两张表的行数据。
 */
export function splitPresetRecords(records = []) {
  const normalizedRecords = records.map(record => ({
    ...normalizePresetGroupItem(record),
    items: Array.isArray(record.items) ? record.items : [],
  }))

  return {
    groups: presetGroupsToRows(normalizedRecords),
    items: presetItemsToRows(
      normalizedRecords.flatMap(record =>
        record.items.map(item =>
          normalizePresetItem({
            ...item,
            preset_id: item.preset_id || record.id,
          }),
        ),
      ),
    ),
  }
}

/**
 * 创建 `preset_groups` sheet。
 *
 * @param {Array<Partial<PresetGroupItem>>} list 组合列表。
 * @returns {XLSX.WorkSheet} groups worksheet。
 */
export function createPresetGroupsSheet(list = []) {
  return XLSX.utils.json_to_sheet(presetGroupsToRows(list), {
    header: PRESET_GROUP_COLUMNS,
  })
}

/**
 * 创建 `preset_items` sheet。
 *
 * @param {Array<Partial<PresetItem>>} list 参数项列表。
 * @returns {XLSX.WorkSheet} items worksheet。
 */
export function createPresetItemsSheet(list = []) {
  return XLSX.utils.json_to_sheet(presetItemsToRows(list), {
    header: PRESET_ITEM_COLUMNS,
  })
}

/**
 * 读取 groups sheet。
 *
 * 优先读取 `preset_groups`，兼容旧的 `country_platform` sheet。
 *
 * @param {XLSX.WorkBook} workbook Excel workbook。
 * @returns {PresetGroupItem[]} 组合列表。
 */
export function readPresetGroupsSheet(workbook) {
  let worksheet = workbook?.Sheets?.[PRESET_GROUPS_SHEET_NAME]

  if (!worksheet)
    worksheet = workbook?.Sheets?.[COUNTRY_PLATFORM_SHEET_NAME]

  if (!worksheet) {
    const firstSheetName = workbook?.SheetNames?.[0]
    worksheet = workbook?.Sheets?.[firstSheetName]
  }

  if (!worksheet)
    return []

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
  })

  return rowsToPresetGroups(rows)
}

/**
 * 读取 items sheet。
 *
 * @param {XLSX.WorkBook} workbook Excel workbook。
 * @returns {PresetItem[]} 参数项列表。
 */
export function readPresetItemsSheet(workbook) {
  const worksheet = workbook?.Sheets?.[PRESET_ITEMS_SHEET_NAME]

  if (!worksheet)
    return []

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
  })

  return rowsToPresetItems(rows)
}

/**
 * 从 workbook 中读取完整预设数据。
 *
 * @param {XLSX.WorkBook} workbook Excel workbook。
 * @returns {PresetRecord[]} 完整预设数据。
 */
export function readPresetWorkbook(workbook) {
  const groups = readPresetGroupsSheet(workbook)
  const items = readPresetItemsSheet(workbook)

  return buildPresetRecords(groups, items)
}

/**
 * 将完整预设数据写回 workbook。
 *
 * @param {XLSX.WorkBook | undefined} workbook 原 workbook。
 * @param {Array<Partial<PresetRecord>>} records 完整预设数据。
 * @returns {XLSX.WorkBook} 写入后的 workbook。
 */
export function writePresetWorkbook(workbook, records = []) {
  const nextWorkbook = workbook || XLSX.utils.book_new()
  const { groups, items } = splitPresetRecords(records)
  const groupsSheet = createPresetGroupsSheet(groups)
  const itemsSheet = createPresetItemsSheet(items)

  nextWorkbook.Sheets[PRESET_GROUPS_SHEET_NAME] = groupsSheet
  nextWorkbook.Sheets[PRESET_ITEMS_SHEET_NAME] = itemsSheet

  if (!nextWorkbook.SheetNames.includes(PRESET_GROUPS_SHEET_NAME))
    nextWorkbook.SheetNames.push(PRESET_GROUPS_SHEET_NAME)

  if (!nextWorkbook.SheetNames.includes(PRESET_ITEMS_SHEET_NAME))
    nextWorkbook.SheetNames.push(PRESET_ITEMS_SHEET_NAME)

  return nextWorkbook
}

/**
 * 创建新的预设 workbook。
 *
 * @param {Array<Partial<PresetRecord>>} records 完整预设数据。
 * @returns {XLSX.WorkBook} 新 workbook。
 */
export function createPresetWorkbook(records = []) {
  const workbook = XLSX.utils.book_new()

  return writePresetWorkbook(workbook, records)
}

/**
 * 将完整预设数据导出为可写入文件的二进制数组。
 *
 * @param {Array<Partial<PresetRecord>>} records 完整预设数据。
 * @returns {Uint8Array} Excel 文件字节数据。
 */
export function exportPresetsToBytes(records = []) {
  const workbook = createPresetWorkbook(records)
  const arrayBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  })

  return new Uint8Array(arrayBuffer)
}

/**
 * 导出完整预设 Excel 文件。
 *
 * @param {Array<Partial<PresetRecord>>} records 完整预设数据。
 * @param {string} filename 导出文件名。
 * @returns {void}
 */
export function exportPresetsToExcel(records = [], filename) {
  const nextFilename = normalizeValue(filename) || "presets.xlsx"
  const workbook = createPresetWorkbook(records)

  XLSX.writeFile(workbook, nextFilename)
}

/**
 * 从浏览器选择的 Excel 文件中读取完整预设数据。
 *
 * @param {File} file 浏览器 File 对象。
 * @returns {Promise<PresetRecord[]>} 完整预设数据。
 */
export async function importPresetsFromExcel(file) {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: "array" })

  return readPresetWorkbook(workbook)
}

/**
 * 从文件字节中读取完整预设数据。
 *
 * @param {ArrayLike<number> | ArrayBuffer} input Excel 文件字节。
 * @returns {PresetRecord[]} 完整预设数据。
 */
export function importPresetsFromBytes(input) {
  const bytes
    = input instanceof ArrayBuffer
      ? new Uint8Array(input)
      : Uint8Array.from(input)
  const workbook = XLSX.read(bytes, { type: "array" })

  return readPresetWorkbook(workbook)
}

/**
 * 将组合列表转换成旧页面暂时使用的最小结构。
 *
 * @param {Array<Partial<PresetGroupItem>>} list 组合列表。
 * @returns {CountryPlatformItem[]} 最小组合列表。
 */
export function dedupeCountryPlatformList(list = []) {
  return dedupePresetGroupList(list).map(item => ({
    country: item.country,
    platform: item.platform,
    country_platform: item.country_platform,
  }))
}

/**
 * 兼容当前页面的导入入口。
 *
 * 只返回组合层，不返回参数项。
 *
 * @param {File} file 浏览器 File 对象。
 * @returns {Promise<CountryPlatformItem[]>} 组合列表。
 */
export async function importCountryPlatformsFromExcel(file) {
  const records = await importPresetsFromExcel(file)

  return dedupeCountryPlatformList(records)
}

/**
 * 兼容当前页面的导出入口。
 *
 * 当前只导出组合层，参数项为空。
 *
 * @param {Array<Partial<CountryPlatformItem>>} list 组合列表。
 * @param {string} filename 导出文件名。
 * @returns {void}
 */
export function exportCountryPlatformsToExcel(list = [], filename) {
  const records = dedupePresetGroupList(list).map(item => ({
    ...item,
    items: [],
  }))

  exportPresetsToExcel(records, filename)
}
