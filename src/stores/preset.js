import { defineStore } from "pinia"

import {
  createCountryPlatformValue,
  exportPresetsToBytes,
  importPresetsFromBytes,
  importPresetsFromExcel,
} from "@/utils/preset/excel"
import {
  isTauriApp,
  readBinaryFile,
  writeBinaryFile,
} from "@/utils/tauri/excel-file"

const PRESET_RECORDS_STORAGE_KEY = "preset:records"
const EXCEL_FILE_NAME_STORAGE_KEY = "preset:excelFileName"
const EXCEL_FILE_PATH_STORAGE_KEY = "preset:excelFilePath"
const ACTIVE_PRESET_ID_STORAGE_KEY = "preset:activePresetId"
const LEGACY_PRESET_RECORDS_STORAGE_KEY = "preset:excelRows"
const LEGACY_ACTIVE_PRESET_ID_STORAGE_KEY = "preset:activeCountryPlatform"
const STALE_STORAGE_KEYS = [
  "create-view-layouts",
  "excel-table-store",
  "preset-view-base-info",
  "preset-view-current-draft",
  "preset-view-selected-combination-key",
]

let hasInitializedPresetStorage = false

function createPresetRecord(item, index) {
  const country = item?.country?.trim?.() || ""
  const platform = item?.platform?.trim?.() || ""
  const country_platform
    = item?.country_platform || createCountryPlatformValue(country, platform)

  return {
    id: item?.id || country_platform,
    country,
    platform,
    country_platform,
    sort: Number(item?.sort) || index + 1,
    items: Array.isArray(item?.items) ? item.items : [],
  }
}

function initializePresetStorage() {
  if (hasInitializedPresetStorage)
    return

  const currentRecords = localStorage.getItem(PRESET_RECORDS_STORAGE_KEY)
  const currentActivePresetId = localStorage.getItem(
    ACTIVE_PRESET_ID_STORAGE_KEY,
  )
  const legacyRows = JSON.parse(
    localStorage.getItem(LEGACY_PRESET_RECORDS_STORAGE_KEY) || "[]",
  )
  const legacyActivePresetId
    = localStorage.getItem(LEGACY_ACTIVE_PRESET_ID_STORAGE_KEY) || ""

  if (!currentRecords && Array.isArray(legacyRows) && legacyRows.length) {
    localStorage.setItem(
      PRESET_RECORDS_STORAGE_KEY,
      JSON.stringify(legacyRows.map(createPresetRecord)),
    )
  }

  if (!currentActivePresetId && legacyActivePresetId) {
    localStorage.setItem(ACTIVE_PRESET_ID_STORAGE_KEY, legacyActivePresetId)
  }

  localStorage.removeItem(LEGACY_PRESET_RECORDS_STORAGE_KEY)
  localStorage.removeItem(LEGACY_ACTIVE_PRESET_ID_STORAGE_KEY)
  STALE_STORAGE_KEYS.forEach(key => localStorage.removeItem(key))

  hasInitializedPresetStorage = true
}

function getInitialPresetRecords() {
  initializePresetStorage()

  const cachedRecords = JSON.parse(
    localStorage.getItem(PRESET_RECORDS_STORAGE_KEY) || "null",
  )

  if (Array.isArray(cachedRecords))
    return cachedRecords.map(createPresetRecord)

  return []
}

function getInitialActivePresetId() {
  initializePresetStorage()

  return localStorage.getItem(ACTIVE_PRESET_ID_STORAGE_KEY) || ""
}

