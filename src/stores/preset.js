import { defineStore } from "pinia"

import { defaultPresetItemTemplates } from "@/constants/preset"
import {
  exportWorkbookToBytes,
  readWorkbookFromBytes,
} from "@/utils/excel/workbook"
import {
  createCountryPlatformValue,
  importPresetsFromBytes,
  importPresetsFromExcel,
  writePresetWorkbook,
} from "@/utils/preset/excel"
import {
  createDefaultRuleConfig,
  normalizePresetRuleMode,
  parseRuleConfig,
} from "@/utils/preset/rule-config"
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
let presetSyncTimer = null

function createPresetItemId(presetId) {
  return `${presetId}__item__${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function normalizePresetItemType(type) {
  if (type === "boolean")
    return "boolean"

  if (type === "rule")
    return "rule"

  return "number"
}

function createPresetItem(item, presetId, index) {
  const nextPresetId = item?.preset_id || presetId || ""
  const nextType = normalizePresetItemType(item?.type)
  const nextRuleMode = normalizePresetRuleMode(item?.rule_mode)
  const nextValue
    = nextType === "boolean"
      ? ["是", "否"].includes(item?.value)
          ? item.value
          : ""
      : String(item?.value ?? "")

  return {
    id: item?.id || createPresetItemId(nextPresetId),
    preset_id: nextPresetId,
    name: item?.name?.trim?.() || "",
    type: nextType,
    unit: item?.unit?.trim?.() || "",
    value: nextValue,
    rule_mode: nextType === "rule" ? nextRuleMode : "",
    rule_table_id: item?.rule_table_id?.trim?.() || "",
    rule_config:
      nextType === "rule"
        ? parseRuleConfig(item?.rule_config, nextRuleMode)
        : createDefaultRuleConfig(),
    sort: Number(item?.sort) || index + 1,
  }
}

function resetPresetItemSorts(items) {
  items.forEach((item, index) => {
    item.sort = index + 1
  })
}

function createDefaultPresetItems(presetId) {
  return defaultPresetItemTemplates.map((item, index) =>
    createPresetItem(
      {
        ...item,
        preset_id: presetId,
      },
      presetId,
      index,
    ),
  )
}

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
    items: Array.isArray(item?.items)
      ? item.items.map((presetItem, itemIndex) =>
          createPresetItem(presetItem, item?.id || country_platform, itemIndex),
        )
      : [],
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
    hasBoundExcelFile(state) {
      return Boolean(state.excelFilePath || state.excelFile)
    },

    activePreset(state) {
      return (
        state.presetRecords.find(item => item.id === state.activePresetId)
        || null
      )
    },
  },

  actions: {
    scheduleSyncBoundExcelFile(delay = 300) {
      if (!isTauriApp() || !this.excelFilePath)
        return

      if (presetSyncTimer) {
        clearTimeout(presetSyncTimer)
      }

      presetSyncTimer = window.setTimeout(() => {
        presetSyncTimer = null
        void this.syncBoundExcelFile()
      }, delay)
    },

    persistPresetChanges() {
      this.persistState()
      this.scheduleSyncBoundExcelFile()
    },

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
        const currentBytes = await readBinaryFile(this.excelFilePath)
        const workbook = readWorkbookFromBytes(currentBytes)
        const nextWorkbook = writePresetWorkbook(workbook, this.presetRecords)
        const bytes = exportWorkbookToBytes(nextWorkbook)

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
          items: createDefaultPresetItems(country_platform),
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

    addPresetItem(presetId = this.activePresetId) {
      if (!presetId)
        return null

      const preset = this.presetRecords.find(item => item.id === presetId)

      if (!preset)
        return null

      const nextItem = createPresetItem(
        {
          preset_id: preset.id,
          type: "number",
          value: "",
          unit: "",
          rule_mode: "",
          rule_table_id: "",
          rule_config: createDefaultRuleConfig(),
        },
        preset.id,
        preset.items.length,
      )

      preset.items.push(nextItem)
      resetPresetItemSorts(preset.items)
      this.persistPresetChanges()

      return nextItem
    },

    fillDefaultPresetItems(presetId = this.activePresetId) {
      if (!presetId)
        return false

      const preset = this.presetRecords.find(item => item.id === presetId)

      if (!preset || preset.items.length)
        return false

      preset.items = createDefaultPresetItems(preset.id)
      resetPresetItemSorts(preset.items)
      this.persistPresetChanges()

      return true
    },

    updatePresetItem(presetId, itemId, patch = {}) {
      if (!presetId || !itemId)
        return false

      const preset = this.presetRecords.find(item => item.id === presetId)

      if (!preset)
        return false

      const target = preset.items.find(item => item.id === itemId)

      if (!target)
        return false

      Object.assign(target, patch)

      target.name = target.name?.trim?.() || ""
      target.unit = target.unit?.trim?.() || ""
      target.type = normalizePresetItemType(target.type)
      target.rule_table_id = target.rule_table_id?.trim?.() || ""

      if (target.type === "boolean") {
        target.value = ["是", "否"].includes(target.value) ? target.value : ""
        target.rule_mode = ""
        target.rule_table_id = ""
        target.rule_config = createDefaultRuleConfig()
      }
      else if (target.type === "rule") {
        target.value = String(target.value ?? "")
        target.rule_mode = normalizePresetRuleMode(target.rule_mode)
        target.rule_config = parseRuleConfig(
          target.rule_config,
          target.rule_mode,
        )
      }
      else {
        target.value = String(target.value ?? "")
        target.rule_mode = ""
        target.rule_table_id = ""
        target.rule_config = createDefaultRuleConfig()
      }

      this.persistPresetChanges()

      return true
    },

    removePresetItem(presetId, itemId) {
      if (!presetId || !itemId)
        return false

      const preset = this.presetRecords.find(item => item.id === presetId)

      if (!preset)
        return false

      const targetIndex = preset.items.findIndex(item => item.id === itemId)

      if (targetIndex < 0)
        return false

      preset.items.splice(targetIndex, 1)
      resetPresetItemSorts(preset.items)
      this.persistPresetChanges()

      return true
    },
  },
})
