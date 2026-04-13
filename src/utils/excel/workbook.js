import * as XLSX from "xlsx"

function normalizeWorkbookBytes(input) {
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input)
  }

  return Uint8Array.from(input || [])
}

export function readWorkbookFromBytes(input) {
  const bytes = normalizeWorkbookBytes(input)

  return XLSX.read(bytes, { type: "array" })
}

export async function readWorkbookFromFile(file) {
  const arrayBuffer = await file.arrayBuffer()

  return readWorkbookFromBytes(arrayBuffer)
}

export function exportWorkbookToBytes(workbook) {
  const arrayBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  })

  return new Uint8Array(arrayBuffer)
}
