import * as XLSX from "xlsx"

const SHEET_NAME = "country_platform"

function normalizeValue(value) {
  return String(value ?? "").trim()
}

export function createCountryPlatformValue(country, platform) {
  const normalizedCountry = normalizeValue(country)
  const normalizedPlatform = normalizeValue(platform)

  return [normalizedCountry, normalizedPlatform].filter(Boolean).join("_")
}

export function normalizeCountryPlatformItem(item = {}) {
  const country = normalizeValue(item.country)
  const platform = normalizeValue(item.platform)

  return {
    country,
    platform,
    country_platform: createCountryPlatformValue(country, platform),
  }
}

export function exportCountryPlatformsToExcel(list = []) {
  const rows = list.map(normalizeCountryPlatformItem)
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(workbook, worksheet, SHEET_NAME)
  XLSX.writeFile(workbook, "country_platform.xlsx")
}

export async function importCountryPlatformsFromExcel(file) {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: "array" })
  const worksheet = workbook.Sheets[SHEET_NAME]
    || workbook.Sheets[workbook.SheetNames[0]]

  if (!worksheet)
    return []

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
  })

  return rows
    .map(normalizeCountryPlatformItem)
    .filter(item => item.country && item.platform)
}
