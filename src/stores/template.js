import { defineStore } from "pinia"

import { createTemplateTable } from "@/constants/template"
import { usePresetStore } from "@/stores/preset"
import {
  exportWorkbookToBytes,
  readWorkbookFromBytes,
} from "@/utils/excel/workbook"
import {
  isTauriApp,
  readBinaryFile,
  writeBinaryFile,
} from "@/utils/tauri/excel-file"
import {
  importTemplatesFromBytes,
  importTemplatesFromExcel,
  normalizeTemplateTable,
  writeTemplateWorkbook,
} from "@/utils/template/excel"

let templateSyncTimer = null

export const useTemplateStore = defineStore("template", {
  state: () => ({
    templateTables: [],
    activeTableId: "",
    syncStatus: "idle",
    syncErrorMessage: "",
    lastSyncedAt: "",
  }),

  getters: {
    activeTemplateTable(state) {
      return (
        state.templateTables.find(item => item.id === state.activeTableId)
        || null
      )
    },
  },

  actions: {
    setTemplateTables(tables = []) {
      this.templateTables = tables.map((table, index) =>
        normalizeTemplateTable(table, index),
      )

      if (
        this.activeTableId
        && this.templateTables.some(item => item.id === this.activeTableId)
      ) {
        return
      }

      this.activeTableId = this.templateTables[0]?.id || ""
    },

    setActiveTable(id) {
      this.activeTableId = id
    },

    async refreshFromBoundExcel() {
      const presetStore = usePresetStore()

      if (presetStore.excelFilePath) {
        try {
          const bytes = await readBinaryFile(presetStore.excelFilePath)

          this.setTemplateTables(importTemplatesFromBytes(bytes))
          this.syncStatus = "saved"
          this.syncErrorMessage = ""
          this.lastSyncedAt = new Date().toISOString()

          return true
        }
        catch (error) {
          this.templateTables = []
          this.activeTableId = ""
          this.syncStatus = "error"
          this.syncErrorMessage = error?.message || "模板 Excel 读取失败"

          return false
        }
      }

      if (presetStore.excelFile) {
        try {
          this.setTemplateTables(
            await importTemplatesFromExcel(presetStore.excelFile),
          )
          this.syncStatus = "idle"
          this.syncErrorMessage = ""

          return true
        }
        catch (error) {
          this.templateTables = []
          this.activeTableId = ""
          this.syncStatus = "error"
          this.syncErrorMessage = error?.message || "模板 Excel 读取失败"

          return false
        }
      }

      this.templateTables = []
      this.activeTableId = ""
      this.syncStatus = "idle"
      this.syncErrorMessage = ""
      this.lastSyncedAt = ""

      return false
    },

    scheduleSyncBoundExcelFile(delay = 300) {
      const presetStore = usePresetStore()

      if (!isTauriApp() || !presetStore.excelFilePath) {
        return
      }

      if (templateSyncTimer) {
        clearTimeout(templateSyncTimer)
      }

      templateSyncTimer = window.setTimeout(() => {
        templateSyncTimer = null
        void this.syncBoundExcelFile()
      }, delay)
    },

    persistTemplateChanges() {
      this.scheduleSyncBoundExcelFile()
    },

    async syncBoundExcelFile() {
      const presetStore = usePresetStore()

      if (!isTauriApp() || !presetStore.excelFilePath) {
        this.syncStatus = "idle"
        return false
      }

      try {
        this.syncStatus = "saving"
        this.syncErrorMessage = ""
        const currentBytes = await readBinaryFile(presetStore.excelFilePath)
        const workbook = readWorkbookFromBytes(currentBytes)
        const nextWorkbook = writeTemplateWorkbook(
          workbook,
          this.templateTables,
        )
        const bytes = exportWorkbookToBytes(nextWorkbook)

        await writeBinaryFile(presetStore.excelFilePath, bytes)

        this.syncStatus = "saved"
        this.lastSyncedAt = new Date().toISOString()

        return true
      }
      catch (error) {
        this.syncStatus = "error"
        this.syncErrorMessage = error?.message || "模板 Excel 同步失败"

        return false
      }
    },

    addTemplateTable() {
      const nextTable = normalizeTemplateTable(
        {
          ...createTemplateTable("fixed"),
          name: `未命名规则表 ${this.templateTables.length + 1}`,
        },
        this.templateTables.length,
      )

      this.templateTables.push(nextTable)
      this.activeTableId = nextTable.id
      this.persistTemplateChanges()

      return nextTable
    },

    removeTemplateTable(id) {
      const nextIndex = this.templateTables.findIndex(item => item.id === id)

      if (nextIndex < 0) {
        return false
      }

      this.templateTables.splice(nextIndex, 1)

      if (!this.templateTables.length) {
        this.activeTableId = ""
      }
      else if (this.activeTableId === id) {
        const nextTable
          = this.templateTables[nextIndex]
            || this.templateTables[nextIndex - 1]
            || this.templateTables[0]

        this.activeTableId = nextTable?.id || ""
      }

      this.persistTemplateChanges()

      return true
    },
  },
})
