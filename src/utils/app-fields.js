export const optionBackedFieldDefinitions = [
  {
    formKey: "category",
    fieldName: "类目",
    optionSource: "category",
    optionGroupKey: "category",
    normalize: value => String(value || "").trim(),
  },
  {
    formKey: "adType",
    fieldName: "广告类型",
    optionSource: "adType",
    optionGroupKey: "ad_type",
    normalize: value => String(value || "").trim(),
  },
  {
    formKey: "shippingIncluded",
    fieldName: "是否包邮",
    optionSource: "shippingIncluded",
    optionGroupKey: "shipping_included",
    normalize: (value) => {
      const nextValue = String(value || "").trim()

      return ["是", "否"].includes(nextValue) ? nextValue : ""
    },
  },
]

export function resolveOptionGroupKey(value = "") {
  const normalizedValue = String(value || "").trim()

  if (!normalizedValue) {
    return ""
  }

  const matchedField = optionBackedFieldDefinitions.find(field =>
    [
      field.formKey,
      field.fieldName,
      field.optionSource,
      field.optionGroupKey,
    ].includes(normalizedValue),
  )

  return matchedField?.optionGroupKey || normalizedValue
}

export function findOptionBackedFieldByName(fieldName = "") {
  const normalizedValue = String(fieldName || "").trim()

  return (
    optionBackedFieldDefinitions.find(field =>
      field.fieldName === normalizedValue,
    ) || null
  )
}

export function findOptionBackedFieldByFormKey(formKey = "") {
  const normalizedValue = String(formKey || "").trim()

  return (
    optionBackedFieldDefinitions.find(field =>
      field.formKey === normalizedValue,
    ) || null
  )
}
