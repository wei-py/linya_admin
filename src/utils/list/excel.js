import ExcelJS from "exceljs"
import * as XLSX from "xlsx"

import {
  listMainSheetColumnConfigs,
  listRecordFieldConfigs,
  listRecordSheetColumnConfigs,
} from "@/constants/list"
import { isTauriApp, readBinaryFile } from "@/utils/tauri/excel-file"

export const LIST_MAIN_SHEET_NAME = "商品列表"
export const LIST_RECORDS_SHEET_NAME = "商品记录"
export const LIST_IMAGES_SHEET_NAME = "图片关系"
export const LIST_VARIANTS_SHEET_NAME = "变体关系"
export const LIST_FIELDS_SHEET_NAME = "扩展字段"
export const LIST_META_SHEET_NAME = "程序信息"
export const LIST_WORKBOOK_VERSION = "2"

const MAIN_COLUMNS = listMainSheetColumnConfigs.map(config => config.header)

const IMAGE_COLUMNS = [
  "id",
  "product_id",
  "sort",
  "role",
  "source_type",
  "file_name",
  "file_path",
  "relative_path",
  "variant_group_id",
  "variant_option_id",
  "is_cover",
  "excel_image_cell",
  "remark",
]

const VARIANT_COLUMNS = [
  "id",
  "product_id",
  "group_id",
  "group_name",
  "option_id",
  "option_value",
  "sort",
]

const FIELD_COLUMNS = [
  "id",
  "product_id",
  "field_key",
  "field_label",
  "field_value",
  "sort",
]

const META_COLUMNS = [
  "app_version",
  "exported_at",
  "list_workbook_version",
  "main_sheet_name",
  "description",
]

const RECORD_COLUMNS = listRecordSheetColumnConfigs

function toText(value) {
  return String(value ?? "").trim()
}

function toNumberString(value) {
  if (value === null || value === undefined || value === "") {
    return ""
  }

  const nextValue = Number(value)

  if (!Number.isFinite(nextValue)) {
    return toText(value)
  }

  return `${Math.round(nextValue * 100) / 100}`.replace(
    /(\.\d*?[1-9])0+$|\.0+$/,
    "$1",
  )
}

function normalizePathToken(value) {
  return toText(value).replace(/\\/g, "/").trim()
}

function getPathBasename(value) {
  const normalized = normalizePathToken(value)

  if (!normalized) {
    return ""
  }

  const segments = normalized.split("/")

  return toText(segments.at(-1))
}

function resolveConfigValue(item = {}, config = {}) {
  const candidateValues = [
    item[config.recordKey],
    item[config.internalKey],
    ...(config.aliases || []).map(alias => item[alias]),
  ]

  return candidateValues.find(
    value => value !== undefined && value !== null && value !== "",
  )
}

function normalizeListRecord(item = {}, index = 0) {
  const record = {
    id: toText(item.id) || `product_${Date.now()}_${index + 1}`,
    globalSku: toText(item.globalSku || item.global_sku || item["全球货号"]),
    currentBenchmarkKey: toText(
      item.currentBenchmarkKey || item.current_benchmark_key,
    ),
    coverImageId: toText(item.coverImageId || item.cover_image_id),
    variantSummary: toText(item.variantSummary || item.variant_summary),
    presetSnapshotJson: toText(
      item.presetSnapshotJson || item.preset_snapshot_json,
    ),
    calculationSnapshotJson: toText(
      item.calculationSnapshotJson || item.calculation_snapshot_json,
    ),
    createdAt: toText(item.createdAt || item.created_at),
    updatedAt: toText(item.updatedAt || item.updated_at),
  }

  listRecordFieldConfigs.forEach((config) => {
    const rawValue = resolveConfigValue(item, config)
    const nextValue = config.type ? toNumberString(rawValue) : toText(rawValue)

    record[config.recordKey] = nextValue
  })

  return record
}

