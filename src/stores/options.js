import { defineStore } from "pinia"

import { usePresetStore } from "@/stores/preset"
import {
  exportWorkbookToBytes,
  readWorkbookFromBytes,
} from "@/utils/excel/workbook"
import {
  normalizeAppOption,
  normalizeAppOptionGroup,
  readAppOptionGroupsSheet,
  readAppOptionsSheet,
  writeAppOptionsWorkbook,
} from "@/utils/options/excel"
import {
  isTauriApp,
  readBinaryFile,
  writeBinaryFile,
} from "@/utils/tauri/excel-file"

const DEFAULT_OPTION_GROUPS = [
  {
    key: "shipping_included",
    title: "是否包邮",
    description: "创建页当前包邮状态使用的选项。",
    sort: 1,
    enabled: 1,
    remark: "",
  },
  {
    key: "ad_type",
    title: "广告类型",
    description: "创建页和佣金表里使用的广告类型选项。",
    sort: 2,
    enabled: 1,
    remark: "",
  },
  {
    key: "category",
    title: "类目",
    description: "创建页和佣金表里使用的类目选项。",
    sort: 3,
    enabled: 1,
    remark: "",
  },
]

let optionsSyncTimer = null

function createOptionId(groupKey, seed = "") {
  const nextSeed
    = seed || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  return `${groupKey}__${nextSeed}`
}

function createGroupKey(seed = "") {
  const nextSeed
    = seed || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  return `group_${nextSeed}`
}

function createDefaultOption(groupKey, index = 0) {
  return normalizeAppOption(
    {
      id: createOptionId(groupKey),
      groupKey,
      label: "",
      value: "",
      sort: index + 1,
      enabled: 1,
      remark: "",
    },
    index,
  )
}

function createDefaultGroup(index = 0) {
  return normalizeAppOptionGroup(
    {
      key: createGroupKey(),
      title: `新分组 ${index + 1}`,
      description: "",
      sort: index + 1,
      enabled: 1,
      remark: "",
    },
    index,
  )
}

function sortList(list = []) {
  list.forEach((item, index) => {
    item.sort = index + 1
  })
}

function mergeGroupDefinitions(groups = [], options = []) {
  const definedGroups = groups.map((item, index) =>
    normalizeAppOptionGroup(item, index),
  )
  const missingKeys = Array.from(
    new Set(
      options
        .map(item => normalizeAppOption(item).groupKey)
        .filter(Boolean)
        .filter(key => !definedGroups.some(group => group.key === key)),
    ),
  )

  return [
    ...definedGroups,
    ...missingKeys.map((key, index) =>
      normalizeAppOptionGroup(
        {
          key,
          title: key,
          description: "",
          sort: definedGroups.length + index + 1,
          enabled: 1,
          remark: "",
        },
        definedGroups.length + index,
      ),
    ),
  ].sort((a, b) => a.sort - b.sort)
}

