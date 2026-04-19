<script setup>
import Panzoom from "@panzoom/panzoom"
import { convertFileSrc } from "@tauri-apps/api/core"
import { storeToRefs } from "pinia"
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from "vue"

import {
  createCalculationInputFields,
  createPresetFieldDefinitions,
  createPresetSummaryFieldConfigs,
  createProductBaseFields,
} from "@/constants/create"
import { booleanValueOptions } from "@/constants/preset"
import { useListStore } from "@/stores/list"
import { useOptionsStore } from "@/stores/options"
import { usePresetStore } from "@/stores/preset"
import { useTemplateStore } from "@/stores/template"
import {
  findOptionBackedFieldByFormKey,
  optionBackedFieldDefinitions,
} from "@/utils/app-fields"
import { buildListProductBundle } from "@/utils/list/record"
import { isTauriApp } from "@/utils/tauri/excel-file"
import { saveImageAsset } from "@/utils/tauri/image-asset"
import {
  describeTemplateLookupHit,
  getTemplateLookupValue,
} from "@/utils/template/lookup"

const CREATE_VIEW_DRAFT_STORAGE_KEY = "create:view:draft"

const presetStore = usePresetStore()
const templateStore = useTemplateStore()
const optionsStore = useOptionsStore()
const listStore = useListStore()
const {
  activePresetId,
  presetRecords,
  excelEmbeddedImages,
  excelEmbeddedImageStatus,
  excelEmbeddedImageErrorMessage,
} = storeToRefs(presetStore)
const { templateTables } = storeToRefs(templateStore)
const {
  getOptionLabelsByGroupKey,
  getOptionSelectItemsByGroupKey,
} = storeToRefs(optionsStore)

const selectedPresetId = ref("")
const extraProductFieldSeed = ref(1)
const imageLinkSeed = ref(2)
const variationGroupSeed = ref(1)
const variationOptionSeed = ref(1)
const calculationDriver = ref("listPrice")
const imageFileInputRef = ref(null)
const imageUploadErrorMessage = ref("")
const imagePreviewDialogOpen = ref(false)
const imagePreviewTitle = ref("")
const imagePreviewSrc = ref("")
const imagePreviewScale = ref(1)
const calculationProcessDialogOpen = ref(false)
const addToListStatusMessage = ref("")
const previewViewportRef = ref(null)
const previewImageRef = ref(null)
const previewOpenedAt = ref(0)
let previewPanzoom = null
let previewWheelHandler = null
let previewPanzoomChangeHandler = null
let hasRestoredCreateDraft = false
let isRestoringCreateDraft = false

const form = reactive({
  country: "",
  platform: "",
  listPrice: "",
  discountPrice: "",
  revenue: "",
  profitRate: "",
  netProfit: "",
  sellerShipping: "",
  fixedSurcharge: "",
  name: "",
  styleNo: "",
  cost: "",
  weight: "",
  category: "",
  adType: "",
  shippingIncluded: "",
  notes: "",
  presetItems: [],
  imageLinks: [
    {
      id: "product_image_1",
      value: "",
      previewUrl: "",
      fileName: "",
      source: "manual",
      variationGroupId: "",
      variationOptionId: "",
    },
  ],
  variationGroups: [],
  extraProductFields: [],
})

const presetOptions = computed(() =>
  presetRecords.value.map(item => ({
    title: item.country_platform,
    value: item.id,
    subtitle: `${item.country} / ${item.platform}`,
  })),
)

const selectedPresetRecord = computed(() =>
  presetRecords.value.find(item => item.id === selectedPresetId.value) || null,
)

const hasPresetRecords = computed(() => presetRecords.value.length > 0)
const presetSummaryFieldConfigs = createPresetSummaryFieldConfigs
const productPrimaryFieldKeys = ["name", "styleNo", "cost", "weight"]
const productSecondaryFieldKeys = ["category", "adType", "shippingIncluded"]
const calculationTargetFieldKeys = [
  "listPrice",
  "discountPrice",
  "revenue",
  "profitRate",
  "netProfit",
]
const calculationCostFieldKeys = ["sellerShipping", "fixedSurcharge"]

const primaryProductFields = computed(() =>
  createProductBaseFields.filter(field =>
    productPrimaryFieldKeys.includes(field.key),
  ),
)

const secondaryProductFields = computed(() =>
  createProductBaseFields.filter(field =>
    productSecondaryFieldKeys.includes(field.key),
  ),
)

const visibleProductFieldCount = computed(
  () =>
    primaryProductFields.value.length
    + secondaryProductFields.value.length,
)

const calculationDriverOptions = computed(() =>
  createCalculationInputFields
    .filter(field => calculationTargetFieldKeys.includes(field.key))
    .map(field => ({
      key: field.key,
      label: field.label,
      placeholder: field.placeholder,
      type: field.type,
    })),
)

const activeCalculationField = computed(
  () =>
    calculationDriverOptions.value.find(
      field => field.key === calculationDriver.value,
    )
    || calculationDriverOptions.value[0]
    || null,
)

const calculationCostFields = computed(() =>
  createCalculationInputFields.filter(field =>
    calculationCostFieldKeys.includes(field.key),
  ),
)

const presetSummaryItems = computed(() =>
  presetSummaryFieldConfigs
    .map((fieldConfig) => {
      const item = form.presetItems.find(
        entry => entry.name === fieldConfig.name,
      )

      if (!item) {
        return null
      }

      const value
        = item.type === "rule"
          ? getPresetSnapshotRuleName(item) || "未绑定规则表"
          : item.value || "未设置"

      return {
        id: item.id,
        item,
        label: fieldConfig.label || item.name,
        control: fieldConfig.control || "display",
        controlItems:
          fieldConfig.formKey === "shippingIncluded"
            ? booleanValueOptions
            : fieldConfig.items || [],
        itemTitle: fieldConfig.itemTitle || "title",
        itemValue: fieldConfig.itemValue || "value",
        value: item.unit ? `${value} ${item.unit}` : value,
      }
    })
    .filter(Boolean),
)

const variationGroupOptions = computed(() =>
  [
    { title: "不关联", value: "" },
    ...form.variationGroups.map((group, index) => ({
      title: group.name || `变体 ${index + 1}`,
      value: group.id,
    })),
  ],
)

const hasExcelEmbeddedImages = computed(
  () => excelEmbeddedImages.value.length > 0,
)

const presetDrivenFields = optionBackedFieldDefinitions.map(field => ({
  presetName: field.fieldName,
  formKey: field.formKey,
  normalize: field.normalize,
}))

function createExtraProductField() {
  const id = `product_extra_${Date.now()}_${extraProductFieldSeed.value}`

  extraProductFieldSeed.value += 1

  return {
    id,
    label: "",
    value: "",
  }
}

function getProductFieldItems(field) {
  const optionField = findOptionBackedFieldByFormKey(field.key)

  if (!optionField) {
    return []
  }

  return optionField.formKey === "shippingIncluded"
    ? getOptionSelectItemsByGroupKey.value(optionField.optionGroupKey)
    : getOptionLabelsByGroupKey.value(optionField.optionGroupKey)
}

function createImageLink(value = "") {
  const id = `product_image_${Date.now()}_${imageLinkSeed.value}`

  imageLinkSeed.value += 1

  return {
    id,
    value,
    previewUrl: "",
    fileName: "",
    source: "manual",
    variationGroupId: "",
    variationOptionId: "",
  }
}

function createVariationOption(value = "") {
  const id = `variation_option_${Date.now()}_${variationOptionSeed.value}`

  variationOptionSeed.value += 1

  return {
    id,
    value,
  }
}

function createVariationGroup() {
  const id = `variation_group_${Date.now()}_${variationGroupSeed.value}`

  variationGroupSeed.value += 1

  return {
    id,
    name: "",
    options: [createVariationOption()],
  }
}

function createPresetSnapshotItem(item) {
  const nextType
    = item?.type === "boolean"
      ? "boolean"
      : item?.type === "rule"
        ? "rule"
        : "number"
  const nextValue
    = nextType === "boolean"
      ? ["是", "否"].includes(item?.value)
          ? item.value
          : ""
      : String(item?.value ?? "")

  return {
    id: item?.id || "",
    name: item?.name || "",
    type: nextType,
    unit: item?.unit || "",
    value: nextValue,
    rule_table_id: item?.rule_table_id || "",
  }
}

function resetPresetSnapshot() {
  form.country = ""
  form.platform = ""
  form.presetItems = []
  presetDrivenFields.forEach((field) => {
    form[field.formKey] = ""
  })
}

function applyPresetRecord(record) {
  if (!record) {
    resetPresetSnapshot()
    return
  }

  form.country = record.country
  form.platform = record.platform
  form.presetItems = (record.items || []).map(createPresetSnapshotItem)
  applyPresetFieldDefaults(form.presetItems)
}

function findPresetDrivenFieldValue(field, items = form.presetItems) {
  const rawValue = items.find(item => item.name === field.presetName)?.value

  return field.normalize(rawValue)
}

function findPresetDrivenFieldValueByFormKey(
  formKey,
  items = form.presetItems,
) {
  const targetField = presetDrivenFields.find(
    field => field.formKey === formKey,
  )

  return targetField ? findPresetDrivenFieldValue(targetField, items) : ""
}

function applyPresetFieldDefaults(items = form.presetItems) {
  presetDrivenFields.forEach((field) => {
    form[field.formKey] = findPresetDrivenFieldValue(field, items)
  })
}

function ensureSelectedPreset() {
  const hasCurrent = presetRecords.value.some(
    item => item.id === selectedPresetId.value,
  )

  if (hasCurrent)
    return

  const nextPresetId = presetRecords.value.some(
    item => item.id === activePresetId.value,
  )
    ? activePresetId.value
    : presetRecords.value[0]?.id || ""

  selectedPresetId.value = nextPresetId
}

