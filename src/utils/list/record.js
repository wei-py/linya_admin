function slugify(value = "") {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w\u4E00-\u9FA5-]/g, "")

  return normalized || "item"
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function toText(value) {
  return String(value ?? "").trim()
}

function formatNumber(value) {
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

function findExtraFieldValue(extraFields = [], labels = []) {
  const normalizedLabels = labels.map(label => label.trim().toLowerCase())

  const target = extraFields.find((field) => {
    const currentLabel = toText(field.label).toLowerCase()

    return normalizedLabels.includes(currentLabel)
  })

  return toText(target?.value)
}

function buildVariantSummary(variationGroups = []) {
  return variationGroups
    .filter(group => toText(group.name))
    .map(group =>
      `${group.name}: ${group.options
        .map(option => toText(option.value))
        .filter(Boolean)
        .join(" / ")}`,
    )
    .filter(Boolean)
    .join("；")
}

function cloneJson(value) {
  try {
    return JSON.parse(JSON.stringify(value))
  }
  catch {
    return value
  }
}

export function buildListProductBundle(payload = {}) {
  const recordId = createId("product")
  const now = new Date().toISOString()
  const form = cloneJson(payload.form || {})
  const calculationSnapshot = cloneJson(payload.calculationSnapshot || {})
  const calculationDriver = toText(payload.calculationDriver)
  const calculationDriverText = toText(payload.calculationDriverText)
  const extraFields = Array.isArray(form.extraProductFields)
    ? form.extraProductFields
    : []
  const variationGroups = Array.isArray(form.variationGroups)
    ? form.variationGroups
    : []
  const imageLinks = Array.isArray(form.imageLinks) ? form.imageLinks : []
  const name
    = toText(form.name)
      || findExtraFieldValue(extraFields, ["名称", "商品名称"])
      || "未命名商品"
  const globalSku
    = findExtraFieldValue(extraFields, ["全球货号", "货号", "全局货号"])
  const position = findExtraFieldValue(extraFields, ["定位"])
  const variantSummary = buildVariantSummary(variationGroups)
  const images = imageLinks
    .filter(image => toText(image.value) || toText(image.previewUrl))
    .map((image, index) => ({
      id: createId("image"),
      productId: recordId,
      sort: index + 1,
      role: index === 0 ? "cover" : "gallery",
      sourceType: toText(image.source) || "manual",
      fileName: toText(image.fileName),
      filePath: toText(image.value || image.previewUrl),
      relativePath: "",
      variantGroupId: toText(image.variationGroupId),
      variantOptionId: toText(image.variationOptionId),
      isCover: index === 0 ? 1 : 0,
      excelImageCell: "",
      remark: "",
    }))
  const coverImageId = images.find(image => image.isCover)?.id || ""
  const variants = variationGroups.flatMap((group, groupIndex) =>
    (group.options || []).map((option, optionIndex) => ({
      id: createId("variant"),
      productId: recordId,
      groupId: toText(group.id),
      groupName: toText(group.name) || `变体 ${groupIndex + 1}`,
      optionId: toText(option.id),
      optionValue: toText(option.value) || `选项 ${optionIndex + 1}`,
      sort: optionIndex + 1,
    })),
  )
  const fields = extraFields.map((field, index) => ({
    id: createId("field"),
    productId: recordId,
    fieldKey: slugify(field.label || `field_${index + 1}`),
    fieldLabel: toText(field.label),
    fieldValue: toText(field.value),
    sort: index + 1,
  }))

  return {
    record: {
      id: recordId,
      position,
      name,
      sku: toText(form.styleNo),
      globalSku,
      country: toText(form.country),
      platform: toText(form.platform),
      category: toText(form.category),
      adType: toText(form.adType),
      shippingIncluded: toText(form.shippingIncluded),
      cost: formatNumber(form.cost),
      weight: formatNumber(form.weight),
      sellerShipping: formatNumber(calculationSnapshot.sellerShipping),
      totalFee: formatNumber(calculationSnapshot.totalFee),
      discountPrice: formatNumber(calculationSnapshot.discountPrice),
      listPrice: formatNumber(calculationSnapshot.listPrice),
      profitRate: formatNumber(calculationSnapshot.profitRate),
      netProfit: formatNumber(calculationSnapshot.netProfit),
      revenue: formatNumber(calculationSnapshot.revenue),
      currentBenchmark: calculationDriverText || calculationDriver,
      currentBenchmarkKey: calculationDriver,
      shippingDefault: toText(calculationSnapshot.shippingDefault),
      activityFee: formatNumber(calculationSnapshot.activityFee),
      transactionFee: formatNumber(calculationSnapshot.transactionFee),
      commissionFee: formatNumber(calculationSnapshot.commissionFee),
      withdrawFee: formatNumber(calculationSnapshot.withdrawFee),
      exchangeLossFee: formatNumber(calculationSnapshot.exchangeLossFee),
      taxFee: formatNumber(calculationSnapshot.taxFee),
      labelFee: formatNumber(calculationSnapshot.labelFee),
      fixedSurcharge: formatNumber(calculationSnapshot.fixedSurcharge),
      notes: toText(form.notes),
      coverImageId,
      variantSummary,
      presetSnapshotJson: JSON.stringify(form.presetItems || []),
      calculationSnapshotJson: JSON.stringify(calculationSnapshot || {}),
      createdAt: now,
      updatedAt: now,
    },
    images,
    variants,
    fields,
  }
}
