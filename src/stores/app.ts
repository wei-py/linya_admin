import dayjs from 'dayjs'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useLocalStorageState } from 'vue-hooks-plus'
import XEUtils from 'xe-utils'

type PresetRecord = {
  id: number
  country: string
  platform: string
  profitRate: number
  updatedAt: string
}

type TemplateRecord = {
  id: number
  name: string
  dimensions: string
  rule: string
}

type OrderRecord = {
  sku: string
  country: string
  platform: string
  salePrice: number
  profit: number
  updatedAt: string
}

const defaultPresets: PresetRecord[] = [
  { id: 1, country: '巴西', platform: '美客多', profitRate: 18.4, updatedAt: '2026-04-02 10:00' },
  { id: 2, country: '墨西哥', platform: 'Amazon', profitRate: 16.8, updatedAt: '2026-04-01 21:30' },
  { id: 3, country: '智利', platform: 'Falabella', profitRate: 14.2, updatedAt: '2026-04-01 16:45' },
]

const defaultTemplates: TemplateRecord[] = [
  { id: 1, name: '巴西佣金表', dimensions: '类目 x 广告类型', rule: '查表("巴西佣金表", {类目}, {广告类型})' },
  { id: 2, name: '固定附加费表', dimensions: '售价区间', rule: '查表("固定附加费表", {折后售价})' },
]

const defaultOrders: OrderRecord[] = [
  { sku: 'LY-24001', country: '巴西', platform: '美客多', salePrice: 169.9, profit: 29.7, updatedAt: '2026-04-02 09:20' },
  { sku: 'LY-24002', country: '墨西哥', platform: 'Amazon', salePrice: 215, profit: 31.2, updatedAt: '2026-04-02 08:55' },
  { sku: 'LY-24003', country: '智利', platform: 'Falabella', salePrice: 198.5, profit: 24.1, updatedAt: '2026-04-01 22:10' },
]

export const navigationItems = [
  { label: '预设', short: 'Preset', to: '/preset', icon: 'mdi-tune-variant' },
  { label: '模板', short: 'Template', to: '/template', icon: 'mdi-table-search' },
  { label: '创建', short: 'Create', to: '/create', icon: 'mdi-pencil-box-outline' },
  { label: '列表', short: 'List', to: '/list', icon: 'mdi-file-document-multiple-outline' },
]

export const useAppStore = defineStore('app', () => {
  const projectName = ref('Linya Desktop')
  const now = ref(dayjs().format('YYYY-MM-DD HH:mm'))

  const [presetsState, setPresetsState] = useLocalStorageState<PresetRecord[]>('linya-presets', {
    defaultValue: defaultPresets,
  })
  const [templatesState] = useLocalStorageState<TemplateRecord[]>('linya-templates', {
    defaultValue: defaultTemplates,
  })
  const [ordersState] = useLocalStorageState<OrderRecord[]>('linya-orders', {
    defaultValue: defaultOrders,
  })

  const presets = computed(() => XEUtils.orderBy(presetsState.value ?? [], ['updatedAt'], ['desc']))
  const templates = computed(() => templatesState.value ?? [])
  const orders = computed(() => ordersState.value ?? [])

  const workspaceStats = computed(() => [
    { label: '同步时间', value: now.value },
    { label: '预设组合', value: `${presets.value.length} 组` },
    { label: '模板规则', value: `${templates.value.length} 条` },
    { label: '订单记录', value: `${orders.value.length} 条` },
  ])

  function addPreset(record: Omit<PresetRecord, 'id' | 'updatedAt'>) {
    const next = XEUtils.clone(presetsState.value ?? [], true)
    next.unshift({
      ...record,
      id: Date.now(),
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    })
    setPresetsState(next)
    now.value = dayjs().format('YYYY-MM-DD HH:mm')
  }

  return {
    addPreset,
    now,
    orders,
    presets,
    projectName,
    templates,
    workspaceStats,
  }
})
