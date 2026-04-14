import { invoke } from "@tauri-apps/api/core"

/**
 * 当前是否运行在 Tauri 容器中。
 *
 * @returns {boolean} Tauri 环境返回 true。
 */
export function isTauriApp() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
}

/**
 * 打开本地 Excel 文件选择器。
 *
 * @returns {Promise<string>} 选中的 Excel 路径。
 */
export async function pickExcelFilePath() {
  return invoke("pick_excel_file")
}

/**
 * 打开 Excel 保存路径选择器。
 *
 * @returns {Promise<string>} 选中的保存路径。
 */
export async function saveExcelFilePath() {
  return invoke("save_excel_file")
}

/**
 * 读取本地文件字节。
 *
 * @param {string} path 文件路径。
 * @returns {Promise<Uint8Array>} 文件字节。
 */
export async function readBinaryFile(path) {
  const bytes = await invoke("read_binary_file", { path })

  return Uint8Array.from(bytes)
}

/**
 * 写入本地文件字节。
 *
 * @param {string} path 文件路径。
 * @param {Uint8Array} bytes 文件字节。
 * @returns {Promise<void>}
 */
export async function writeBinaryFile(path, bytes) {
  await invoke("write_binary_file", {
    path,
    bytes: Array.from(bytes),
  })
}
