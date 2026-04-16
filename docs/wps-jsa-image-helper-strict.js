const CONFIG = {
  sheetName: "商品列表",
  headerRow: 1,
  startRow: 2,
  pictureHeader: "图片",
  picturePathHeader: "图片路径",
  rowHeight: 66,
  imagePadding: 2,
  alertOnFinish: true,
}

function normalizePath(path) {
  return String(path || "").replace(/\\/g, "/")
}

function joinPath(basePath, relativePath) {
  const normalizedBase = normalizePath(basePath).replace(/\/+$/, "")
  const normalizedRelative = normalizePath(relativePath).replace(/^\/+/, "")

  if (!normalizedBase) {
    return normalizedRelative
  }

  return `${normalizedBase}/${normalizedRelative}`
}

function resolveImagePath(workbook, rawPath) {
  const value = String(rawPath || "").trim()

  if (!value) {
    return ""
  }

  if (/^(\/|[A-Za-z]:[\\/]|https?:\/\/|file:\/\/)/.test(value)) {
    return value
  }

  const workbookPath = String(workbook.Path || "").trim()

  return joinPath(workbookPath, value)
}

function getSheetByName(workbook, sheetName) {
  for (let index = 1; index <= workbook.Sheets.Count; index += 1) {
    const sheet = workbook.Sheets.Item(index)

    if (String(sheet.Name || "").trim() === sheetName) {
      return sheet
    }
  }

  return null
}

function getHeaderMap(sheet, headerRow) {
  const map = {}
  const usedRange = sheet.UsedRange
  const columnCount = usedRange.Columns.Count

  for (let column = 1; column <= columnCount; column += 1) {
    const header = String(sheet.Cells(headerRow, column).Text || "").trim()

    if (header) {
      map[header] = column
    }
  }

  return map
}

function clearPicturesInColumn(sheet, startRow, endRow, pictureColumn) {
  const shapes = sheet.Shapes

  for (let index = shapes.Count; index >= 1; index -= 1) {
    const shape = shapes.Item(index)

    try {
      const topLeftCell = shape.TopLeftCell

      if (!topLeftCell) {
        continue
      }

      const row = topLeftCell.Row
      const column = topLeftCell.Column

      if (row >= startRow && row <= endRow && column === pictureColumn) {
        shape.Delete()
      }
    }
    catch (_error) {
      // Ignore unsupported or non-picture shapes.
    }
  }
}

function insertPictureIntoCell(sheet, imagePath, row, column, padding) {
  const cell = sheet.Cells(row, column)
  const width = Math.max(cell.Width - padding * 2, 12)
  const height = Math.max(cell.Height - padding * 2, 12)
  const shape = sheet.Shapes.AddPicture(
    imagePath,
    false,
    true,
    cell.Left + padding,
    cell.Top + padding,
    width,
    height,
  )

  shape.LockAspectRatio = true
  shape.Placement = 1
}

function getLastRow(sheet, pathColumn, startRow) {
  const usedRange = sheet.UsedRange
  const endRow = usedRange.Rows.Count

  if (endRow >= startRow) {
    return endRow
  }

  let row = startRow

  while (String(sheet.Cells(row, pathColumn).Text || "").trim()) {
    row += 1
  }

  return row - 1
}

function main() {
  const app = Application
  const workbook = app.ActiveWorkbook
  const sheet = getSheetByName(workbook, CONFIG.sheetName)

  if (!sheet) {
    app.MsgBox(`没有找到工作表：${CONFIG.sheetName}`)
    return
  }

  const headerMap = getHeaderMap(sheet, CONFIG.headerRow)
  const pictureColumn = headerMap[CONFIG.pictureHeader]
  const picturePathColumn = headerMap[CONFIG.picturePathHeader]

  if (!pictureColumn || !picturePathColumn) {
    app.MsgBox("缺少“图片”列或“图片路径”列。")
    return
  }

  const lastRow = getLastRow(sheet, picturePathColumn, CONFIG.startRow)

  if (lastRow < CONFIG.startRow) {
    app.MsgBox("当前没有可处理的数据行。")
    return
  }

  clearPicturesInColumn(sheet, CONFIG.startRow, lastRow, pictureColumn)

  let insertedCount = 0

  for (let row = CONFIG.startRow; row <= lastRow; row += 1) {
    const rawPath = String(sheet.Cells(row, picturePathColumn).Text || "").trim()
    const imagePath = resolveImagePath(workbook, rawPath)

    if (!imagePath) {
      continue
    }

    sheet.Rows(row).RowHeight = CONFIG.rowHeight
    insertPictureIntoCell(
      sheet,
      imagePath,
      row,
      pictureColumn,
      CONFIG.imagePadding,
    )
    insertedCount += 1
  }

  if (CONFIG.alertOnFinish) {
    app.MsgBox(`处理完成，共插入 ${insertedCount} 张图片。`)
  }
}

main()