function normalizeImageEntry(item = {}, index = 0) {
  return {
    id: toText(item.id) || `image_${Date.now()}_${index + 1}`,
    productId: toText(item.productId || item.product_id),
    sort: Number(item.sort) || index + 1,
    role: toText(item.role),
    sourceType: toText(item.sourceType || item.source_type),
    fileName: toText(item.fileName || item.file_name),
    filePath: toText(item.filePath || item.file_path),
    relativePath: toText(item.relativePath || item.relative_path),
    variantGroupId: toText(item.variantGroupId || item.variant_group_id),
    variantOptionId: toText(item.variantOptionId || item.variant_option_id),
    isCover: Number(item.isCover ?? item.is_cover ?? 0) ? 1 : 0,
    excelImageCell: toText(item.excelImageCell || item.excel_image_cell),
    remark: toText(item.remark),
  }
}

function normalizeVariantEntry(item = {}, index = 0) {
  return {
    id: toText(item.id) || `variant_${Date.now()}_${index + 1}`,
    productId: toText(item.productId || item.product_id),
    groupId: toText(item.groupId || item.group_id),
    groupName: toText(item.groupName || item.group_name),
    optionId: toText(item.optionId || item.option_id),
    optionValue: toText(item.optionValue || item.option_value),
    sort: Number(item.sort) || index + 1,
  }
}

function normalizeFieldEntry(item = {}, index = 0) {
  return {
    id: toText(item.id) || `field_${Date.now()}_${index + 1}`,
    productId: toText(item.productId || item.product_id),
    fieldKey: toText(item.fieldKey || item.field_key),
    fieldLabel: toText(item.fieldLabel || item.field_label),
    fieldValue: toText(item.fieldValue || item.field_value),
    sort: Number(item.sort) || index + 1,
  }
}

function readSheetRows(workbook, sheetName, headers = []) {
  const worksheet = workbook?.Sheets?.[sheetName]

  if (!worksheet) {
    return []
  }

  return XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    raw: false,
    header: headers.length ? headers : 0,
  })
}

export function normalizeListWorkbookData(payload = {}) {
  const images = (payload.images || []).map(normalizeImageEntry)
  const variants = (payload.variants || []).map(normalizeVariantEntry)
  const fields = (payload.fields || []).map(normalizeFieldEntry)
  const records = (payload.records || []).map(normalizeListRecord)

  records.forEach((record) => {
    if (record.coverImageId) {
      return
    }

    record.coverImageId
      = images.find(
        item => item.productId === record.id && Number(item.isCover) === 1,
      )?.id || ""
  })

  return {
    records,
    images,
    variants,
    fields,
  }
}

export function importListWorkbookFromBytes(bytes) {
  const workbook = XLSX.read(bytes, { type: "array" })
  const recordRows = readSheetRows(workbook, LIST_RECORDS_SHEET_NAME)
  const mainRows = readSheetRows(workbook, LIST_MAIN_SHEET_NAME)
  const imageRows = readSheetRows(workbook, LIST_IMAGES_SHEET_NAME)
  const images = imageRows.map(normalizeImageEntry)
  const useRecordSheet = Boolean(recordRows.length)
  const sourceRows = useRecordSheet ? recordRows : mainRows
  const coverImages = images
    .filter(item => item.isCover)
    .sort((a, b) => a.sort - b.sort)

  const records = sourceRows.map((item, index) => {
    const record = normalizeListRecord(item, index)

    if (useRecordSheet) {
      return record
    }

    const rowImagePath = normalizePathToken(
      item["图片路径"] || item.imagePath || item.image_path,
    )
    const rowImageName = getPathBasename(rowImagePath)

    let matchedImage = images.find((image) => {
      const relativePath = normalizePathToken(image.relativePath)
      const filePath = normalizePathToken(image.filePath)
      const fileName = getPathBasename(image.fileName || image.filePath)

      return (
        (rowImagePath && rowImagePath === relativePath)
        || (rowImagePath && rowImagePath === filePath)
        || (rowImageName && rowImageName === fileName)
      )
    })

    if (!matchedImage && coverImages.length === sourceRows.length) {
      matchedImage = coverImages[index] || null
    }

    if (matchedImage?.productId) {
      record.id = matchedImage.productId

      if (!record.coverImageId) {
        record.coverImageId = matchedImage.id
      }
    }

    return record
  })

  return normalizeListWorkbookData({
    records,
    images,
    variants: readSheetRows(workbook, LIST_VARIANTS_SHEET_NAME).map(
      normalizeVariantEntry,
    ),
    fields: readSheetRows(workbook, LIST_FIELDS_SHEET_NAME).map(
      normalizeFieldEntry,
    ),
  })
}

