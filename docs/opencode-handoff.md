# Linya Admin Handoff

## 项目概况

这是一个 `Tauri + Vue 3 + Pinia + Vuetify + xlsx` 的桌面工具项目，目标是做一个 `IBM Carbon Productive` 风格的 Excel 驱动配置后台。

主要页面：

- `预设`：维护国家/平台组合和参数项
- `模板`：维护规则表
- `创建`：基于预设和规则计算商品结果
- `列表`：目前不是重点，基本还是占位

核心入口与结构：

- 前端入口：[src/App.vue](/Users/wx/Documents/learn/linya_admin/src/App.vue:1)
- 全局样式：[src/styles/index.css](/Users/wx/Documents/learn/linya_admin/src/styles/index.css:1)
- 预设 store：[src/stores/preset.js](/Users/wx/Documents/learn/linya_admin/src/stores/preset.js:1)
- 模板 store：[src/stores/template.js](/Users/wx/Documents/learn/linya_admin/src/stores/template.js:1)
- 创建页：[src/views/CreateView.vue](/Users/wx/Documents/learn/linya_admin/src/views/CreateView.vue:1)
- Tauri 后端：[src-tauri/src/lib.rs](/Users/wx/Documents/learn/linya_admin/src-tauri/src/lib.rs:1)

## 已完成的 UI/UX 工作

整体方向是 `IBM-ish / Carbon Productive`：

- 三个主页面 `预设 / 模板 / 创建` 已尽量统一成同一套界面语言
- 布局统一为左侧主工作区 + 右侧辅助栏
- 输入框、面板、标题、按钮、空状态、表格风格已经统一过多轮
- 页面已经做过移动端和平板适配
- 预设页参数编辑使用 `VTable`
- 模板页关键规则编辑区也已改成更稳的表格结构
- 创建页已经重构成偏数据录入工作台

## 图片相关现状

### 1. 创建页已支持本地上传图片

相关文件：

- [src/utils/tauri/image-asset.js](/Users/wx/Documents/learn/linya_admin/src/utils/tauri/image-asset.js:1)
- [src-tauri/src/lib.rs](/Users/wx/Documents/learn/linya_admin/src-tauri/src/lib.rs:1)

当前行为：

- 创建页可以上传本地图片
- 图片会保存到应用本地数据目录下的 `img` 文件夹
- 表单中保存的是本地绝对路径
- 非 Tauri 环境有浏览器 fallback

### 2. 本地图片在 WebView 中可稳定预览

相关文件：

- [src-tauri/tauri.conf.json](/Users/wx/Documents/learn/linya_admin/src-tauri/tauri.conf.json:1)

已开启：

- `assetProtocol`
- scope 为 `$APPLOCALDATA/img/**`

所以本地图片不再只是上传瞬间的 `blob` 预览，而是可持续显示。

### 3. 图片已支持和变体关联

相关文件：

- [src/views/CreateView.vue](/Users/wx/Documents/learn/linya_admin/src/views/CreateView.vue:1)

当前模型：

- 每张图片可绑定一个 `关联变体`
- 每张图片可绑定一个 `关联选项`
- 如果变体或选项被删除，图片上的无效关联会自动清空

### 4. 已支持从 Excel 提取嵌入图片

相关文件：

- [src-tauri/src/excel_images.rs](/Users/wx/Documents/learn/linya_admin/src-tauri/src/excel_images.rs:1)
- [src/utils/tauri/excel-images.js](/Users/wx/Documents/learn/linya_admin/src/utils/tauri/excel-images.js:1)
- [src/stores/preset.js](/Users/wx/Documents/learn/linya_admin/src/stores/preset.js:1)

当前行为：

- 仅支持从真实本地 `.xlsx` 提取
- 不支持 `.xls`
- 不支持浏览器模式下的临时文件上传提取
- 绑定真实本地 Excel 路径后，会自动提取嵌入图片
- 提取出的图片会同步保存到应用本地 `img` 仓库
- 当前会返回这些信息：
  - `sheetName`
  - `sheetPath`
  - `drawingPath`
  - `sourcePath`
  - `anchorType`
  - `rowIndex`
  - `columnIndex`
  - `cell`
  - `fileName`
  - `filePath`
  - `relativePath`