watch([presetRecords, activePresetId], ensureSelectedPreset, {
  immediate: true,
})

watch(
  presetRecords,
  () => {
    restoreCreateDraft()
  },
  { immediate: true, deep: true },
)

watch(
  selectedPresetRecord,
  (record) => {
    if (isRestoringCreateDraft) {
      return
    }

    applyPresetRecord(record)
  },
  { immediate: true },
)

function resetPresetItemsFromSource() {
  applyPresetRecord(selectedPresetRecord.value)
}

function resetProductFormFields() {
  form.listPrice = ""
  form.discountPrice = ""
  form.revenue = ""
  form.profitRate = ""
  form.netProfit = ""
  form.sellerShipping = ""
  form.fixedSurcharge = ""
  form.name = ""
  form.styleNo = ""
  form.cost = ""
  form.weight = ""
  form.category = ""
  form.adType = ""
  form.shippingIncluded = ""
  form.notes = ""
  form.extraProductFields = []
  form.variationGroups = []
  form.imageLinks.forEach((image) => {
    if (image.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(image.previewUrl)
    }
  })
  form.imageLinks = [createImageLink()]
  calculationDriver.value = "listPrice"
}

function resetCreatePage() {
  resetProductFormFields()
  resetPresetItemsFromSource()
  persistCreateDraft()
}

function updatePresetSnapshotItem(item, key, value) {
  item[key] = value

  if (key !== "type")
    return

  item.value = value === "boolean" ? "" : String(item.value ?? "")
  item.rule_table_id = value === "rule" ? item.rule_table_id || "" : ""
}

function updatePresetSummaryValue(item, value) {
  updatePresetSnapshotItem(item, "value", value)

  const targetField = presetDrivenFields.find(
    field => field.presetName === item.name,
  )

  if (targetField) {
    form[targetField.formKey] = targetField.normalize(value)
  }
}

function serializeImageLink(image) {
  return {
    id: image.id,
    value: image.value,
    previewUrl: image.previewUrl?.startsWith("blob:") ? "" : image.previewUrl,
    fileName: image.fileName,
    source: image.source,
    variationGroupId: image.variationGroupId,
    variationOptionId: image.variationOptionId,
  }
}

function createDraftPayload() {
  return {
    selectedPresetId: selectedPresetId.value,
    calculationDriver: calculationDriver.value,
    form: {
      listPrice: form.listPrice,
      discountPrice: form.discountPrice,
      revenue: form.revenue,
      profitRate: form.profitRate,
      netProfit: form.netProfit,
      fixedSurcharge: form.fixedSurcharge,
      name: form.name,
      styleNo: form.styleNo,
      cost: form.cost,
      weight: form.weight,
      category: form.category,
      adType: form.adType,
      shippingIncluded: form.shippingIncluded,
      notes: form.notes,
      presetItems: form.presetItems.map(item => ({ ...item })),
      imageLinks: form.imageLinks.map(serializeImageLink),
      variationGroups: form.variationGroups.map(group => ({
        id: group.id,
        name: group.name,
        options: group.options.map(option => ({
          id: option.id,
          value: option.value,
        })),
      })),
      extraProductFields: form.extraProductFields.map(field => ({ ...field })),
    },
  }
}

function persistCreateDraft() {
  if (isRestoringCreateDraft) {
    return
  }

  localStorage.setItem(
    CREATE_VIEW_DRAFT_STORAGE_KEY,
    JSON.stringify(createDraftPayload()),
  )
}

function restoreCreateDraft() {
  if (hasRestoredCreateDraft || !presetRecords.value.length) {
    return
  }

  hasRestoredCreateDraft = true

  const rawDraft = localStorage.getItem(CREATE_VIEW_DRAFT_STORAGE_KEY)

  if (!rawDraft) {
    return
  }

  try {
    const draft = JSON.parse(rawDraft)
    const nextPresetId = presetRecords.value.some(
      item => item.id === draft?.selectedPresetId,
    )
      ? draft.selectedPresetId
      : selectedPresetId.value

    isRestoringCreateDraft = true

    if (nextPresetId) {
      selectedPresetId.value = nextPresetId
    }

    const draftForm = draft?.form || {}

    form.listPrice = draftForm.listPrice || ""
    form.discountPrice = draftForm.discountPrice || ""
    form.revenue = draftForm.revenue || ""
    form.profitRate = draftForm.profitRate || ""
    form.netProfit = draftForm.netProfit || ""
    form.fixedSurcharge = draftForm.fixedSurcharge || ""
    form.name = draftForm.name || ""
    form.styleNo = draftForm.styleNo || ""
    form.cost = draftForm.cost || ""
    form.weight = draftForm.weight || ""
    form.category = draftForm.category || ""
    form.adType = draftForm.adType || ""
    form.shippingIncluded = draftForm.shippingIncluded || ""
    form.notes = draftForm.notes || ""
    form.presetItems = Array.isArray(draftForm.presetItems)
      ? draftForm.presetItems.map(createPresetSnapshotItem)
      : form.presetItems
    form.imageLinks
      = Array.isArray(draftForm.imageLinks) && draftForm.imageLinks.length
        ? draftForm.imageLinks.map(image => ({
            ...createImageLink(),
            ...image,
          }))
        : [createImageLink()]
    form.variationGroups = Array.isArray(draftForm.variationGroups)
      ? draftForm.variationGroups.map(group => ({
          id: group.id || createVariationGroup().id,
          name: group.name || "",
          options: Array.isArray(group.options) && group.options.length
            ? group.options.map(option => ({
                id: option.id || createVariationOption().id,
                value: option.value || "",
              }))
            : [createVariationOption()],
        }))
      : []
    form.extraProductFields = Array.isArray(draftForm.extraProductFields)
      ? draftForm.extraProductFields.map(field => ({
          id: field.id || createExtraProductField().id,
          label: field.label || "",
          value: field.value || "",
        }))
      : []
    calculationDriver.value = draft?.calculationDriver || "listPrice"
  }
  catch {
    localStorage.removeItem(CREATE_VIEW_DRAFT_STORAGE_KEY)
  }
  finally {
    isRestoringCreateDraft = false
  }
}

function getPresetSnapshotRuleName(item) {
  if (item.type !== "rule" || !item.rule_table_id)
    return ""

  return (
    templateTables.value.find(table => table.id === item.rule_table_id)?.name || ""
  )
}

function addExtraProductField() {
  form.extraProductFields.push(createExtraProductField())
}

function addImageLink() {
  imageUploadErrorMessage.value = ""
  form.imageLinks.push(createImageLink())
}

function removeImageLink(id) {
  const target = form.imageLinks.find(item => item.id === id)

  if (target?.previewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(target.previewUrl)
  }

  if (form.imageLinks.length === 1) {
    form.imageLinks[0].value = ""
    form.imageLinks[0].previewUrl = ""
    form.imageLinks[0].fileName = ""
    form.imageLinks[0].source = "manual"
    form.imageLinks[0].variationGroupId = ""
    form.imageLinks[0].variationOptionId = ""
    return
  }

  form.imageLinks = form.imageLinks.filter(item => item.id !== id)
}

function getImagePreviewSrc(image) {
  if (image?.previewUrl) {
    return image.previewUrl
  }

  const value = String(image?.value ?? "").trim()

  if (
    ["local", "excel"].includes(image?.source)
    && value
    && isTauriApp()
  ) {
    return convertFileSrc(value)
  }

  if (/^(?:https?:\/\/|data:image\/|blob:)/i.test(value)) {
    return value
  }

  return ""
}

function getEmbeddedExcelImagePreviewSrc(asset) {
  if (!asset?.filePath || !isTauriApp()) {
    return ""
  }

  return convertFileSrc(asset.filePath)
}

function openImagePreview(src, title = "图片预览") {
  if (!src) {
    return
  }

  imagePreviewSrc.value = src
  imagePreviewTitle.value = title
  imagePreviewScale.value = 1
  previewOpenedAt.value = Date.now()
  imagePreviewDialogOpen.value = true
}

function openEmbeddedExcelImagePreview(asset) {
  openImagePreview(
    getEmbeddedExcelImagePreviewSrc(asset),
    `${asset.sheetName} · ${asset.cell}`,
  )
}

function openProductImagePreview(image, index) {
  openImagePreview(
    getImagePreviewSrc(image),
    image.fileName || `图片 ${index + 1}`,
  )
}

function zoomInPreviewImage() {
  previewPanzoom?.zoomIn()
}

function zoomOutPreviewImage() {
  previewPanzoom?.zoomOut()
}

function resetPreviewImageScale() {
  previewPanzoom?.reset({ animate: false })
  imagePreviewScale.value = 1
}

function destroyPreviewPanzoom() {
  if (previewViewportRef.value && previewWheelHandler) {
    previewViewportRef.value.removeEventListener("wheel", previewWheelHandler)
  }

  if (previewImageRef.value && previewPanzoomChangeHandler) {
    previewImageRef.value.removeEventListener(
      "panzoomchange",
      previewPanzoomChangeHandler,
    )
  }

  previewWheelHandler = null
  previewPanzoomChangeHandler = null

  if (previewPanzoom) {
    previewPanzoom.destroy()
    previewPanzoom = null
  }
}

