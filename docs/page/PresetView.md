# PresetView 页面说明

## 页面定位

`PresetView.vue` 是预设页的第一阶段实现。

当前页面主要负责两件事：

- 管理左侧的国家 + 平台组合列表
- 展示已经绑定并读取完成的 Excel 数据
- 在绑定 Excel 后触发组合层的自动同步

当前正式数据模型已经切到 2 个 sheet：

- `preset_groups`
- `preset_items`

页面读取 Excel 后，会把这两个 sheet 组装成：

```js
;[
  {
    id: "巴西_美客多",
    country: "巴西",
    platform: "美客多",
    country_platform: "巴西_美客多",
    sort: 1,
    items: [
      {
        id: "item_001",
        preset_id: "巴西_美客多",
        name: "活动费率",
        type: "number",
        unit: "%",
        value: "3",
        sort: 1,
      },
    ],
  },
]
```

详细数据格式见：

- [docs/preset-data-format.md](/Users/wx/Documents/learn/linya_admin/docs/preset-data-format.md)

## 依赖来源

这个页面当前主要依赖三类数据：

### 1. 下拉选项

来自：

- [src/constants/preset.js](/Users/wx/Documents/learn/linya_admin/src/constants/preset.js)

包括：

- `countryOptions`
- `platformOptions`

### 2. Excel helper

来自：

- [src/utils/preset/excel.js](/Users/wx/Documents/learn/linya_admin/src/utils/preset/excel.js)

当前页面实际使用到：

- `preset` store 提供的预设数据

### 3. Pinia store

页面现在不直接负责 Excel 文件绑定。

相关状态和动作统一收到了：

- [src/stores/preset.js](/Users/wx/Documents/learn/linya_admin/src/stores/preset.js)

当前页面实际使用到：

- `presetRecords`
- `activePresetId`
- `activePreset`
- `addPresetRecord()`
- `setActivePreset()`

## 页面状态

### 基础表单

`baseInfo` 用来承接顶部两个输入框：

```js
const baseInfo = reactive({
  country: "",
  platform: "",
})
```

作用：

- 新增组合时收集输入值
- 点击左侧组合后回填当前组合

### 预设列表

页面核心数据是：

```js
const presetStore = usePresetStore()
const { activePreset, activePresetId, presetRecords } = storeToRefs(presetStore)
```

每一项都是一个组合对象，内部包含：

- `country`
- `platform`
- `country_platform`
- `items`

### 当前选中项

```js
const presetStore = usePresetStore()
const { activePreset, activePresetId } = storeToRefs(presetStore)
```

作用：

- 左侧列表高亮
- 右侧详情区显示当前组合内容

## 本地缓存

页面相关状态由 `preset` store 统一缓存到 `localStorage`。

使用的 key：

- `preset:records`
- `preset:excelFileName`
- `preset:excelFilePath`
- `preset:activePresetId`

同时保留了老版本兼容 key：

- `preset:excelRows`
- `preset:activeCountryPlatform`

这样做的目的是：

- 刷新页面后，左侧列表不丢
- 当前选中组合不丢
- 已读取的文件名还能显示
- Tauri 模式下可以恢复上一次绑定的 Excel 路径

注意：

- 浏览器模式下仍然只是缓存页面结果
- Tauri 模式下如果存在 `preset:excelFilePath`，会重新读取原 Excel 文件

## 初始化逻辑

页面本身不再处理初始化缓存。

这些逻辑都已经移动到：

- [src/stores/preset.js](/Users/wx/Documents/learn/linya_admin/src/stores/preset.js)

store 启动时会先尝试从缓存恢复数据。

逻辑顺序：

1. 读新的 `preset:records`
2. 如果没有，再读旧的 `preset:excelRows`
3. 统一通过 `createPresetRecord()` 转成当前页面结构

其中 `createPresetRecord()` 的作用是把旧格式和新格式都整理成统一对象：

- 补 `id`
- 补 `country_platform`
- 补 `sort`
- 保证 `items` 一定是数组

所以这个函数本质上是页面内部的兼容层。

## 主要交互流程

### 1. 绑定 Excel

这个流程已经移到：

- [src/App.vue](/Users/wx/Documents/learn/linya_admin/src/App.vue)

也就是说：

- `App.vue` 负责选择文件和读取 Excel
- `PresetView.vue` 只负责消费 store 里的结果

`App.vue` 触发绑定后，会调用 store 中的：

- 浏览器模式：`bindExcelFile(file)`
- Tauri 模式：`bindExcelFilePath(path)`

处理顺序：

1. 取出用户选择的文件或路径
2. 读取 Excel 字节
3. 调用 Excel helper 解析 `preset_groups` 和 `preset_items`
4. 把结果写入 store 中的 `presetRecords`
5. 默认选中第一条组合
6. 持久化到本地缓存

### 2. 添加组合

入口函数：

- `handleAdd()`

处理规则：

1. 从 `baseInfo` 取出国家和平台
2. 调用 store 的 `addPresetRecord()`
3. 如果组合已存在，则直接切换选中
4. 如果不存在，则创建一条新的组合记录
5. 更新当前选中项并缓存
6. 如果当前是 Tauri 绑定路径，则自动写回原 Excel 文件

当前新增只处理“组合层”数据，还没有开始维护参数项编辑。

### 3. 选择组合

入口函数：

- `handleSelectPreset(item)`

处理内容：

- 调用 store 的 `setActivePreset(item.id)`
- `activePreset` 变化后自动回填 `baseInfo`
- store 负责更新本地缓存

## 模板结构

页面结构目前是左右两栏。

### 左侧

左侧主要负责组合管理：

- 国家输入框
- 平台输入框
- 添加按钮
- 组合列表

这里的列表显示：

- `country_platform`
- 当前组合下的参数项数量

### 右侧

右侧当前是详情区，不是完整编辑区。

当存在选中组合时，显示：

- 组合标题
- 国家 / 平台
- 参数项列表

当参数项为空时，显示占位提示：

- `当前组合还没有参数项，后续在这里维护。`

如果没有选中任何组合，则显示空状态提示。

## 为什么现在这样拆

当前页面先把“组合层”和“Excel 读取”接通，原因是：

- 先确认页面使用的数据结构
- 先确认 Excel 两个 sheet 的导入结果
- 先把左侧组合切换链路跑通
- 把文件绑定入口固定在应用壳层

这样后面再继续做右侧参数项编辑时，不需要反复改页面骨架。

## 当前边界

`PresetView.vue` 现在已经完成：

- 读取 Excel
- 展示组合列表
- 切换当前组合
- 展示参数项明细
- 页面刷新后的本地缓存恢复
- 绑定后新增组合自动同步回原 Excel 文件

但还没完成：

- 参数项新增
- 参数项删除
- 参数项排序
- 参数项编辑

## 后续开发方向

这个页面后面建议按下面顺序继续：

1. 右侧参数项编辑表格
2. 参数项新增 / 删除 / 排序
3. `preset_items` 的自动同步
4. 组合层和参数项层的删除 / 编辑同步
5. Excel 导出作为手动备份入口