export const usePresetStore = defineStore("preset", {
  state: () => ({
    excelFile: null,
    excelFileName: localStorage.getItem(EXCEL_FILE_NAME_STORAGE_KEY) || "",
    excelFilePath: localStorage.getItem(EXCEL_FILE_PATH_STORAGE_KEY) || "",
    presetRecords: getInitialPresetRecords(),
    activePresetId: getInitialActivePresetId(),
    syncStatus: "idle",
    syncErrorMessage: "",
    lastSyncedAt: "",
  }),

  getters: {
    activePreset(state) {
      return (
        state.presetRecords.find(item => item.id === state.activePresetId)
        || null
      )
    },
  },

  actions: {
    persistState() {
      if (this.presetRecords.length) {
        localStorage.setItem(
          PRESET_RECORDS_STORAGE_KEY,
          JSON.stringify(this.presetRecords),
        )
      }
      else {
        localStorage.removeItem(PRESET_RECORDS_STORAGE_KEY)
      }

      if (this.activePresetId) {
        localStorage.setItem(ACTIVE_PRESET_ID_STORAGE_KEY, this.activePresetId)
      }
      else {
        localStorage.removeItem(ACTIVE_PRESET_ID_STORAGE_KEY)
      }

      if (this.excelFileName) {
        localStorage.setItem(EXCEL_FILE_NAME_STORAGE_KEY, this.excelFileName)
      }
      else {
        localStorage.removeItem(EXCEL_FILE_NAME_STORAGE_KEY)
      }

      if (this.excelFilePath) {
        localStorage.setItem(EXCEL_FILE_PATH_STORAGE_KEY, this.excelFilePath)
      }
      else {
        localStorage.removeItem(EXCEL_FILE_PATH_STORAGE_KEY)
      }
    },

    setActivePreset(id) {
      this.activePresetId = id
      this.persistState()
    },

    async bindExcelFile(file) {
      if (!file)
        return false

      try {
        this.excelFile = file
        this.excelFileName = file.name
        this.excelFilePath = ""
        this.presetRecords = await importPresetsFromExcel(file)
        this.activePresetId = this.presetRecords[0]?.id || ""
        this.syncStatus = "idle"
        this.syncErrorMessage = ""
        this.persistState()

        return true
      }
      catch (error) {
        this.syncStatus = "error"
        this.syncErrorMessage = error?.message || "Excel 读取失败"
        this.persistState()

        return false
      }
    },

    async bindExcelFilePath(path) {
      if (!path)
        return false

      try {
        const bytes = await readBinaryFile(path)
        const fileName = path.split(/[/\\]/).pop() || path

        this.excelFile = null
        this.excelFileName = fileName
        this.excelFilePath = path
        this.presetRecords = importPresetsFromBytes(bytes)
        this.activePresetId = this.presetRecords[0]?.id || ""
        this.syncStatus = "saved"
        this.syncErrorMessage = ""
        this.lastSyncedAt = new Date().toISOString()
        this.persistState()

        return true
      }
      catch (error) {
        this.syncStatus = "error"
        this.syncErrorMessage = error?.message || "Excel 绑定失败"
        this.persistState()

        return false
      }
    },

    async refreshBoundExcelFile() {
      if (!isTauriApp() || !this.excelFilePath)
        return false

      return this.bindExcelFilePath(this.excelFilePath)
    },

    async syncBoundExcelFile() {
      if (!isTauriApp() || !this.excelFilePath) {
        this.syncStatus = "idle"
        return false
      }

      try {
        this.syncStatus = "saving"
        this.syncErrorMessage = ""
        const bytes = exportPresetsToBytes(this.presetRecords)

        await writeBinaryFile(this.excelFilePath, bytes)

        this.syncStatus = "saved"
        this.lastSyncedAt = new Date().toISOString()
        this.persistState()

        return true
      }
      catch (error) {
        this.syncStatus = "error"
        this.syncErrorMessage = error?.message || "Excel 同步失败"
        this.persistState()

        return false
      }
    },

    async addPresetRecord(payload) {
      const country = payload?.country?.trim?.() || ""
      const platform = payload?.platform?.trim?.() || ""

      if (!country || !platform)
        return null

      const country_platform = createCountryPlatformValue(country, platform)
      const exists = this.presetRecords.some(
        item => item.id === country_platform,
      )

      if (exists) {
        this.activePresetId = country_platform
        this.persistState()
        return this.activePreset
      }

      const nextItem = createPresetRecord(
        {
          id: country_platform,
          country,
          platform,
          country_platform,
          sort: this.presetRecords.length + 1,
        },
        this.presetRecords.length,
      )

      this.presetRecords.push(nextItem)
      this.activePresetId = nextItem.id
      this.persistState()
      await this.syncBoundExcelFile()

      return nextItem
    },

    async removePresetRecord(id) {
      if (!id)
        return false

      const targetIndex = this.presetRecords.findIndex(item => item.id === id)

      if (targetIndex < 0)
        return false

      this.presetRecords.splice(targetIndex, 1)

      if (!this.presetRecords.length) {
        this.activePresetId = ""
      }
      else if (this.activePresetId === id) {
        const nextActiveItem
          = this.presetRecords[targetIndex]
            || this.presetRecords[targetIndex - 1]
            || this.presetRecords[0]

        this.activePresetId = nextActiveItem?.id || ""
      }

      this.persistState()
      await this.syncBoundExcelFile()

      return true
    },
  },
})
