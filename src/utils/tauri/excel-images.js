import { invoke } from "@tauri-apps/api/core"

/**
 * 提取 Excel 中嵌入的图片并同步到应用本地图片目录。
 *
 * @param {string} path Excel 文件路径。
 * @returns {Promise<Array<{
 *   sheetName: string,
 *   sheetPath: string,
 *   drawingPath: string,
 *   sourcePath: string,
 *   anchorType: string,
 *   rowIndex: number,
 *   columnIndex: number,
 *   cell: string,
 *   fileName: string,
 *   filePath: string,
 *   relativePath: string,
 * }>>}
 * 返回提取后的图片列表及其 Excel 锚点位置。
 */
export async function extractExcelEmbeddedImages(path) {
  return invoke("extract_excel_embedded_images", { path })
}
