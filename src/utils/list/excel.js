import ExcelJS from "exceljs"
import * as XLSX from "xlsx"

import { isTauriApp, readBinaryFile } from "@/utils/tauri/excel-file"

export const LIST_MAIN_SHEET_NAME = "商品列表"
export const LIST_IMAGES_SHEET_NAME = "图片关系"
export const LIST_VARIANTS_SHEET_NAME = "变体关系"
export const LIST_FIELDS_SHEET_NAME = "扩展字段"
export const LIST_META_SHEET_NAME = "程序信息"
export const LIST_WORKBOOK_VERSION = "1"

const MAIN_COLUMNS = [
  "名称",
  "款号",
  "图片",
  "变体",
  "国家",
  "平台",
  "类目",
  "广告类型",
  "是否包邮",
  "成本",
  "重量(g)",
  "境内运费",
  "折后价格(R$)",
  "折前价格(R$)",
  "利润率",
  "净利润(R$)",
  "收入(R$)",
  "活动费",
  "交易费",
  "佣金费",
  "提现费",
  "汇损",
  "税费",
  "贴单费",
  "固定附加费",
  "备注",
]

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

function normalizeListRecord(item = {}, index = 0) {
  return {
    id: toText(item.id) || `product_${Date.now()}_${index + 1}`,
    name: toText(item.name || item["名称"]),
    sku: toText(item.sku || item["款号"]),
    globalSku: toText(item.globalSku || item["全球货号"]),
    country: toText(item.country || item["国家"]),
    platform: toText(item.platform || item["平台"]),
    category: toText(item.category || item["类目"]),
    adType: toText(item.adType || item["广告类型"]),
    shippingIncluded: toText(item.shippingIncluded || item["是否包邮"]),
    cost: toNumberString(item.cost || item["成本"]),
    weight: toNumberString(item.weight || item["重量(g)"]),
    sellerShipping: toNumberString(item.sellerShipping || item["境内运费"]),
    discountPrice: toNumberString(
      item.discountPrice || item["折后价格(R$)"],
    ),
    listPrice: toNumberString(item.listPrice || item["折前价格(R$)"]),
    profitRate: toNumberString(item.profitRate || item["利润率"]),
    netProfit: toNumberString(item.netProfit || item["净利润(R$)"]),
    revenue: toNumberString(item.revenue || item["收入(R$)"]),
    activityFee: toNumberString(item.activityFee || item["活动费"]),
    transactionFee: toNumberString(item.transactionFee || item["交易费"]),
    commissionFee: toNumberString(item.commissionFee || item["佣金费"]),
    withdrawFee: toNumberString(item.withdrawFee || item["提现费"]),
    exchangeLossFee: toNumberString(item.exchangeLossFee || item["汇损"]),
    taxFee: toNumberString(item.taxFee || item["税费"]),
    labelFee: toNumberString(item.labelFee || item["贴单费"]),
    fixedSurcharge: toNumberString(item.fixedSurcharge || item["固定附加费"]),
    notes: toText(item.notes || item["备注"]),
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

  return normalizeListWorkbookData({
    records: readSheetRows(workbook, LIST_MAIN_SHEET_NAME).map(
      normalizeListRecord,
    ),
    images: readSheetRows(workbook, LIST_IMAGES_SHEET_NAME).map(
      normalizeImageEntry,
    ),
    variants: readSheetRows(workbook, LIST_VARIANTS_SHEET_NAME).map(
      normalizeVariantEntry,
    ),
    fields: readSheetRows(workbook, LIST_FIELDS_SHEET_NAME).map(
      normalizeFieldEntry,
    ),
  })
}

function recordToSheetRow(record = {}) {
  return {
    "名称": record.name,
    "款号": record.sku,
    "图片": "",
    "变体": record.variantSummary,
    "国家": record.country,
    "平台": record.platform,
    "类目": record.category,
    "广告类型": record.adType,
    "是否包邮": record.shippingIncluded,
    "成本": record.cost,
    "重量(g)": record.weight,
    "境内运费": record.sellerShipping,
    "折后价格(R$)": record.discountPrice,
    "折前价格(R$)": record.listPrice,
    "利润率": record.profitRate,
    "净利润(R$)": record.netProfit,
    "收入(R$)": record.revenue,
    "活动费": record.activityFee,
    "交易费": record.transactionFee,
    "佣金费": record.commissionFee,
    "提现费": record.withdrawFee,
    "汇损": record.exchangeLossFee,
    "税费": record.taxFee,
    "贴单费": record.labelFee,
    "固定附加费": record.fixedSurcharge,
    "备注": record.notes,
  }
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
  worksheet.columns = [
    { header: "名称", key: "名称", width: 18 },
    { header: "款号", key: "款号", width: 16 },
    { header: "图片", key: "图片", width: 18 },
    { header: "变体", key: "变体", width: 18 },
    { header: "国家", key: "国家", width: 10 },
    { header: "平台", key: "平台", width: 10 },
    { header: "类目", key: "类目", width: 12 },
    { header: "广告类型", key: "广告类型", width: 12 },
    { header: "是否包邮", key: "是否包邮", width: 12 },
    { header: "成本", key: "成本", width: 12 },
    { header: "重量(g)", key: "重量(g)", width: 12 },
    { header: "境内运费", key: "境内运费", width: 12 },
    { header: "折后价格(R$)", key: "折后价格(R$)", width: 14 },
    { header: "折前价格(R$)", key: "折前价格(R$)", width: 14 },
    { header: "利润率", key: "利润率", width: 12 },
    { header: "净利润(R$)", key: "净利润(R$)", width: 14 },
    { header: "收入(R$)", key: "收入(R$)", width: 12 },
    { header: "活动费", key: "活动费", width: 12 },
    { header: "交易费", key: "交易费", width: 12 },
    { header: "佣金费", key: "佣金费", width: 12 },
    { header: "提现费", key: "提现费", width: 12 },
    { header: "汇损", key: "汇损", width: 12 },
    { header: "税费", key: "税费", width: 12 },
    { header: "贴单费", key: "贴单费", width: 12 },
    { header: "固定附加费", key: "固定附加费", width: 14 },
    { header: "备注", key: "备注", width: 20 },
  ]
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

    const buffer = await loadImageBuffer(image)

    if (!buffer) {
      continue
    }

    const imageId = workbook.addImage({
      buffer,
      extension: inferImageExtension(image),
    })
    const rowNumber = index + 2
    const cell = mainSheet.getCell(rowNumber, coverColumnIndex)

    image.excelImageCell = cell.address
    cell.value = ""
    mainSheet.addImage(imageId, {
      tl: { col: coverColumnIndex - 1 + 0.04, row: rowNumber - 1 + 0.04 },
      br: { col: coverColumnIndex - 1 + 0.96, row: rowNumber - 1 + 0.96 },
      editAs: "oneCell",
    })
  }

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