function initializePreviewPanzoom() {
  if (
    !imagePreviewDialogOpen.value
    || !previewImageRef.value
    || !previewViewportRef.value
  ) {
    return
  }

  destroyPreviewPanzoom()

  previewPanzoom = Panzoom(previewImageRef.value, {
    maxScale: 4,
    minScale: 0.25,
    step: 0.25,
    cursor: "grab",
    contain: "outside",
  })

  previewPanzoomChangeHandler = (event) => {
    imagePreviewScale.value = event.detail.scale
  }

  previewImageRef.value.addEventListener(
    "panzoomchange",
    previewPanzoomChangeHandler,
  )

  previewWheelHandler = (event) => {
    if (Date.now() - previewOpenedAt.value < 240) {
      event.preventDefault()
      return
    }

    event.preventDefault()
    previewPanzoom?.zoomWithWheel(event)
  }

  previewViewportRef.value.addEventListener("wheel", previewWheelHandler, {
    passive: false,
  })

  previewPanzoom.reset({ animate: false })
  imagePreviewScale.value = previewPanzoom.getScale()
}

function getVariationOptionOptions(groupId) {
  const target = form.variationGroups.find(item => item.id === groupId)

  if (!target) {
    return [{ title: "不关联", value: "" }]
  }

  return [
    { title: "不关联", value: "" },
    ...target.options.map((option, index) => ({
      title: option.value || `选项 ${index + 1}`,
      value: option.id,
    })),
  ]
}

function updateImageVariationGroup(image, groupId) {
  image.variationGroupId = groupId || ""
  image.variationOptionId = ""
}

function updateImageVariationOption(image, optionId) {
  image.variationOptionId = optionId || ""
}

function handleUseEmbeddedExcelImage(asset) {
  const existed = form.imageLinks.some(image => image.value === asset.filePath)

  if (existed) {
    return
  }

  applyImageLinkPayload({
    value: asset.filePath,
    previewUrl: "",
    fileName: asset.fileName,
    source: "excel",
  })
}

function openImagePicker() {
  imageFileInputRef.value?.click?.()
}

function applyImageLinkPayload(payload) {
  const shouldReuseEmptyRow
    = form.imageLinks.length === 1
      && !form.imageLinks[0].value
      && !form.imageLinks[0].previewUrl

  if (shouldReuseEmptyRow) {
    const target = form.imageLinks[0]

    target.value = payload.value
    target.previewUrl = payload.previewUrl
    target.fileName = payload.fileName
    target.source = payload.source

    return
  }

  const nextImage = createImageLink(payload.value)

  nextImage.previewUrl = payload.previewUrl
  nextImage.fileName = payload.fileName
  nextImage.source = payload.source
  form.imageLinks.push(nextImage)
}

async function handleImageFileSelection(event) {
  const input = event?.target
  const files = Array.from(input?.files || [])

  if (!files.length) {
    return
  }

  imageUploadErrorMessage.value = ""

  for (const file of files) {
    let previewUrl = ""

    try {
      previewUrl = URL.createObjectURL(file)

      if (isTauriApp()) {
        const bytes = new Uint8Array(await file.arrayBuffer())
        const savedImage = await saveImageAsset(bytes, file.name)

        applyImageLinkPayload({
          value: savedImage.filePath,
          previewUrl,
          fileName: savedImage.fileName,
          source: "local",
        })
      }
      else {
        applyImageLinkPayload({
          value: previewUrl,
          previewUrl,
          fileName: file.name,
          source: "upload",
        })
      }
    }
    catch (error) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }

      imageUploadErrorMessage.value = error?.message || "图片保存失败"
      break
    }
  }

  if (input) {
    input.value = ""
  }
}

onBeforeUnmount(() => {
  destroyPreviewPanzoom()
  form.imageLinks.forEach((image) => {
    if (image.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(image.previewUrl)
    }
  })
})

watch(
  () =>
    form.variationGroups.map(group => ({
      id: group.id,
      optionIds: group.options.map(option => option.id),
    })),
  (groups) => {
    const groupIds = new Set(groups.map(group => group.id))
    const optionIdsByGroup = new Map(
      groups.map(group => [group.id, new Set(group.optionIds)]),
    )

    form.imageLinks.forEach((image) => {
      if (!image.variationGroupId) {
        image.variationOptionId = ""
        return
      }

      if (!groupIds.has(image.variationGroupId)) {
        image.variationGroupId = ""
        image.variationOptionId = ""
        return
      }

      const optionIds = optionIdsByGroup.get(image.variationGroupId)

      if (!image.variationOptionId || optionIds?.has(image.variationOptionId)) {
        return
      }

      image.variationOptionId = ""
    })
  },
  { deep: true },
)

watch(imagePreviewDialogOpen, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      initializePreviewPanzoom()
    })
    return
  }

  destroyPreviewPanzoom()
  imagePreviewScale.value = 1
})

watch(imagePreviewSrc, () => {
  if (!imagePreviewDialogOpen.value) {
    return
  }

  nextTick(() => {
    initializePreviewPanzoom()
  })
})

watch(
  () => createDraftPayload(),
  () => {
    persistCreateDraft()
  },
  { deep: true },
)

function addVariationGroup() {
  form.variationGroups.push(createVariationGroup())
}

function removeVariationGroup(id) {
  form.variationGroups = form.variationGroups.filter(item => item.id !== id)
}

function addVariationOption(groupId) {
  const target = form.variationGroups.find(item => item.id === groupId)

  if (!target)
    return

  target.options.push(createVariationOption())
}

function removeVariationOption(groupId, optionId) {
  const target = form.variationGroups.find(item => item.id === groupId)

  if (!target)
    return

  target.options = target.options.filter(item => item.id !== optionId)

  if (!target.options.length) {
    target.options = [createVariationOption()]
  }
}

function removeExtraProductField(id) {
  form.extraProductFields = form.extraProductFields.filter(
    item => item.id !== id,
  )
}

function toNumber(value) {
  const nextValue = Number(value)

  return Number.isFinite(nextValue) ? nextValue : 0
}

function roundValue(value) {
  return Math.round(value * 100) / 100
}

function formatNumber(value, suffix = "") {
  return `${roundValue(value).toFixed(2)}${suffix}`
}

function formatEditableNumber(value) {
  const roundedValue = roundValue(value)

  if (!roundedValue)
    return "0"

  return `${roundedValue}`.replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1")
}

function findPresetSnapshotValue(name) {
  return form.presetItems.find(item => item.name === name)?.value || ""
}

function findPresetSnapshotItem(name) {
  return form.presetItems.find(item => item.name === name) || null
}

function findPresetSnapshotNumber(name) {
  return toNumber(findPresetSnapshotValue(name))
}

function findPresetSnapshotUnit(name) {
  return form.presetItems.find(item => item.name === name)?.unit || ""
}

function findPresetMoneyUnit() {
  return form.presetItems.find(
    item => item.unit && item.unit !== "%",
  )?.unit || ""
}

function formatProcessValue(value, suffix = "") {
  return `${formatEditableNumber(value)}${suffix}`
}

function getCurrentShippingIncludedValue() {
  return (
    form.shippingIncluded
    || findPresetDrivenFieldValueByFormKey("shippingIncluded")
    || ""
  )
}

function findCreatePresetFieldName(key) {
  return createPresetFieldDefinitions[key]?.name || ""
}

function lookupTemplateTableValue(tableId, args = []) {
  const table = templateTables.value.find(item => item.id === tableId)

  if (!table) {
    return 0
  }

  return toNumber(getTemplateLookupValue(table, args))
}

const shippingLookupMeta = computed(() => {
  const shippingRuleItem = findPresetSnapshotItem(
    findCreatePresetFieldName("shippingRule"),
  )
  const shippingIncluded = getCurrentShippingIncludedValue()
  const discountRate = findPresetSnapshotNumber(
    findCreatePresetFieldName("discountRate"),
  )
  const discountFactor = 1 - discountRate / 100
  const lookupDiscountPrice
    = calculationDriver.value === "discountPrice"
      ? toNumber(form.discountPrice)
      : calculationDriver.value === "revenue"
        ? toNumber(form.revenue)
        : calculationDriver.value === "listPrice"
          ? toNumber(form.listPrice) * discountFactor
          : toNumber(form.discountPrice)
  const weight = toNumber(form.weight)
  const table = templateTables.value.find(
    item => item.id === shippingRuleItem?.rule_table_id,
  )

  if (shippingIncluded === "是") {
    return {
      mode: "free_shipping",
      lookupDiscountPrice,
      weight,
      hitDetails: [],
      tableName: "",
    }
  }

  if (!shippingRuleItem?.rule_table_id || !table) {
    return {
      mode: "missing_rule",
      lookupDiscountPrice,
      weight,
      hitDetails: [],
      tableName: "",
    }
  }

  const lookupArgs = [lookupDiscountPrice, weight]

  return {
    mode: "table_lookup",
    lookupDiscountPrice,
    weight,
    hitDetails: describeTemplateLookupHit(table, lookupArgs),
    tableName:
      table.name
      || shippingRuleItem.name
      || findCreatePresetFieldName("shippingRule"),
  }
})

const resolvedSellerShipping = computed(() => {
  const shippingRuleItem = findPresetSnapshotItem(
    findCreatePresetFieldName("shippingRule"),
  )
  const shippingIncluded = getCurrentShippingIncludedValue()
  const discountRate = findPresetSnapshotNumber(
    findCreatePresetFieldName("discountRate"),
  )
  const discountFactor = 1 - discountRate / 100
  const lookupDiscountPrice
    = calculationDriver.value === "discountPrice"
      ? toNumber(form.discountPrice)
      : calculationDriver.value === "revenue"
        ? toNumber(form.revenue)
        : calculationDriver.value === "listPrice"
          ? toNumber(form.listPrice) * discountFactor
          : toNumber(form.discountPrice)

  if (shippingIncluded === "是") {
    return 0
  }

  if (!shippingRuleItem?.rule_table_id) {
    return 0
  }

  return lookupTemplateTableValue(shippingRuleItem.rule_table_id, [
    lookupDiscountPrice,
    toNumber(form.weight),
  ])
})