export const useOptionsStore = defineStore("options", {
  state: () => ({
    optionGroups: DEFAULT_OPTION_GROUPS.map((item, index) =>
      normalizeAppOptionGroup(item, index),
    ),
    optionEntries: [],
    activeGroupKey: DEFAULT_OPTION_GROUPS[0].key,
    syncStatus: "idle",
    syncErrorMessage: "",
    lastSyncedAt: "",
  }),

  getters: {
    activeGroup(state) {
      return (
        state.optionGroups.find(item => item.key === state.activeGroupKey)
        || state.optionGroups[0]
        || null
      )
    },
    activeGroupEntries(state) {
      return state.optionEntries
        .filter(item => item.groupKey === state.activeGroupKey)
        .sort((a, b) => a.sort - b.sort)
    },
    adTypeOptions(state) {
      return state.optionEntries
        .filter(item => item.groupKey === "ad_type" && item.enabled)
        .sort((a, b) => a.sort - b.sort)
        .map(item => item.label)
    },
    categoryOptions(state) {
      return state.optionEntries
        .filter(item => item.groupKey === "category" && item.enabled)
        .sort((a, b) => a.sort - b.sort)
        .map(item => item.label)
    },
    shippingIncludedOptions(state) {
      return state.optionEntries
        .filter(item => item.groupKey === "shipping_included" && item.enabled)
        .sort((a, b) => a.sort - b.sort)
        .map(item => ({
          title: item.label,
          value: item.value,
        }))
    },
  },

  actions: {
    setActiveGroup(key) {
      this.activeGroupKey = this.optionGroups.some(item => item.key === key)
        ? key
        : this.optionGroups[0]?.key || ""
    },

    setOptionData(groups = [], options = []) {
      this.optionEntries = options.map((item, index) =>
        normalizeAppOption(item, index),
      )
      this.optionGroups = mergeGroupDefinitions(groups, this.optionEntries)
      this.setActiveGroup(this.activeGroupKey)
    },

    async refreshFromBoundExcel() {
      const presetStore = usePresetStore()

      if (presetStore.excelFilePath) {
        try {
          const bytes = await readBinaryFile(presetStore.excelFilePath)
          const workbook = readWorkbookFromBytes(bytes)

          this.setOptionData(
            readAppOptionGroupsSheet(workbook),
            readAppOptionsSheet(workbook),
          )
          this.syncStatus = "saved"
          this.syncErrorMessage = ""
          this.lastSyncedAt = new Date().toISOString()

          return true
        }
        catch (error) {
          this.optionGroups = []
          this.optionEntries = []
          this.syncStatus = "error"
          this.syncErrorMessage = error?.message || "选项 Excel 读取失败"

          return false
        }
      }

      if (presetStore.excelFile) {
        try {
          const bytes = await presetStore.excelFile.arrayBuffer()
          const workbook = readWorkbookFromBytes(bytes)

          this.setOptionData(
            readAppOptionGroupsSheet(workbook),
            readAppOptionsSheet(workbook),
          )
          this.syncStatus = "idle"
          this.syncErrorMessage = ""

          return true
        }
        catch (error) {
          this.optionGroups = []
          this.optionEntries = []
          this.syncStatus = "error"
          this.syncErrorMessage = error?.message || "选项 Excel 读取失败"

          return false
        }
      }

      this.optionGroups = DEFAULT_OPTION_GROUPS.map((item, index) =>
        normalizeAppOptionGroup(item, index),
      )
      this.optionEntries = []
      this.activeGroupKey = this.optionGroups[0]?.key || ""
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

      if (optionsSyncTimer) {
        clearTimeout(optionsSyncTimer)
      }

      optionsSyncTimer = window.setTimeout(() => {
        optionsSyncTimer = null
        void this.syncBoundExcelFile()
      }, delay)
    },

    persistOptionChanges() {
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
        const nextWorkbook = writeAppOptionsWorkbook(workbook, {
          groups: this.optionGroups,
          options: this.optionEntries,
        })
        const bytes = exportWorkbookToBytes(nextWorkbook)

        await writeBinaryFile(presetStore.excelFilePath, bytes)

        this.syncStatus = "saved"
        this.lastSyncedAt = new Date().toISOString()

        return true
      }
      catch (error) {
        this.syncStatus = "error"
        this.syncErrorMessage = error?.message || "选项 Excel 同步失败"

        return false
      }
    },

    addGroup(seed = {}) {
      const nextGroup = normalizeAppOptionGroup(
        {
          ...createDefaultGroup(this.optionGroups.length),
          ...seed,
          key: seed.key || createGroupKey(),
        },
        this.optionGroups.length,
      )

      this.optionGroups.push(nextGroup)
      sortList(this.optionGroups)
      this.activeGroupKey = nextGroup.key
      this.persistOptionChanges()

      return nextGroup
    },

    updateGroup(key, patch = {}) {
      const target = this.optionGroups.find(item => item.key === key)

      if (!target) {
        return false
      }

      const previousKey = target.key
      Object.assign(target, patch)

      target.key = String(target.key ?? "").trim() || previousKey
      target.title = String(target.title ?? "").trim() || target.key
      target.description = String(target.description ?? "").trim()
      target.remark = String(target.remark ?? "").trim()
      target.enabled = Number(target.enabled) === 0 ? 0 : 1

      if (target.key !== previousKey) {
        this.optionEntries.forEach((item) => {
          if (item.groupKey === previousKey) {
            item.groupKey = target.key
            item.id = createOptionId(target.key)
          }
        })
        if (this.activeGroupKey === previousKey) {
          this.activeGroupKey = target.key
        }
      }

      this.persistOptionChanges()

      return true
    },

    removeGroup(key) {
      const targetIndex = this.optionGroups.findIndex(item => item.key === key)

      if (targetIndex < 0) {
        return false
      }

      this.optionGroups.splice(targetIndex, 1)
      this.optionEntries = this.optionEntries.filter(
        item => item.groupKey !== key,
      )
      sortList(this.optionGroups)

      if (this.activeGroupKey === key) {
        this.activeGroupKey = this.optionGroups[0]?.key || ""
      }

      this.persistOptionChanges()

      return true
    },

    addOption(groupKey = this.activeGroupKey, seed = {}) {
      const groupEntries = this.optionEntries.filter(
        item => item.groupKey === groupKey,
      )
      const nextItem = normalizeAppOption(
        {
          ...createDefaultOption(groupKey, groupEntries.length),
          ...seed,
          id: seed.id || createOptionId(groupKey),
          groupKey,
        },
        groupEntries.length,
      )

      this.optionEntries.push(nextItem)
      sortList(
        this.optionEntries.filter(item => item.groupKey === groupKey),
      )
      this.persistOptionChanges()

      return nextItem
    },

    updateOption(id, patch = {}) {
      const target = this.optionEntries.find(item => item.id === id)

      if (!target) {
        return false
      }

      Object.assign(target, patch)

      target.label = String(target.label ?? "").trim()
      target.value = String(target.value ?? "").trim()
      target.remark = String(target.remark ?? "").trim()
      target.enabled = Number(target.enabled) === 0 ? 0 : 1

      this.persistOptionChanges()

      return true
    },

    removeOption(id) {
      const targetIndex = this.optionEntries.findIndex(item => item.id === id)

      if (targetIndex < 0) {
        return false
      }

      const [removed] = this.optionEntries.splice(targetIndex, 1)
      sortList(
        this.optionEntries.filter(
          item => item.groupKey === removed.groupKey,
        ),
      )
      this.persistOptionChanges()

      return true
    },

    ensureDefaultOptions() {
      DEFAULT_OPTION_GROUPS.forEach((group) => {
        if (!this.optionGroups.some(item => item.key === group.key)) {
          this.optionGroups.push(normalizeAppOptionGroup(group))
        }
      })
      sortList(this.optionGroups)

      const hasShippingIncluded = this.optionEntries.some(
        item => item.groupKey === "shipping_included",
      )

      if (!hasShippingIncluded) {
        this.addOption("shipping_included", {
          label: "是",
          value: "是",
          remark: "",
        })
        this.addOption("shipping_included", {
          label: "否",
          value: "否",
          remark: "",
        })
      }

      const hasAdType = this.optionEntries.some(item => item.groupKey === "ad_type")

      if (!hasAdType) {
        this.addOption("ad_type", {
          label: "Clássico",
          value: "Clássico",
          remark: "Mercado Livre 广告类型。",
        })
        this.addOption("ad_type", {
          label: "Premium",
          value: "Premium",
          remark: "Mercado Livre 广告类型。",
        })
      }

      const hasCategory = this.optionEntries.some(
        item => item.groupKey === "category",
      )

      if (!hasCategory) {
        const defaultCategories = ["默认", "服饰", "3C", "家居", "美妆"]

        defaultCategories.forEach((label) => {
          this.addOption("category", {
            label,
            value: label,
            remark: "",
          })
        })
      }
    },
  },
})
