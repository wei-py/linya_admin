# 项目 Wiki

## 项目简介

这是一个基于 `Vue 3 + Vuetify + Vite + Tauri` 的本地 Excel 订单管理工具。

当前项目主要围绕 4 个页面工作：

- `预设`
- `模板`
- `创建`
- `列表`

核心目标：

- 用 `预设表` 管理国家/平台组合和参数项
- 用 `模板` 管理查表类规则
- 用 `创建` 页面录入或编辑单条订单
- 用 `列表` 页面查看、删除、导入、导出、保存 Excel

## 技术栈

- 前端：`Vue 3`
- UI：`Vuetify`
- 路由：`vue-router`
- 表格/拖拽布局：`grid-layout-plus`、`vue-draggable-plus`
- Excel：`xlsx`、`exceljs`
- 数值运算：`xe-utils`
- 桌面端：`Tauri`

## 页面说明

### 1. 预设页

文件：

- [src/views/PresetView.vue](/Users/wx/Documents/learn/admin/src/views/PresetView.vue)

作用：

- 管理 `国家 + 平台` 组合
- 管理每个组合下的参数项
- 参数项支持：
  - 名称
  - 类型
  - 单位
  - 值 / 规则
- 组合列表支持排序
- 参数项支持排序

当前数据来源：

- 优先读取当前已加载/已绑定 Excel 的 `预设表`
- 如果没有 Excel 数据，则回退到本地缓存或默认种子数据

### 2. 模板页

文件：

- [src/views/TemplateView.vue](/Users/wx/Documents/learn/admin/src/views/TemplateView.vue)

作用：

- 管理规则模板表
- 适合维护查表类规则，例如：
  - 运费表
  - 佣金表
  - 固定附加费表

当前模板能力：

- 通用二维表
- 可编辑横轴、纵轴、阈值和单元格值
- 规则文本里通过 `查表("模板名", ...)` 引用

### 3. 创建页

文件：

- [src/views/CreateView.vue](/Users/wx/Documents/learn/admin/src/views/CreateView.vue)

作用：

- 编辑一条订单
- 根据 `款号` 自动回填已存在订单
- 保存时按 `款号` 做新增或替换

当前字段分组：

- 预设字段
- 计算字段
- 商品字段

能力：

- 国家 x 平台联动预设
- 利润、售价、费率计算
- 查看运算过程
- 图片上传与预览
- 自定义字段管理

### 4. 列表页

文件：

- [src/views/ListView.vue](/Users/wx/Documents/learn/admin/src/views/ListView.vue)

作用：

- 查看订单表
- 删除订单
- Excel 文件入口

当前设计：

- `Tauri` 模式：
  - `打开 Excel`
  - `保存`
  - `另存为`
- 浏览器模式：
  - `导入 Excel`
  - `导出 Excel`

## Excel 设计

当前主要使用这些 sheet：

- `预设表`
- `订单表`
- `图片资源表`

### 预设表

用于保存组合和参数项。

主要字段包括：

- 组合ID
- 组合Key
- 国家
- 平台
- 参数ID
- 参数名称
- 参数类型
- 参数单位
- 参数值

### 订单表

用于保存订单主数据。

当前可见列尽量贴近业务字段，例如：

- 国家
- 平台
- 款号
- 图片
- 成本
- 重量
- 是否包邮
- 折前价格
- 折后售价
- 利润率
- 净利润
- 收入
- 活动费率
- 交易费率
- 佣金费率
- 卖家支付运费
- 固定附加费

隐藏字段仍用于恢复完整编辑状态，例如：

- 预设快照
- 自定义字段

### 图片资源表

当前仍保留兼容读取能力。

但项目正在逐步过渡到“图片落地到 Excel 同级 `img/YYYY-MM-DD/` 目录，Excel 中保存相对路径”的方式。

## 图片规则

当前目标规则：

- 上传后的图片保存到 Excel 同级目录：
  - `img/YYYY-MM-DD/xxx.png`
- Excel 中保存相对路径
- 页面渲染真实图片，不显示 `data:image/...`

当前边界：

- 浏览器模式下，图片和目录能力受限
- `Tauri` 更适合这条链路

## 规则系统

当前规则采用“文本规则 + 模板引用”的方向。

示例：

```txt
查表("巴西x美客多佣金表", {类目}, {广告类型})
```

```txt
查表("巴西x美客多固定附加费表", {折后售价})
```

详细规则写法见：

- [规则使用说明.md](/Users/wx/Documents/learn/admin/docs/规则使用说明.md)

## Tauri 与浏览器模式

### 浏览器模式

优点：

- 开发快
- 可以直接跑前端页面

限制：

- 不能稳定绑定并写回用户原 Excel 文件
- 本地目录和图片文件操作能力受限
- 更适合：
  - 导入 Excel
  - 编辑数据
  - 导出新 Excel

### Tauri 模式

优点：

- 更适合本地文件读写
- 更适合图片目录管理
- 更适合直接保存回原 Excel

当前建议：

- 真正日常使用以 `Tauri` 为主
- 浏览器模式只作为调试或轻量导入导出模式

## 当前已知问题

1. `Tauri` 下 Excel 原文件写回链路仍在持续验证中。
2. 浏览器模式下不能把“导入”误认为“绑定原文件”。
3. 图片在 Excel 中的原生单元格嵌入能力仍有限，当前主要走文件路径方案。
4. 订单表、预设表、模板表之间还有一部分细节需要继续收口。

## 推荐使用流程

### 桌面端推荐流程

1. 在 `列表` 页点击 `打开 Excel`
2. 在 `预设` 页维护组合参数
3. 在 `模板` 页维护查表规则
4. 在 `创建` 页录入或编辑订单
5. 回到 `列表` 页点击 `保存`

### 浏览器端推荐流程

1. 在 `列表` 页点击 `导入 Excel`
2. 编辑数据
3. 在 `列表` 页点击 `导出 Excel`

## 主要文件

- [src/composables/useExcelTables.js](/Users/wx/Documents/learn/admin/src/composables/useExcelTables.js)
- [src/views/PresetView.vue](/Users/wx/Documents/learn/admin/src/views/PresetView.vue)
- [src/views/TemplateView.vue](/Users/wx/Documents/learn/admin/src/views/TemplateView.vue)
- [src/views/CreateView.vue](/Users/wx/Documents/learn/admin/src/views/CreateView.vue)
- [src/views/ListView.vue](/Users/wx/Documents/learn/admin/src/views/ListView.vue)
- [src/utils/localImageFiles.js](/Users/wx/Documents/learn/admin/src/utils/localImageFiles.js)
- [src/utils/autoFitWorksheet.js](/Users/wx/Documents/learn/admin/src/utils/autoFitWorksheet.js)
- [src-tauri/tauri.conf.json](/Users/wx/Documents/learn/admin/src-tauri/tauri.conf.json)

## 后续建议

1. 先把 `Tauri` 模式下 Excel 写回链路彻底验证稳定。
2. 把图片链路完全收口到文件路径模式。
3. 明确哪些元数据必须进隐藏列，哪些应该展开成业务列。
4. 继续减少浏览器模式与桌面模式之间的行为差异。