const calculationSnapshot = computed(() => {
  const baseListPrice = toNumber(form.listPrice)
  const baseDiscountPrice = toNumber(form.discountPrice)
  const baseRevenue = toNumber(form.revenue)
  const baseProfitRate = toNumber(form.profitRate)
  const baseNetProfit = toNumber(form.netProfit)
  const sellerShipping = resolvedSellerShipping.value
  const fixedSurcharge = toNumber(form.fixedSurcharge)
  const cost = toNumber(form.cost)
  const discountRate = findPresetSnapshotNumber(
    findCreatePresetFieldName("discountRate"),
  )
  const activityRate = findPresetSnapshotNumber(
    findCreatePresetFieldName("activityRate"),
  )
  const transactionRate = findPresetSnapshotNumber(
    findCreatePresetFieldName("transactionRate"),
  )
  const withdrawRate = findPresetSnapshotNumber(
    findCreatePresetFieldName("withdrawRate"),
  )
  const exchangeLossRate = findPresetSnapshotNumber(
    findCreatePresetFieldName("exchangeLossRate"),
  )
  const taxRate = findPresetSnapshotNumber(findCreatePresetFieldName("taxRate"))
  const labelFee = findPresetSnapshotNumber(
    findCreatePresetFieldName("labelFee"),
  )
  const discountFactor = 1 - discountRate / 100
  const variableRate
    = (activityRate
      + transactionRate
      + withdrawRate
      + exchangeLossRate
      + taxRate)
    / 100
  const baseFixedCost = labelFee + sellerShipping + fixedSurcharge + cost
  let discountPrice = 0

  if (calculationDriver.value === "discountPrice") {
    discountPrice = baseDiscountPrice
  }
  else if (calculationDriver.value === "revenue") {
    discountPrice = baseRevenue
  }
  else if (calculationDriver.value === "profitRate") {
    const denominator = 1 - variableRate - baseProfitRate / 100

    discountPrice = denominator > 0 ? baseFixedCost / denominator : 0
  }
  else if (calculationDriver.value === "netProfit") {
    const denominator = 1 - variableRate

    discountPrice = denominator > 0
      ? (baseNetProfit + baseFixedCost) / denominator
      : 0
  }
  else {
    discountPrice = baseListPrice * discountFactor
  }

  const listPrice = discountFactor > 0 ? discountPrice / discountFactor : 0
  const activityFee = discountPrice * (activityRate / 100)
  const transactionFee = discountPrice * (transactionRate / 100)
  const withdrawFee = discountPrice * (withdrawRate / 100)
  const exchangeLossFee = discountPrice * (exchangeLossRate / 100)
  const taxFee = discountPrice * (taxRate / 100)
  const totalFee
    = activityFee
      + transactionFee
      + withdrawFee
      + exchangeLossFee
      + taxFee
      + labelFee
      + sellerShipping
      + fixedSurcharge
  const revenue = discountPrice
  const netProfit = revenue - totalFee - cost
  const profitRate
    = calculationDriver.value === "profitRate" && revenue > 0
      ? baseProfitRate
      : revenue > 0
        ? (netProfit / revenue) * 100
        : 0

  return {
    discountRate,
    activityRate,
    transactionRate,
    withdrawRate,
    exchangeLossRate,
    taxRate,
    labelFee,
    listPrice,
    discountPrice,
    sellerShipping,
    fixedSurcharge,
    activityFee,
    transactionFee,
    withdrawFee,
    exchangeLossFee,
    taxFee,
    totalFee,
    revenue,
    netProfit,
    profitRate,
    shippingDefault:
      findPresetDrivenFieldValueByFormKey("shippingIncluded") || "未设置",
    shippingIncluded: getCurrentShippingIncludedValue() || "未设置",
  }
})

function getCalculationDriverLabel() {
  return calculationDriver.value === "discountPrice"
    ? "折后售价"
    : calculationDriver.value === "revenue"
      ? "收入"
      : calculationDriver.value === "profitRate"
        ? "利润率"
        : calculationDriver.value === "netProfit"
          ? "净利润"
          : "折前价格"
}

function addCurrentProductToList() {
  const bundle = buildListProductBundle({
    form,
    calculationSnapshot: calculationSnapshot.value,
    calculationDriver: calculationDriver.value,
    calculationDriverText: getCalculationDriverLabel(),
  })

  listStore.addProductBundle(bundle)
  addToListStatusMessage.value = `已加入列表 · ${bundle.record.name}`
}

const calculationDriverText = computed(() => getCalculationDriverLabel())

const moneyUnitSuffix = computed(() =>
  findPresetMoneyUnit() ? ` ${findPresetMoneyUnit()}` : "",
)

const primaryResultHighlights = computed(() => [
  {
    label: "净利润",
    value: formatNumber(
      calculationSnapshot.value.netProfit,
      moneyUnitSuffix.value,
    ),
  },
  {
    label: "利润率",
    value: formatNumber(calculationSnapshot.value.profitRate, " %"),
  },
])

const resultSummaryItems = computed(() => [
  {
    label: "组合",
    value:
      form.country && form.platform
        ? `${form.country} / ${form.platform}`
        : "未选择",
  },
  {
    label: "当前基准",
    value: calculationDriverText.value,
  },
  {
    label: "折前价",
    value: formatNumber(
      calculationSnapshot.value.listPrice,
      moneyUnitSuffix.value,
    ),
  },
  {
    label: "折后价",
    value: formatNumber(
      calculationSnapshot.value.discountPrice,
      moneyUnitSuffix.value,
    ),
  },
  {
    label: "收入",
    value: formatNumber(
      calculationSnapshot.value.revenue,
      moneyUnitSuffix.value,
    ),
  },
  {
    label: "总费用",
    value: formatNumber(
      calculationSnapshot.value.totalFee,
      moneyUnitSuffix.value,
    ),
  },
  {
    label: "商品是否包邮",
    value: calculationSnapshot.value.shippingIncluded,
  },
  {
    label: "预设是否包邮",
    value: calculationSnapshot.value.shippingDefault,
  },
])

const feeSummaryItems = computed(() => [
  {
    label: "活动费",
    value: formatNumber(
      calculationSnapshot.value.activityFee,
      moneyUnitSuffix.value,
    ),
  },
  {
    label: "交易费",
    value: formatNumber(
      calculationSnapshot.value.transactionFee,
      moneyUnitSuffix.value,
    ),
  },
  {
    label: "提现费",
    value: formatNumber(
      calculationSnapshot.value.withdrawFee,
      moneyUnitSuffix.value,
    ),
  },
  {
    label: "汇损金额",
    value: formatNumber(
      calculationSnapshot.value.exchangeLossFee,
      moneyUnitSuffix.value,
    ),
  },
  {
    label: "税费",
    value: formatNumber(
      calculationSnapshot.value.taxFee,
      moneyUnitSuffix.value,
    ),
  },
  {
    label: "贴单费",
    value: formatNumber(
      calculationSnapshot.value.labelFee,
      findPresetSnapshotUnit(findCreatePresetFieldName("labelFee"))
        ? ` ${findPresetSnapshotUnit(findCreatePresetFieldName("labelFee"))}`
        : moneyUnitSuffix.value
          ? moneyUnitSuffix.value
          : "",
    ),
  },
  {
    label: "卖家运费",
    value: formatNumber(
      calculationSnapshot.value.sellerShipping,
      moneyUnitSuffix.value,
    ),
  },
  {
    label: "固定附加",
    value: formatNumber(
      calculationSnapshot.value.fixedSurcharge,
      moneyUnitSuffix.value,
    ),
  },
  {
    label: "成本",
    value: formatNumber(toNumber(form.cost), moneyUnitSuffix.value),
  },
])

