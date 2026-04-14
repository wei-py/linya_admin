import { invoke } from "@tauri-apps/api/core"

/**
 * 将图片保存到应用本地图片目录。
 *
 * @param {Uint8Array} bytes 图片字节。
 * @param {string} [fileName] 原始文件名。
 * @returns {Promise<{fileName: string, filePath: string, relativePath: string}>}
 * 返回保存后的文件名、绝对路径和相对路径。
 */
export async function saveImageAsset(bytes, fileName = "") {
  return invoke("save_image_asset", {
    bytes: Array.from(bytes || []),
    file_name: fileName || null,
  })
}
