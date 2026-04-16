import { invoke } from "@tauri-apps/api/core"

export async function exportListWorkbook(path, payload) {
  await invoke("export_list_workbook", {
    path,
    payload,
  })
}