const calculationProcessSections = computed(() => {
  const snapshot = calculationSnapshot.value
  const money = moneyUnitSuffix.value
  const percent = " %"
  const baseListPrice = toNumber(form.listPrice)
  const baseDiscountPrice = toNumber(form.discountPrice)
  const baseRevenue = toNumber(form.revenue)
  const baseProfitRate = toNumber(form.profitRate)
  const baseNetProfit = toNumber(form.netProfit)
  const discountRate = snapshot.discountRate
  const discountFactor = 1 - discountRate / 100
  const variableRate
    = snapshot.activityRate
      + snapshot.transactionRate
      + snapshot.withdrawRate
      + snapshot.exchangeLossRate
      + snapshot.taxRate
  const fixedCostBase
    = snapshot.labelFee
      + snapshot.sellerShipping
      + snapshot.fixedSurcharge
      + toNumber(form.cost)

  const targetStep
    = calculationDriver.value === "discountPrice"
      ? {
          label: "反推折后价",
          formula: "折后价 = 输入的折后售价",
          detail: `${formatProcessValue(baseDiscountPrice, money)} = ${formatProcessValue(snapshot.discountPrice, money)}`,
        }
      : calculationDriver.value === "revenue"
        ? {
            label: "反推折后价",
            formula: "折后价 = 输入的收入",
            detail: `${formatProcessValue(baseRevenue, money)} = ${formatProcessValue(snapshot.discountPrice, money)}`,
          }
        : calculationDriver.value === "profitRate"
          ? {
              label: "反推折后价",
              formula:
                "折后价 = 固定成本底数 ÷ (1 - 综合费率 - 目标利润率)",
              detail:
                `${formatProcessValue(fixedCostBase, money)} ÷ `
                + `(1 - ${formatProcessValue(variableRate, percent)} - `
                + `${formatProcessValue(baseProfitRate, percent)}) = `
                + `${formatProcessValue(snapshot.discountPrice, money)}`,
            }
          : calculationDriver.value === "netProfit"
            ? {
                label: "反推折后价",
                formula: "折后价 = (目标净利润 + 固定成本底数) ÷ (1 - 综合费率)",
                detail:
                  `(${formatProcessValue(baseNetProfit, money)} + `
                  + `${formatProcessValue(fixedCostBase, money)}) ÷ `
                  + `(1 - ${formatProcessValue(variableRate, percent)}) = `
                  + `${formatProcessValue(snapshot.discountPrice, money)}`,
              }
            : {
                label: "折后价计算",
                formula: "折后价 = 折前价 × 折扣系数",
                detail:
                  `${formatProcessValue(baseListPrice, money)} × `
                  + `${formatProcessValue(discountFactor)} = `
                  + `${formatProcessValue(snapshot.discountPrice, money)}`,
              }

  const shippingStep
    = shippingLookupMeta.value.mode === "free_shipping"
      ? {
          label: "卖家运费",
          formula: "若商品是否包邮 = 是，则卖家运费 = 0",
          detail: `商品是否包邮为“是”，所以卖家运费 = ${formatProcessValue(0, money)}`,
        }
      : shippingLookupMeta.value.mode === "table_lookup"
        ? {
            label: "卖家运费查表",
            formula: "按规则表维度顺序匹配记录",
            detail:
              `查表 ${shippingLookupMeta.value.tableName}：${shippingLookupMeta.value.hitDetails
                .map(
                  item =>
                    `${item.fieldName}=${formatProcessValue(item.inputValue)} `
                    + `命中 ${item.matchedLabel || "-"}`,
                )
                .join("；")}，结果 = ${formatProcessValue(snapshot.sellerShipping, money)}`,
          }
        : {
            label: "卖家运费",
            formula: "未命中有效规则时，卖家运费按 0 处理",
            detail: `当前没有可用的“卖家支付运费”规则，结果 = ${formatProcessValue(0, money)}`,
          }

  return [
    {
      title: "输入与基准",
      items: [
        {
          label: "当前反推目标",
          formula: "当前输入字段决定反推方向",
          detail: `${getCalculationDriverLabel()} 作为当前基准`,
        },
        {
          label: "折扣系数",
          formula: "折扣系数 = 1 - 折扣 ÷ 100",
          detail:
            `1 - ${formatProcessValue(discountRate, percent)} = `
            + `${formatProcessValue(discountFactor)}`,
        },
        shippingStep,
        {
          label: "固定成本底数",
          formula: "固定成本底数 = 贴单费 + 卖家运费 + 固定附加 + 成本",
          detail:
            `${formatProcessValue(snapshot.labelFee, money)} + `
            + `${formatProcessValue(snapshot.sellerShipping, money)} + `
            + `${formatProcessValue(snapshot.fixedSurcharge, money)} + `
            + `${formatProcessValue(toNumber(form.cost), money)} = `
            + `${formatProcessValue(fixedCostBase, money)}`,
        },
        {
          label: "综合费率",
          formula: "综合费率 = 活动费率 + 交易费率 + 提现费率 + 汇损 + 税率",
          detail:
            `${formatProcessValue(snapshot.activityRate, percent)} + `
            + `${formatProcessValue(snapshot.transactionRate, percent)} + `
            + `${formatProcessValue(snapshot.withdrawRate, percent)} + `
            + `${formatProcessValue(snapshot.exchangeLossRate, percent)} + `
            + `${formatProcessValue(snapshot.taxRate, percent)} = `
            + `${formatProcessValue(variableRate, percent)}`,
        },
        targetStep,
        {
          label: "折前价",
          formula: "折前价 = 折后价 ÷ 折扣系数",
          detail:
            `${formatProcessValue(snapshot.discountPrice, money)} ÷ `
            + `${formatProcessValue(discountFactor)} = `
            + `${formatProcessValue(snapshot.listPrice, money)}`,
        },
      ],
    },
    {
      title: "费用拆解",
      items: [
        {
          label: "活动费",
          formula: "活动费 = 折后价 × 活动费率",
          detail:
            `${formatProcessValue(snapshot.discountPrice, money)} × `
            + `${formatProcessValue(snapshot.activityRate, percent)} = `
            + `${formatProcessValue(snapshot.activityFee, money)}`,
        },
        {
          label: "交易费",
          formula: "交易费 = 折后价 × 交易费率",
          detail:
            `${formatProcessValue(snapshot.discountPrice, money)} × `
            + `${formatProcessValue(snapshot.transactionRate, percent)} = `
            + `${formatProcessValue(snapshot.transactionFee, money)}`,
        },
        {
          label: "提现费",
          formula: "提现费 = 折后价 × 提现费率",
          detail:
            `${formatProcessValue(snapshot.discountPrice, money)} × `
            + `${formatProcessValue(snapshot.withdrawRate, percent)} = `
            + `${formatProcessValue(snapshot.withdrawFee, money)}`,
        },
        {
          label: "汇损金额",
          formula: "汇损金额 = 折后价 × 汇损率",
          detail:
            `${formatProcessValue(snapshot.discountPrice, money)} × `
            + `${formatProcessValue(snapshot.exchangeLossRate, percent)} = `
            + `${formatProcessValue(snapshot.exchangeLossFee, money)}`,
        },
        {
          label: "税费",
          formula: "税费 = 折后价 × 税率",
          detail:
            `${formatProcessValue(snapshot.discountPrice, money)} × `
            + `${formatProcessValue(snapshot.taxRate, percent)} = `
            + `${formatProcessValue(snapshot.taxFee, money)}`,
        },
        {
          label: "总费用",
          formula:
            "总费用 = 活动费 + 交易费 + 提现费 + 汇损金额 + 税费 + 贴单费 + 卖家运费 + 固定附加",
          detail:
            `${formatProcessValue(snapshot.activityFee, money)} + `
            + `${formatProcessValue(snapshot.transactionFee, money)} + `
            + `${formatProcessValue(snapshot.withdrawFee, money)} + `
            + `${formatProcessValue(snapshot.exchangeLossFee, money)} + `
            + `${formatProcessValue(snapshot.taxFee, money)} + `
            + `${formatProcessValue(snapshot.labelFee, money)} + `
            + `${formatProcessValue(snapshot.sellerShipping, money)} + `
            + `${formatProcessValue(snapshot.fixedSurcharge, money)} = `
            + `${formatProcessValue(snapshot.totalFee, money)}`,
        },
      ],
    },
    {
      title: "结果输出",
      items: [
        {
          label: "收入",
          formula: "收入 = 折后价",
          detail:
            `${formatProcessValue(snapshot.discountPrice, money)} = `
            + `${formatProcessValue(snapshot.revenue, money)}`,
        },
        {
          label: "净利润",
          formula: "净利润 = 收入 - 总费用 - 成本",
          detail:
            `${formatProcessValue(snapshot.revenue, money)} - `
            + `${formatProcessValue(snapshot.totalFee, money)} - `
            + `${formatProcessValue(toNumber(form.cost), money)} = `
            + `${formatProcessValue(snapshot.netProfit, money)}`,
        },
        {
          label: "利润率",
          formula:
            calculationDriver.value === "profitRate"
              ? "利润率由当前目标直接指定"
              : "利润率 = 净利润 ÷ 收入 × 100",
          detail:
            calculationDriver.value === "profitRate"
              ? `${formatProcessValue(baseProfitRate, percent)}`
              : `${formatProcessValue(snapshot.netProfit, money)} ÷ `
                + `${formatProcessValue(snapshot.revenue, money)} × 100 = `
                + `${formatProcessValue(snapshot.profitRate, percent)}`,
        },
      ],
    },
  ]
})

function getCalculationFieldValue(key) {
  if (key === "sellerShipping") {
    return formatEditableNumber(resolvedSellerShipping.value)
  }

  if (key === "listPrice") {
    return calculationDriver.value === "listPrice"
      ? form.listPrice
      : formatEditableNumber(calculationSnapshot.value.listPrice)
  }

  if (key === "discountPrice") {
    return calculationDriver.value === "discountPrice"
      ? form.discountPrice
      : formatEditableNumber(calculationSnapshot.value.discountPrice)
  }

  if (key === "revenue") {
    return calculationDriver.value === "revenue"
      ? form.revenue
      : formatEditableNumber(calculationSnapshot.value.revenue)
  }

  if (key === "profitRate") {
    return calculationDriver.value === "profitRate"
      ? form.profitRate
      : formatEditableNumber(calculationSnapshot.value.profitRate)
  }

  if (key === "netProfit") {
    return calculationDriver.value === "netProfit"
      ? form.netProfit
      : formatEditableNumber(calculationSnapshot.value.netProfit)
  }

  return form[key]
}

function updateCalculationField(key, value) {
  form[key] = value

  if (
    ["listPrice", "discountPrice", "revenue", "profitRate", "netProfit"].includes(
      key,
    )
  ) {
    calculationDriver.value = key
  }
}

function setCalculationDriver(key) {
  calculationDriver.value = key
}
</script>