### 5. 创建页已可使用 Excel 同步图片

相关文件：

- [src/views/CreateView.vue](/Users/wx/Documents/learn/linya_admin/src/views/CreateView.vue:1)

当前行为：

- 创建页会显示 `已同步 Excel 图片`
- 可以把某张 Excel 图片加入当前商品
- 加入后仍然可以继续绑定到变体/选项

### 6. 图片预览已接入第三方库

相关文件：

- [src/views/CreateView.vue](/Users/wx/Documents/learn/linya_admin/src/views/CreateView.vue:1)
- [package.json](/Users/wx/Documents/learn/linya_admin/package.json:1)

当前使用：

- `@panzoom/panzoom`

当前预览能力：

- 点击缩略图预览
- `+`
- `-`
- `1:1`
- 滚轮缩放
- 拖拽平移

补充说明：

- 预览弹层刚打开时已拦掉短时间内的滚轮惯性，避免默认显示不是 `100%`

## 当前 Excel 同步链路

Excel 绑定与同步相关文件：

- [src/utils/tauri/excel-file.js](/Users/wx/Documents/learn/linya_admin/src/utils/tauri/excel-file.js:1)
- [src/utils/excel/workbook.js](/Users/wx/Documents/learn/linya_admin/src/utils/excel/workbook.js:1)
- [src/utils/preset/excel.js](/Users/wx/Documents/learn/linya_admin/src/utils/preset/excel.js:1)
- [src/utils/template/excel.js](/Users/wx/Documents/learn/linya_admin/src/utils/template/excel.js:1)
- [src/stores/preset.js](/Users/wx/Documents/learn/linya_admin/src/stores/preset.js:1)
- [src/stores/template.js](/Users/wx/Documents/learn/linya_admin/src/stores/template.js:1)

现在的工作方式：

- Tauri 负责选文件、读字节、写字节
- 前端 `xlsx` 负责整本工作簿读取和写回
- `preset` 和 `template` 都是 `read -> modify -> write whole workbook`

## 当前最重要的风险

这件事必须优先注意：

- 当前 Excel 写回依旧是 `XLSX.read -> XLSX.write` 整本重写
- 对带嵌入图片、drawing、媒体资源的工作簿有风险
- 也就是说：
  - 现在“读取 Excel 嵌入图片”已经做了
  - 但“安全写回并保留图片/媒体/drawing”还没有做

关键位置：

- [src/utils/excel/workbook.js](/Users/wx/Documents/learn/linya_admin/src/utils/excel/workbook.js:11)
- [src/stores/preset.js](/Users/wx/Documents/learn/linya_admin/src/stores/preset.js:318)
- [src/stores/template.js](/Users/wx/Documents/learn/linya_admin/src/stores/template.js:135)

## 后续最应该继续做的事

优先级最高：

1. 改造 Excel 写回流程，保证带图工作簿不会丢失图片、drawing、媒体资源
2. 明确 Excel 嵌入图片和业务数据的映射规则
3. 让创建页里的图片/变体关系可以回流到可持久结构

推荐下一步方向：

### A. 先做“安全写回”

目标：

- 不再让 `preset/template` 的保存覆盖掉工作簿里的图片资源

### B. 再做“图片映射策略”

建议明确：

- 用哪一张 sheet 的哪一列/哪一个单元格区域来代表商品图片
- 一张图片和一个变体选项的关系怎么落库
- 是否需要一份内部元数据 sheet，例如：
  - `app_images`
  - `app_variants`

### C. 最后做“回写 Excel 嵌入图片”

现在只完成了：

- 从 Excel 提取到程序

还没完成：

- 从程序重新嵌回 Excel

## 运行与验证

最近已经反复验证过：

- `cargo check`
- `pnpm exec eslint ...`
- `pnpm build`

如果 Tauri 图片预览有问题，要先确认：

- 是否重启过 `tauri dev`
- `assetProtocol` 是否已生效

## 最关键的一句话交接

这个项目已经能在 Tauri 里把 Excel 嵌入图片提取到本地 `img` 仓库，并在创建页使用、预览、绑定变体；但当前 Excel 保存链路仍然是 SheetJS 整本重写，下一步必须处理“写回时保留图片/媒体/drawing 资源”。