function recordToInternalRow(record = {}) {
  const row = {
    id: record.id,
    global_sku: record.globalSku,
    current_benchmark_key: record.currentBenchmarkKey,
    cover_image_id: record.coverImageId,
    variant_summary: record.variantSummary,
    preset_snapshot_json: record.presetSnapshotJson,
    calculation_snapshot_json: record.calculationSnapshotJson,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }

  listRecordFieldConfigs.forEach((config) => {
    row[config.internalKey] = record[config.recordKey]
  })

  return row
}

function recordToSheetRow(record = {}) {
  const row = {
    图片: "",
    变体: record.variantSummary,
  }

  listRecordFieldConfigs.forEach((config) => {
    row[config.mainHeader] = record[config.recordKey]
  })

  return row
}

function imageToSheetRow(image = {}) {
  return {
    id: image.id,
    product_id: image.productId,
    sort: image.sort,
    role: image.role,
    source_type: image.sourceType,
    file_name: image.fileName,
    file_path: image.filePath,
    relative_path: image.relativePath,
    variant_group_id: image.variantGroupId,
    variant_option_id: image.variantOptionId,
    is_cover: image.isCover,
    excel_image_cell: image.excelImageCell,
    remark: image.remark,
  }
}

function variantToSheetRow(item = {}) {
  return {
    id: item.id,
    product_id: item.productId,
    group_id: item.groupId,
    group_name: item.groupName,
    option_id: item.optionId,
    option_value: item.optionValue,
    sort: item.sort,
  }
}

function fieldToSheetRow(item = {}) {
  return {
    id: item.id,
    product_id: item.productId,
    field_key: item.fieldKey,
    field_label: item.fieldLabel,
    field_value: item.fieldValue,
    sort: item.sort,
  }
}

function metaRows() {
  return [
    {
      app_version: "linya-admin",
      exported_at: new Date().toISOString(),
      list_workbook_version: LIST_WORKBOOK_VERSION,
      main_sheet_name: LIST_MAIN_SHEET_NAME,
      description:
        "商品列表给用户查看；图片关系、变体关系、扩展字段由程序维护。",
    },
  ]
}

function inferImageExtension(image = {}) {
  const source = toText(image.fileName || image.filePath || image.relativePath)
  const matched = source.match(/\.([a-z0-9]+)$/i)
  const extension = matched?.[1]?.toLowerCase()

  if (["png", "jpg", "jpeg", "gif", "webp"].includes(extension)) {
    if (extension === "jpg" || extension === "jpeg") {
      return "jpeg"
    }

    return extension
  }

  return "png"
}

async function loadImageBuffer(image = {}) {
  if (!image.filePath) {
    return null
  }

  if (isTauriApp()) {
    try {
      return await readBinaryFile(image.filePath)
    }
    catch {
      return null
    }
  }

  if (/^(?:blob:|data:image\/|https?:\/\/)/i.test(image.filePath)) {
    try {
      const response = await fetch(image.filePath)
      const arrayBuffer = await response.arrayBuffer()

      return new Uint8Array(arrayBuffer)
    }
    catch {
      return null
    }
  }

  return null
}

function bytesToBase64(bytes) {
  let binary = ""
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)

    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