<template>
  <div class="h-full min-h-0 overflow-y-auto pr-2">
    <div class="workspace-page-grid">
      <VCard
        class="
          workspace-sheet overflow-hidden border border-[#c6c6c6] bg-white
        "
      >
        <div
          class="
            flex flex-wrap gap-2 border-b border-[#c6c6c6] bg-[#f8f8f8]
            px-4 py-3
          "
        >
          <div
            class="inline-flex items-center gap-2 text-[13px] text-[#161616]"
          >
            <span
              class="
                inline-flex h-5 w-5 items-center justify-center border
                border-[#c6c6c6] text-xs
              "
            >1</span>
            <span>预设</span>
          </div>
          <div
            class="inline-flex items-center gap-2 text-[13px] text-[#161616]"
          >
            <span
              class="
                inline-flex h-5 w-5 items-center justify-center border
                border-[#c6c6c6] text-xs
              "
            >2</span>
            <span>商品</span>
          </div>
          <div
            class="inline-flex items-center gap-2 text-[13px] text-[#161616]"
          >
            <span
              class="
                inline-flex h-5 w-5 items-center justify-center border
                border-[#c6c6c6] text-xs
              "
            >3</span>
            <span>目标</span>
          </div>
          <div
            class="inline-flex items-center gap-2 text-[13px] text-[#6f6f6f]"
          >
            <span
              class="
                inline-flex h-5 w-5 items-center justify-center border
                border-[#c6c6c6] text-xs
              "
            >4</span>
            <span>结果</span>
          </div>
        </div>

        <div>
          <div
            class="
              flex flex-wrap items-start justify-between gap-3 px-4 py-3
            "
          >
            <div class="workspace-section-header">
              <div class="workspace-section-title">1. 选择预设</div>
              <div class="workspace-section-meta">
                {{ form.presetItems.length }} 项
              </div>
            </div>
            <div class="flex items-center gap-2">
              <VBtn
                color="primary"
                size="small"
                @click="addCurrentProductToList"
              >
                添加到列表
              </VBtn>
              <VBtn
                v-if="selectedPresetRecord"
                variant="text"
                size="small"
                @click="resetCreatePage"
              >
                重置页面
              </VBtn>
            </div>
          </div>

          <div v-if="hasPresetRecords" class="grid gap-3 px-4 pb-3">
            <div
              v-if="addToListStatusMessage"
              class="
                border border-[#a6c8ff] bg-[#edf5ff] px-3 py-2 text-sm
                text-[#0f62fe]
              "
            >
              {{ addToListStatusMessage }}
            </div>
            <div
              class="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
            >
              <div class="surface-field surface-field--compact">
                <div class="surface-field__label">预设组合</div>
                <VAutocomplete
                  v-model="selectedPresetId"
                  :items="presetOptions"
                  item-title="title"
                  item-value="value"
                  class="surface-field__control"
                  variant="plain"
                  hide-details
                  density="compact"
                />
              </div>
              <div class="surface-field surface-field--compact">
                <div class="surface-field__label">国家</div>
                <VTextField
                  :model-value="form.country"
                  class="surface-field__control"
                  variant="plain"
                  hide-details
                  density="compact"
                  readonly
                />
              </div>
              <div class="surface-field surface-field--compact">
                <div class="surface-field__label">平台</div>
                <VTextField
                  :model-value="form.platform"
                  class="surface-field__control"
                  variant="plain"
                  hide-details
                  density="compact"
                  readonly
                />
              </div>
            </div>

            <div class="grid gap-2.5">
              <div class="workspace-subsection-header">
                <div class="workspace-subsection-title">关键参数</div>
                <div class="workspace-subsection-meta">
                  {{ presetSummaryItems.length }}
                </div>
              </div>

              <div
                v-if="presetSummaryItems.length"
                class="
                  grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4
                "
              >
                <div
                  v-for="item in presetSummaryItems"
                  :key="item.id"
                  class="border border-[#e0e0e0] bg-[#f8f8f8] px-3 py-2.5"
                >
                  <div class="text-xs text-[#525252]">
                    {{ item.label }}
                  </div>
                  <VSelect
                    v-if="item.control === 'select'"
                    :model-value="item.item.value"
                    :items="item.controlItems"
                    :item-title="item.itemTitle"
                    :item-value="item.itemValue"
                    class="mt-1"
                    variant="plain"
                    hide-details
                    density="compact"
                    @update:model-value="
                      value => updatePresetSummaryValue(item.item, value)
                    "
                  />
                  <VTextField
                    v-else-if="item.control === 'number'"
                    :model-value="item.item.value"
                    class="mt-1"
                    variant="plain"
                    hide-details
                    density="compact"
                    :suffix="item.item.unit || undefined"
                    @update:model-value="
                      value => updatePresetSummaryValue(item.item, value)
                    "
                  />
                  <div
                    v-else
                    class="mt-1 text-sm font-medium text-[#161616]"
                  >
                    {{ item.value }}
                  </div>
                </div>
              </div>

              <div
                v-else
                class="workspace-empty-state workspace-empty-state--tight"
              >
                暂无关键参数。
              </div>
            </div>
          </div>

          <div
            v-else
            class="workspace-panel-body"
          >
            <div class="workspace-empty-state flex-col gap-3">
              <div>还没有预设组合。</div>
              <RouterLink to="/preset">
                <VBtn variant="tonal" size="small" density="compact">去预设页</VBtn>
              </RouterLink>
            </div>
          </div>
        </div>

        <div class="border-t border-[#c6c6c6]">
          <div
            class="
              flex flex-wrap items-start justify-between gap-3 px-4 py-3
            "
          >
            <div class="workspace-section-header">
              <div class="workspace-section-title">2. 核心商品信息</div>
              <div class="workspace-section-meta">
                {{ visibleProductFieldCount }} 项
              </div>
            </div>
          </div>

          <div class="grid gap-3 px-4 pb-3">
            <div
              class="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
            >
              <div
                v-for="field in primaryProductFields"
                :key="field.key"
                class="surface-field surface-field--compact"
              >
                <div class="surface-field__label">{{ field.label }}</div>
                <VSelect
                  v-if="field.control === 'select'"
                  v-model="form[field.key]"
                  :items="getProductFieldItems(field)"
                  class="surface-field__control"
                  :placeholder="field.placeholder"
                  variant="plain"
                  hide-details
                  density="compact"
                />
                <VTextField
                  v-else
                  v-model="form[field.key]"
                  class="surface-field__control"
                  :placeholder="field.placeholder"
                  :type="field.type"
                  variant="plain"
                  hide-details
                  density="compact"
                />
              </div>
            </div>

            <div
              class="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
            >
              <div
                v-for="field in secondaryProductFields"
                :key="field.key"
                class="surface-field surface-field--compact"
              >
                <div class="surface-field__label">{{ field.label }}</div>
                <div
                  v-if="field.helperText"
                  class="mb-1 text-[11px] text-[#6f6f6f]"
                >
                  {{ field.helperText }}
                </div>
                <VSelect
                  v-if="field.control === 'select'"
                  v-model="form[field.key]"
                  :items="getProductFieldItems(field)"
                  :item-title="
                    field.optionSource === 'shippingIncluded'
                      ? 'title'
                      : undefined
                  "
                  :item-value="
                    field.optionSource === 'shippingIncluded'
                      ? 'value'
                      : undefined
                  "
                  class="surface-field__control"
                  :placeholder="field.placeholder"
                  variant="plain"
                  hide-details
                  density="compact"
                />
                <VTextField
                  v-else
                  v-model="form[field.key]"
                  class="surface-field__control"
                  :placeholder="field.placeholder"
                  :type="field.type"
                  variant="plain"
                  hide-details
                  density="compact"
                />
              </div>
            </div>

            <div class="grid gap-2.5">
              <input
                ref="imageFileInputRef"
                type="file"
                accept="image/*"
                multiple
                class="hidden"
                @change="handleImageFileSelection"
              >

              <div class="workspace-subsection-header">
                <div class="workspace-subsection-title">图片</div>
                <div class="flex items-center gap-3">
                  <div class="workspace-subsection-meta">
                    {{ form.imageLinks.length }}
                  </div>
                  <VBtn
                    variant="tonal"
                    size="small"
                    @click="openImagePicker"
                  >
                    上传图片
                  </VBtn>
                  <VBtn
                    variant="tonal"
                    size="small"
                    @click="addImageLink"
                  >
                    添加链接
                  </VBtn>
                </div>
              </div>

              <div class="grid gap-2.5">
                <div
                  v-if="
                    excelEmbeddedImageStatus === 'loading'
                      || excelEmbeddedImageErrorMessage
                      || hasExcelEmbeddedImages
                  "
                  class="grid gap-2.5"
                >
                  <div class="workspace-subsection-header">
                    <div class="workspace-subsection-title">已同步 Excel 图片</div>
                    <div class="workspace-subsection-meta">
                      {{ excelEmbeddedImages.length }}
                    </div>
                  </div>

                  <div
                    v-if="excelEmbeddedImageStatus === 'loading'"
                    class="text-[12px] text-[#525252]"
                  >
                    正在读取 Excel 嵌入图片…
                  </div>

                  <div
                    v-else-if="excelEmbeddedImageErrorMessage"
                    class="text-[12px] text-[#da1e28]"
                  >
                    {{ excelEmbeddedImageErrorMessage }}
                  </div>

                  <div
                    v-else
                    class="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3"
                  >
                    <div
                      v-for="asset in excelEmbeddedImages"
                      :key="
                        `${asset.sheetPath}:${asset.cell}:${asset.sourcePath}`
                      "
                      class="border border-[#c6c6c6] bg-[#ffffff] p-2.5"
                    >
                      <button
                        type="button"
                        class="
                          flex aspect-square w-full items-center justify-center
                          overflow-hidden border border-[#c6c6c6] bg-[#f8f8f8]
                        "
                        @click="openEmbeddedExcelImagePreview(asset)"
                      >
                        <img
                          :src="getEmbeddedExcelImagePreviewSrc(asset)"
                          :alt="asset.fileName"
                          class="h-full w-full object-cover"
                        >
                      </button>
                      <div class="mt-2 text-[12px] font-medium text-[#161616]">
                        {{ asset.sheetName }} · {{ asset.cell }}
                      </div>
                      <div class="mt-0.5 text-[11px] text-[#6f6f6f]">
                        {{ asset.fileName }}
                      </div>
                      <VBtn
                        variant="tonal"
                        size="small"
                        class="mt-2"
                        @click="handleUseEmbeddedExcelImage(asset)"
                      >
                        加入当前商品
                      </VBtn>
                    </div>
                  </div>
                </div>

                <div
                  v-for="(image, index) in form.imageLinks"
                  :key="image.id"
                  class="grid gap-2.5 md:grid-cols-[96px,minmax(0,1fr)]"
                >
                  <button
                    type="button"
                    class="
                      flex h-24 items-center justify-center border
                      border-[#c6c6c6] bg-[#ffffff]
                    "
                    @click="openProductImagePreview(image, index)"
                  >
                    <img
                      v-if="getImagePreviewSrc(image)"
                      :src="getImagePreviewSrc(image)"
                      :alt="`图片 ${index + 1}`"
                      class="h-full w-full object-cover"
                    >
                    <div v-else class="text-[11px] text-[#6f6f6f]">
                      预览
                    </div>
                  </button>

                  <div class="relative">
                    <VBtn
                      color="error"
                      variant="text"
                      size="small"
                      density="compact"
                      class="!absolute right-1 top-1 z-10 min-w-0 px-1.5"
                      @click="removeImageLink(image.id)"
                    >
                      删除
                    </VBtn>
                    <div class="surface-field surface-field--compact pr-12">
                      <div class="surface-field__label">
                        图片地址 {{ index + 1 }}
                      </div>
                      <VTextField
                        v-model="image.value"
                        class="surface-field__control"
                        placeholder="输入图片路径或 URL"
                        variant="plain"
                        hide-details
                        density="compact"
                      />
                      <div
                        v-if="
                          image.fileName
                            || ['local', 'excel'].includes(image.source)
                        "
                        class="mt-1 text-[11px] text-[#6f6f6f]"
                      >
                        {{
                          image.source === "local"
                            ? `已保存到本地图片库 · ${image.fileName || "图片"}`
                            : image.source === "excel"
                              ? `来自 Excel · ${image.fileName || "图片"}`
                              : image.fileName
                        }}
                      </div>
                    </div>

                    <div class="mt-2 grid gap-2 sm:grid-cols-2">
                      <div class="surface-field surface-field--compact">
                        <div class="surface-field__label">关联变体</div>
                        <VSelect
                          :model-value="image.variationGroupId"
                          :items="variationGroupOptions"
                          item-title="title"
                          item-value="value"
                          class="surface-field__control"
                          variant="plain"
                          hide-details
                          density="compact"
                          @update:model-value="
                            (value) => updateImageVariationGroup(image, value)
                          "
                        />
                      </div>

                      <div class="surface-field surface-field--compact">
                        <div class="surface-field__label">关联选项</div>
                        <VSelect
                          :model-value="image.variationOptionId"
                          :items="
                            getVariationOptionOptions(image.variationGroupId)
                          "
                          item-title="title"
                          item-value="value"
                          class="surface-field__control"
                          variant="plain"
                          hide-details
                          density="compact"
                          :disabled="!image.variationGroupId"
                          @update:model-value="
                            (value) => updateImageVariationOption(image, value)
                          "
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  v-if="imageUploadErrorMessage"
                  class="text-[12px] text-[#da1e28]"
                >
                  {{ imageUploadErrorMessage }}
                </div>
              </div>
            </div>

            <div class="grid gap-2.5">
              <div class="workspace-subsection-header">
                <div class="workspace-subsection-title">变体</div>
                <div class="flex items-center gap-3">
                  <div class="workspace-subsection-meta">
                    {{ form.variationGroups.length }}
                  </div>
                  <VBtn
                    variant="tonal"
                    size="small"
                    @click="addVariationGroup"
                  >
                    添加变体
                  </VBtn>
                </div>
              </div>

              <div
                v-if="form.variationGroups.length"
                class="grid gap-3"
              >
                <div
                  v-for="(group, groupIndex) in form.variationGroups"
                  :key="group.id"
                  class="border border-[#e0e0e0] bg-[#f8f8f8] px-3 py-2.5"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-sm font-semibold text-[#161616]">
                      变体 {{ groupIndex + 1 }}
                    </div>
                    <VBtn
                      color="error"
                      variant="text"
                      size="small"
                      @click="removeVariationGroup(group.id)"
                    >
                      删除变体
                    </VBtn>
                  </div>

                  <div class="mt-3 surface-field surface-field--compact">
                    <div class="surface-field__label">变体名称</div>
                    <VTextField
                      v-model="group.name"
                      class="surface-field__control"
                      placeholder="例如 尺码 / 颜色"
                      variant="plain"
                      hide-details
                      density="compact"
                    />
                  </div>

                  <div class="mt-3 grid gap-2.5">
                    <div class="workspace-subsection-header">
                      <div class="workspace-subsection-title">选项</div>
                      <VBtn
                        variant="tonal"
                        size="small"
                        @click="addVariationOption(group.id)"
                      >
                        添加选项
                      </VBtn>
                    </div>

                    <div
                      class="
                        grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3
                        2xl:grid-cols-4
                      "
                    >
                      <div
                        v-for="(option, optionIndex) in group.options"
                        :key="option.id"
                        class="relative"
                      >
                        <VBtn
                          color="error"
                          variant="text"
                          size="small"
                          density="compact"
                          class="!absolute right-1 top-1 z-10 min-w-0 px-1.5"
                          @click="removeVariationOption(group.id, option.id)"
                        >
                          删除
                        </VBtn>
                        <div class="surface-field surface-field--compact pr-12">
                          <div class="surface-field__label">
                            选项 {{ optionIndex + 1 }}
                          </div>
                          <VTextField
                            v-model="option.value"
                            class="surface-field__control"
                            placeholder="例如 S / M / XL"
                            variant="plain"
                            hide-details
                            density="compact"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-else
                class="
                  border border-dashed border-[#c6c6c6] bg-[#f8f8f8] px-3 py-2.5
                  text-sm text-[#6f6f6f]
                "
              >
                暂无变体，可按需添加。
              </div>
            </div>

            <div class="surface-field surface-field--compact">
              <div class="surface-field__label">备注</div>
              <textarea
                v-model="form.notes"
                rows="3"
                placeholder="补充内容"
                class="surface-field__native min-h-[72px]"
              />
            </div>
          </div>
        </div>

        <div class="border-t border-[#c6c6c6]">
          <div
            class="
              flex flex-wrap items-start justify-between gap-3 px-4 py-3
            "
          >
            <div class="workspace-section-header">
              <div class="workspace-section-title">3. 目标与费用</div>
              <div class="workspace-section-meta">
                {{ calculationDriverText }}
              </div>
            </div>
          </div>

          <div class="grid gap-3 px-4 pb-3">
            <div class="grid gap-2.5">
              <div class="workspace-subsection-title">反推目标</div>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="field in calculationDriverOptions"
                  :key="field.key"
                  type="button"
                  class="
                    min-h-8 border border-[#c6c6c6] bg-white px-3 py-1
                    text-[13px]
                    text-[#525252] transition-colors
                  "
                  :class="
                    calculationDriver === field.key
                      ? 'border-[#0f62fe] bg-[#edf5ff] text-[#161616]'
                      : `
                        hover:border-[#8d8d8d] hover:bg-[#f8f8f8]
                        hover:text-[#161616]
                      `
                  "
                  @click="setCalculationDriver(field.key)"
                >
                  {{ field.label }}
                </button>
              </div>
            </div>

            <div
              v-if="activeCalculationField"
              class="grid gap-3 lg:grid-cols-2"
            >
              <div class="surface-field surface-field--compact">
                <div class="surface-field__label">
                  {{ activeCalculationField.label }}
                </div>
                <VTextField
                  :model-value="
                    getCalculationFieldValue(activeCalculationField.key)
                  "
                  class="surface-field__control"
                  :placeholder="activeCalculationField.placeholder"
                  :type="activeCalculationField.type"
                  variant="plain"
                  hide-details
                  density="compact"
                  @update:model-value="
                    (value) =>
                      updateCalculationField(activeCalculationField.key, value)
                  "
                />
              </div>
            </div>

            <div class="grid gap-2.5 sm:grid-cols-2">
              <div
                v-for="field in calculationCostFields"
                :key="field.key"
                class="surface-field surface-field--compact"
              >
                <div class="surface-field__label">{{ field.label }}</div>
                <div
                  v-if="field.key === 'sellerShipping'"
                  class="mb-1 text-[11px] text-[#6f6f6f]"
                >
                  由“当前包邮状态”和预设规则自动计算。
                </div>
                <VTextField
                  :model-value="getCalculationFieldValue(field.key)"
                  class="surface-field__control"
                  :placeholder="field.placeholder"
                  :suffix="field.suffix"
                  :type="field.type"
                  variant="plain"
                  hide-details
                  density="compact"
                  :readonly="field.key === 'sellerShipping'"
                  @update:model-value="
                    (value) =>
                      field.key === 'sellerShipping'
                        ? undefined
                        : updateCalculationField(field.key, value)
                  "
                />
              </div>
            </div>
          </div>
        </div>

        <details class="border-t border-[#e0e0e0] px-4">
          <summary
            class="
              flex cursor-pointer list-none items-center justify-between gap-3
              py-4
            "
          >
            <span class="workspace-subsection-title">补充字段</span>
            <span class="workspace-subsection-meta">
              {{ form.extraProductFields.length }}
            </span>
          </summary>

          <div class="grid gap-3 pb-3">
            <div class="grid gap-2.5">
              <div class="workspace-subsection-header">
                <div class="workspace-subsection-title">补充字段</div>
                <div class="flex items-center gap-3">
                  <div class="workspace-subsection-meta">
                    {{ form.extraProductFields.length }}
                  </div>
                  <VBtn
                    variant="tonal"
                    size="small"
                    @click="addExtraProductField"
                  >
                    添加字段
                  </VBtn>
                </div>
              </div>

              <div
                v-if="form.extraProductFields.length"
                class="border-t border-[#e0e0e0]"
              >
                <div
                  class="
                    hidden border-b border-[#e0e0e0] py-2 text-xs text-[#525252]
                    md:grid md:grid-cols-[180px,minmax(0,1fr),56px] md:gap-3
                  "
                >
                  <div>字段名</div>
                  <div>字段值</div>
                  <div />
                </div>
                <div
                  v-for="field in form.extraProductFields"
                  :key="field.id"
                  class="
                    grid gap-3 border-b border-[#e0e0e0] py-3
                    md:grid-cols-[180px,minmax(0,1fr),56px]
                    md:items-end
                  "
                >
                  <VTextField
                    v-model="field.label"
                    label="字段名"
                    placeholder="例如 供应商"
                    variant="plain"
                    hide-details
                    density="compact"
                  />
                  <VTextField
                    v-model="field.value"
                    label="字段值"
                    placeholder="输入内容"
                    variant="plain"
                    hide-details
                    density="compact"
                  />
                  <VBtn
                    color="error"
                    variant="text"
                    @click="removeExtraProductField(field.id)"
                  >
                    删除
                  </VBtn>
                </div>
              </div>

              <div
                v-else
                class="workspace-empty-state workspace-empty-state--tight"
              >
                暂无补充字段。
              </div>
            </div>
          </div>
        </details>
      </VCard>

      <div class="workspace-sidebar">
        <VCard
          class="
            workspace-sheet overflow-hidden border border-[#c6c6c6] bg-white
            lg:hidden
          "
        >
          <div class="workspace-panel-header">
            <div class="workspace-panel-title">结果</div>
            <div class="workspace-panel-meta">
              {{
                primaryResultHighlights.length
                  + resultSummaryItems.length
                  + feeSummaryItems.length
              }} 项
            </div>
          </div>

          <div class="workspace-panel-body space-y-3">
            <div class="grid gap-2 sm:grid-cols-2">
              <div
                v-for="item in primaryResultHighlights"
                :key="item.label"
                class="
                  border border-[#c6c6c6] border-t-[2px] border-t-[#0f62fe]
                  bg-[#f8f8f8] px-3 py-2
                "
              >
                <div class="text-[11px] font-medium text-[#525252]">
                  {{ item.label }}
                </div>
                <div class="mt-1 text-[1.15rem] font-semibold text-[#161616]">
                  {{ item.value }}
                </div>
              </div>
            </div>

            <details class="border-t border-[#e0e0e0] pt-3">
              <summary
                class="
                  flex cursor-pointer list-none items-center justify-between
                  gap-3 text-sm font-medium text-[#161616]
                "
              >
                <span>展开概览与费用</span>
                <span class="text-xs text-[#525252]">
                  {{ resultSummaryItems.length + feeSummaryItems.length }} 项
                </span>
              </summary>

              <div class="mt-3 space-y-3">
                <div class="border-t border-[#e0e0e0] pt-3">
                  <div class="text-sm font-semibold text-[#161616]">概览</div>
                  <dl class="mt-3">
                    <div
                      v-for="item in resultSummaryItems"
                      :key="item.label"
                      class="
                        flex items-center justify-between gap-3 py-1 text-sm
                      "
                    >
                      <dt class="m-0 text-[#525252]">{{ item.label }}</dt>
                      <dd class="m-0 font-medium text-[#161616]">
                        {{ item.value }}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div class="border-t border-[#e0e0e0] pt-3">
                  <div class="text-sm font-semibold text-[#161616]">费用</div>
                  <dl class="mt-3">
                    <div
                      v-for="item in feeSummaryItems"
                      :key="item.label"
                      class="
                        flex items-center justify-between gap-3 py-1 text-sm
                      "
                    >
                      <dt class="m-0 text-[#525252]">{{ item.label }}</dt>
                      <dd class="m-0 font-medium text-[#161616]">
                        {{ item.value }}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div class="border-t border-[#e0e0e0] pt-3">
                  <VBtn
                    variant="tonal"
                    size="small"
                    @click="calculationProcessDialogOpen = true"
                  >
                    查看运算过程
                  </VBtn>
                </div>
              </div>
            </details>
          </div>
        </VCard>

        <VCard
          class="
            workspace-sheet hidden overflow-hidden border border-[#c6c6c6]
            bg-white lg:block
          "
        >
          <div class="workspace-panel-header">
            <div class="workspace-panel-title">结果</div>
            <div class="workspace-panel-meta">
              {{
                primaryResultHighlights.length
                  + resultSummaryItems.length
                  + feeSummaryItems.length
              }} 项
            </div>
          </div>

          <div class="workspace-panel-body space-y-3">
            <div class="space-y-3">
              <div
                v-for="item in primaryResultHighlights"
                :key="item.label"
                class="
                  border border-[#c6c6c6] border-t-[2px] border-t-[#0f62fe]
                  bg-[#f8f8f8] px-3 py-2.5
                "
              >
                <div class="text-xs font-medium text-[#525252]">
                  {{ item.label }}
                </div>
                <div class="mt-1 text-[1.45rem] font-semibold text-[#161616]">
                  {{ item.value }}
                </div>
              </div>
            </div>

            <div class="border-t border-[#e0e0e0] pt-3">
              <div class="text-sm font-semibold text-[#161616]">概览</div>
              <dl class="mt-3">
                <div
                  v-for="item in resultSummaryItems"
                  :key="item.label"
                  class="
                    flex items-center justify-between gap-3 py-1 text-sm
                  "
                >
                  <dt class="m-0 text-[#525252]">{{ item.label }}</dt>
                  <dd class="m-0 font-medium text-[#161616]">
                    {{ item.value }}
                  </dd>
                </div>
              </dl>
            </div>

            <div class="border-t border-[#e0e0e0] pt-3">
              <div class="text-sm font-semibold text-[#161616]">费用</div>
              <dl class="mt-3">
                <div
                  v-for="item in feeSummaryItems"
                  :key="item.label"
                  class="
                    flex items-center justify-between gap-3 py-1 text-sm
                  "
                >
                  <dt class="m-0 text-[#525252]">{{ item.label }}</dt>
                  <dd class="m-0 font-medium text-[#161616]">
                    {{ item.value }}
                  </dd>
                </div>
              </dl>
            </div>
            <div class="border-t border-[#e0e0e0] pt-3">
              <VBtn
                variant="tonal"
                size="small"
                @click="calculationProcessDialogOpen = true"
              >
                查看运算过程
              </VBtn>
            </div>
          </div>
        </VCard>
      </div>
    </div>
  </div>

  <VDialog v-model="calculationProcessDialogOpen" max-width="960">
    <VCard
      class="workspace-sheet overflow-hidden border border-[#c6c6c6] bg-white"
    >
      <div class="workspace-panel-header">
        <div class="workspace-panel-title">运算过程</div>
        <div class="workspace-panel-meta">
          {{
            calculationProcessSections.reduce(
              (total, section) => total + section.items.length,
              0,
            )
          }} 步
        </div>
      </div>

      <div class="workspace-panel-body max-h-[78vh] overflow-y-auto space-y-3">
        <div
          v-for="section in calculationProcessSections"
          :key="section.title"
          class="border-t border-[#e0e0e0] pt-3 first:border-t-0 first:pt-0"
        >
          <div class="text-sm font-semibold text-[#161616]">
            {{ section.title }}
          </div>
          <div class="mt-3 space-y-2">
            <div
              v-for="item in section.items"
              :key="`${section.title}-${item.label}`"
              class="border border-[#e0e0e0] bg-[#f8f8f8] px-3 py-2.5"
            >
              <div class="text-[11px] font-medium text-[#525252]">
                {{ item.label }}
              </div>
              <div class="mt-1 text-[12px] text-[#161616]">
                {{ item.formula }}
              </div>
              <div class="mt-1 text-[12px] leading-5 text-[#525252]">
                {{ item.detail }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </VCard>
  </VDialog>

  <VDialog v-model="imagePreviewDialogOpen" max-width="960">
    <VCard
      class="workspace-sheet overflow-hidden border border-[#c6c6c6] bg-white"
    >
      <div class="workspace-panel-header">
        <div class="workspace-panel-title">
          {{ imagePreviewTitle || "图片预览" }}
        </div>
        <div class="flex items-center gap-1.5">
          <div class="text-[12px] text-[#525252]">
            {{ Math.round(imagePreviewScale * 100) }}%
          </div>
          <VBtn
            icon="mdi-magnify-minus-outline"
            variant="text"
            size="small"
            @click="zoomOutPreviewImage"
          />
          <VBtn
            variant="text"
            size="small"
            class="min-w-[48px]"
            @click="resetPreviewImageScale"
          >
            1:1
          </VBtn>
          <VBtn
            icon="mdi-magnify-plus-outline"
            variant="text"
            size="small"
            @click="zoomInPreviewImage"
          />
          <VBtn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="imagePreviewDialogOpen = false"
          />
        </div>
      </div>
      <div class="workspace-panel-body">
        <div
          ref="previewViewportRef"
          class="
            flex min-h-[320px] cursor-grab items-center justify-center border
            border-[#c6c6c6] bg-[#f8f8f8] p-4
          "
        >
          <img
            v-if="imagePreviewSrc"
            ref="previewImageRef"
            :src="imagePreviewSrc"
            :alt="imagePreviewTitle || '图片预览'"
            class="max-h-[70vh] w-full object-contain"
            @load="initializePreviewPanzoom"
          >
        </div>
      </div>
    </VCard>
  </VDialog>
</template>
