function getHeaderMap(sheet) {
  const map = {}
  const usedRange = sheet.UsedRange
  const columnCount = usedRange.Columns.Count

  for (let column = 1; column <= columnCount; column += 1) {
    const header = String(sheet.Cells(1, column).Text || "").trim()

    if (header) {
      map[header] = column
    }
  }

  return map
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

  if (
    /^(\/|[A-Za-z]:[\\/]|https?:\/\/|file:\/\/)/.test(value)
  ) {
    return value
  }

  const workbookPath = String(workbook.Path || "").trim()

  return joinPath(workbookPath, value)
}

function removePicturesInRange(sheet, startRow, endRow, pictureColumn) {
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
      // Ignore non-picture shapes or unsupported members.
    }
  }
}

function insertPictureIntoCell(sheet, imagePath, row, column) {
  const cell = sheet.Cells(row, column)
  const left = cell.Left + 2
  const top = cell.Top + 2
  const width = Math.max(cell.Width - 4, 12)
  const height = Math.max(cell.Height - 4, 12)
  const shape = sheet.Shapes.AddPicture(imagePath, false, true, left, top, width, height)

  shape.LockAspectRatio = true
  shape.Placement = 1
}

function main() {
  const app = Application
  const workbook = app.ActiveWorkbook
  const sheet = app.ActiveSheet
  const headerMap = getHeaderMap(sheet)
  const pictureColumn = headerMap["图片"]
  const picturePathColumn = headerMap["图片路径"]

  if (!pictureColumn || !picturePathColumn) {
    app.MsgBox("当前工作表缺少“图片”或“图片路径”列。")
    return
  }

  const lastRow = sheet.UsedRange.Rows.Count

  if (lastRow < 2) {
    app.MsgBox("当前没有可处理的数据行。")
    return
  }

  removePicturesInRange(sheet, 2, lastRow, pictureColumn)

  for (let row = 2; row <= lastRow; row += 1) {
    const rawPath = String(sheet.Cells(row, picturePathColumn).Text || "").trim()
    const imagePath = resolveImagePath(workbook, rawPath)

    if (!imagePath) {
      continue
    }

    sheet.Rows(row).RowHeight = 66
    insertPictureIntoCell(sheet, imagePath, row, pictureColumn)
  }

  app.MsgBox("图片已按“图片路径”列批量插入到“图片”列。")
}

main()
