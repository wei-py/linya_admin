import { defineStore } from "pinia"

import {
  exportListWorkbookToBytes,
  importListWorkbookFromBytes,
  normalizeListWorkbookData,
} from "@/utils/list/excel"
import {
  isTauriApp,
  readBinaryFile,
  writeBinaryFile,
} from "@/utils/tauri/excel-file"

const LIST_RECORDS_STORAGE_KEY = "list:records"
const LIST_IMAGES_STORAGE_KEY = "list:images"
const LIST_VARIANTS_STORAGE_KEY = "list:variants"
const LIST_FIELDS_STORAGE_KEY = "list:fields"
const LIST_EXCEL_FILE_NAME_STORAGE_KEY = "list:excelFileName"
const LIST_EXCEL_FILE_PATH_STORAGE_KEY = "list:excelFilePath"
const LIST_DIRTY_STORAGE_KEY = "list:dirty"
const LIST_LAST_SYNCED_AT_STORAGE_KEY = "list:lastSyncedAt"

function parseCachedList(key) {
  const value = JSON.parse(localStorage.getItem(key) || "[]")

  return Array.isArray(value) ? value : []
}

export const useListStore = defineStore("list", {
  state: () => ({
    excelFile: null,
    excelFileName: localStorage.getItem(LIST_EXCEL_FILE_NAME_STORAGE_KEY) || "",
    excelFilePath: localStorage.getItem(LIST_EXCEL_FILE_PATH_STORAGE_KEY) || "",
    records: parseCachedList(LIST_RECORDS_STORAGE_KEY),
    images: parseCachedList(LIST_IMAGES_STORAGE_KEY),
    variants: parseCachedList(LIST_VARIANTS_STORAGE_KEY),
    fields: parseCachedList(LIST_FIELDS_STORAGE_KEY),
    syncStatus: "idle",
    syncErrorMessage: "",
    lastSyncedAt: localStorage.getItem(LIST_LAST_SYNCED_AT_STORAGE_KEY) || "",
    dirty: localStorage.getItem(LIST_DIRTY_STORAGE_KEY) === "1",
  }),

  getters: {
    hasBoundExcelFile(state) {
      return Boolean(state.excelFilePath || state.excelFile)
    },

    recordCount(state) {
      return state.records.length
    },

    recordItems(state) {
      return state.records.map((record) => {
        const recordImages = state.images
          .filter(item => item.productId === record.id)
          .sort((a, b) => a.sort - b.sort)
        const coverImage
          = recordImages.find(item => item.id === record.coverImageId)
            || recordImages.find(item => item.isCover)
            || recordImages[0]
            || null

        return {
          ...record,
          coverImage,
          imageCount: recordImages.length,
        }
      })
    },
  },

  actions: {
    persistState() {
      localStorage.setItem(
        LIST_RECORDS_STORAGE_KEY,
        JSON.stringify(this.records),
      )
      localStorage.setItem(LIST_IMAGES_STORAGE_KEY, JSON.stringify(this.images))
      localStorage.setItem(
        LIST_VARIANTS_STORAGE_KEY,
        JSON.stringify(this.variants),
      )
      localStorage.setItem(LIST_FIELDS_STORAGE_KEY, JSON.stringify(this.fields))
      localStorage.setItem(LIST_DIRTY_STORAGE_KEY, this.dirty ? "1" : "0")

      if (this.lastSyncedAt) {
        localStorage.setItem(
          LIST_LAST_SYNCED_AT_STORAGE_KEY,
          this.lastSyncedAt,
        )
      }
      else {
        localStorage.removeItem(LIST_LAST_SYNCED_AT_STORAGE_KEY)
      }

      if (this.excelFileName) {
        localStorage.setItem(
          LIST_EXCEL_FILE_NAME_STORAGE_KEY,
          this.excelFileName,
        )
      }
      else {
        localStorage.removeItem(LIST_EXCEL_FILE_NAME_STORAGE_KEY)
      }

      if (this.excelFilePath) {
        localStorage.setItem(
          LIST_EXCEL_FILE_PATH_STORAGE_KEY,
          this.excelFilePath,
        )
      }
      else {
        localStorage.removeItem(LIST_EXCEL_FILE_PATH_STORAGE_KEY)
      }
    },

    setWorkbookData(payload = {}) {
      const nextData = normalizeListWorkbookData(payload)

      this.records = nextData.records
      this.images = nextData.images
      this.variants = nextData.variants
      this.fields = nextData.fields
      this.persistState()
    },

    touchDirty() {
      this.dirty = true
      this.persistState()
    },

    addProductBundle(bundle = {}) {
      const record = bundle.record

      if (!record?.id) {
        return null
      }

      this.records = this.records.filter(item => item.id !== record.id)
      this.images = this.images.filter(item => item.productId !== record.id)
      this.variants = this.variants.filter(item => item.productId !== record.id)
      this.fields = this.fields.filter(item => item.productId !== record.id)

      this.records.unshift(record)
      this.images.unshift(...(bundle.images || []))
      this.variants.unshift(...(bundle.variants || []))
      this.fields.unshift(...(bundle.fields || []))
      this.touchDirty()

      return record
    },

    removeRecord(recordId) {
      if (!recordId) {
        return false
      }

      this.records = this.records.filter(item => item.id !== recordId)
      this.images = this.images.filter(item => item.productId !== recordId)
      this.variants = this.variants.filter(item => item.productId !== recordId)
      this.fields = this.fields.filter(item => item.productId !== recordId)
      this.touchDirty()

      return true
    },

    async bindExcelFile(file) {
      if (!file) {
        return false
      }

      try {
        const bytes = new Uint8Array(await file.arrayBuffer())

        this.excelFile = file
        this.excelFileName = file.name
        this.excelFilePath = ""
        this.setWorkbookData(importListWorkbookFromBytes(bytes))
        this.syncStatus = "idle"
        this.syncErrorMessage = ""
        this.dirty = false
        this.persistState()

        return true
      }
      catch (error) {
        this.syncStatus = "error"
        this.syncErrorMessage = error?.message || "列表 Excel 读取失败"

        return false
      }
    },

    async bindExcelFilePath(path) {
      if (!path) {
        return false
      }

      try {
        const bytes = await readBinaryFile(path)

        this.excelFile = null
        this.excelFileName = path.split(/[/\\]/).pop() || path
        this.excelFilePath = path
        this.setWorkbookData(importListWorkbookFromBytes(bytes))
        this.syncStatus = "saved"
        this.syncErrorMessage = ""
        this.lastSyncedAt = new Date().toISOString()
        this.dirty = false
        this.persistState()

        return true
      }
      catch (error) {
        this.syncStatus = "error"
        this.syncErrorMessage = error?.message || "列表 Excel 绑定失败"

        return false
      }
    },

    async refreshBoundExcelFile(options = {}) {
      const { force = false } = options

      if (!isTauriApp() || !this.excelFilePath) {
        return false
      }

      if (this.dirty && !force) {
        return false
      }

      return this.bindExcelFilePath(this.excelFilePath)
    },

    async exportWorkbookBytes() {
      const bytes = await exportListWorkbookToBytes({
        records: this.records,
        images: this.images,
        variants: this.variants,
        fields: this.fields,
      })

      return new Uint8Array(bytes)
    },

    async syncBoundExcelFile(path = "") {
      const targetPath = path || this.excelFilePath

      if (!isTauriApp() || !targetPath) {
        this.syncStatus = "idle"
        return false
      }

      try {
        this.syncStatus = "saving"
        this.syncErrorMessage = ""
        const bytes = await this.exportWorkbookBytes()

        await writeBinaryFile(targetPath, bytes)

        this.excelFilePath = targetPath
        this.excelFileName = targetPath.split(/[/\\]/).pop() || targetPath
        this.syncStatus = "saved"
        this.lastSyncedAt = new Date().toISOString()
        this.dirty = false
        this.persistState()

        return true
      }
      catch (error) {
        this.syncStatus = "error"
        this.syncErrorMessage = error?.message || "列表 Excel 保存失败"

        return false
      }
    },
  },
})