async function loadImageBase64(image = {}) {
  const bytes = await loadImageBuffer(image)

  if (!bytes?.length) {
    return ""
  }

  const extension = inferImageExtension(image)
  const mimeType = extension === "jpeg" ? "image/jpeg" : `image/${extension}`

  return `data:${mimeType};base64,${bytesToBase64(bytes)}`
}

function applySheetBaseStyle(worksheet) {
  const headerRow = worksheet.getRow(1)

  headerRow.font = { bold: true, color: { argb: "FF161616" } }
  headerRow.alignment = { vertical: "middle", horizontal: "center" }
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9F0F2" },
  }

  worksheet.views = [{ state: "frozen", ySplit: 1 }]

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFD0D0D0" } },
        left: { style: "thin", color: { argb: "FFD0D0D0" } },
        bottom: { style: "thin", color: { argb: "FFD0D0D0" } },
        right: { style: "thin", color: { argb: "FFD0D0D0" } },
      }
      cell.alignment = { vertical: "middle", horizontal: "center" }
    })
  })
}

function configureMainSheetColumns(worksheet) {
  worksheet.columns = listMainSheetColumnConfigs.map(config => ({
    header: config.header,
    key: config.key || config.header,
    width: config.width,
  }))
}

function appendJsonRows(worksheet, rows = [], columns = []) {
  worksheet.columns = columns.map(header => ({
    header,
    key: header,
    width: Math.max(12, String(header).length + 4),
  }))
  rows.forEach(row => worksheet.addRow(row))
  applySheetBaseStyle(worksheet)
}

export async function exportListWorkbookToBytes(payload = {}) {
  const workbook = new ExcelJS.Workbook()
  const data = normalizeListWorkbookData(payload)
  const mainSheet = workbook.addWorksheet(LIST_MAIN_SHEET_NAME)
  const recordsSheet = workbook.addWorksheet(LIST_RECORDS_SHEET_NAME)
  const imagesSheet = workbook.addWorksheet(LIST_IMAGES_SHEET_NAME)
  const variantsSheet = workbook.addWorksheet(LIST_VARIANTS_SHEET_NAME)
  const fieldsSheet = workbook.addWorksheet(LIST_FIELDS_SHEET_NAME)
  const metaSheet = workbook.addWorksheet(LIST_META_SHEET_NAME)

  configureMainSheetColumns(mainSheet)
  data.records.forEach((record) => {
    const row = mainSheet.addRow(recordToSheetRow(record))

    row.height = record.coverImageId ? 88 : 22
  })
  applySheetBaseStyle(mainSheet)

  const coverColumnIndex = MAIN_COLUMNS.indexOf("图片") + 1

  for (const [index, record] of data.records.entries()) {
    const image = data.images.find(item => item.id === record.coverImageId)

    if (!image) {
      continue
    }

    const base64 = await loadImageBase64(image)

    if (!base64) {
      continue
    }

    const imageId = workbook.addImage({
      base64,
      extension: inferImageExtension(image),
    })
    const rowNumber = index + 2
    const cell = mainSheet.getCell(rowNumber, coverColumnIndex)

    image.excelImageCell = cell.address
    cell.value = ""
    mainSheet.addImage(imageId, {
      tl: { col: coverColumnIndex - 1 + 0.08, row: rowNumber - 1 + 0.08 },
      ext: { width: 84, height: 84 },
      editAs: "oneCell",
    })
  }

  appendJsonRows(
    recordsSheet,
    data.records.map(recordToInternalRow),
    RECORD_COLUMNS,
  )
  appendJsonRows(
    imagesSheet,
    data.images.map(imageToSheetRow),
    IMAGE_COLUMNS,
  )
  appendJsonRows(
    variantsSheet,
    data.variants.map(variantToSheetRow),
    VARIANT_COLUMNS,
  )
  appendJsonRows(
    fieldsSheet,
    data.fields.map(fieldToSheetRow),
    FIELD_COLUMNS,
  )
  appendJsonRows(metaSheet, metaRows(), META_COLUMNS)

  return workbook.xlsx.writeBuffer()
}
