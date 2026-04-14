# 列表页第二 Excel 设计方案

## 背景

当前项目已经有一份主 Excel，主要承载这些内容：

- `预设`
- `模板`
- `选项`

这份主 Excel 更像“规则配置库”。

你现在要加的是另一条链路：

- `创建` 页面录入商品
- 点击“添加”后写入 `列表页`
- `列表页` 再绑定另一份 Excel
- 这份 Excel 更像“商品库 / 结果库 / 出单库”

这两份 Excel 不应该继续混在一起。

原因很直接：

- 主 Excel 是规则驱动型数据，结构稳定，修改频繁
- 列表 Excel 是商品记录型数据，行数会越来越多
- 列表 Excel 后续要处理图片嵌入、导入导出、去重、编辑、删除
- 如果还共用一份工作簿，后面非常容易把规则表和商品表互相污染

所以推荐结论先写在前面：

## 推荐结论

推荐使用 `双 Excel` 模式：

1. `规则 Excel`
   - 给 `预设 / 模板 / 选项 / 创建计算` 使用
   - 继续作为当前主绑定文件

2. `列表 Excel`
   - 专门给 `列表页` 使用
   - `创建页` 的“添加”按钮只负责把一条商品数据写入这份列表 Excel

不要让 `创建页` 直接写回规则 Excel。

## 整体逻辑

建议把系统分成两个上下文：

### 1. 规则上下文

负责：

- 当前预设组合
- 参数默认值
- 模板规则
- 选项配置
- 创建页的计算过程

数据来源：

- 当前已经绑定的主 Excel

### 2. 商品上下文

负责：

- 商品主记录
- 图片
- 变体
- 额外字段
- 创建页“添加到列表”
- 列表页查看 / 编辑 / 删除 / 导出

数据来源：

- 单独绑定的列表 Excel

这两个上下文的关系是：

- `规则上下文` 负责“算”
- `商品上下文` 负责“存”

## 为什么列表页必须单独绑定 Excel

因为你后面要做的并不是一个简单“导出结果”。

你要的是：

- 在创建页录入
- 写入列表
- 列表继续编辑
- 图片仍然跟着商品走
- 变体和图片关系仍然存在
- 最后还能同步回 Excel

这已经是一个独立的数据存储系统了。

如果还放在主 Excel 里，会出现这些问题：

- 规则文件会越来越大
- 商品数据和规则数据耦合
- 图片写入后工作簿更重
- 保存时更容易误伤 `drawing / media / rels`
- 任何列表页批量操作都可能影响规则表

## 列表 Excel 推荐职责

列表 Excel 只做这些事：

- 保存商品主记录
- 保存图片元数据
- 保存变体数据
- 保存额外字段
- 保存程序内部追踪字段

不要在列表 Excel 里再维护规则逻辑。

规则还是以主 Excel 为准。

## 创建页“添加到列表”的推荐行为

创建页新增一个按钮：

- `添加到列表`

点击后行为建议是：

1. 读取当前创建页表单
2. 生成一份完整商品快照
3. 写入列表 store
4. 若已绑定列表 Excel，则同步写入列表 Excel
5. 若未绑定列表 Excel，则先写入本地列表缓存，等用户绑定后再导出或同步

这里建议不要做成“每次输入都自动写 Excel”。

更合理的是：

- 创建页输入时只在本地草稿缓存
- 点击 `添加到列表` 才生成正式商品记录

这样语义清楚：

- 草稿是草稿
- 商品记录是商品记录

## 商品记录的数据模型

建议在程序内部定义一个标准商品结构，例如：

```ts
type ProductRecord = {
  id: string
  sku: string
  presetId: string
  presetName: string
  country: string
  platform: string
  category: string
  adType: string
  shippingIncluded: string
  cost: string
  weight: string
  listPrice: string
  discountPrice: string
  revenue: string
  profitRate: string
  netProfit: string
  sellerShipping: string
  fixedSurcharge: string
  notes: string
  status: string
  createdAt: string
  updatedAt: string
  presetSnapshotJson: string
  calculationSnapshotJson: string
}
```

然后把图片、变体、附加字段拆出去，不要全堆一行。

## 列表 Excel 推荐 sheet 设计

推荐至少 5 个 sheet。

原则是：

- 用户主要使用 `商品列表`
- 其它 sheet 不隐藏
- 但命名要直观，避免用户看不懂
- 程序恢复完整关系时，优先依赖这些辅助 sheet

### 1. `商品列表`

主表，一行一个商品，给用户直接看和用。

建议字段：

- `id`
- `定位`
- `名称`
- `sku`
- `全球货号`
- `图片`
- `变体`
- `country`
- `platform`
- `category`
- `ad_type`
- `shipping_included`
- `cost`
- `weight`
- `list_price`
- `discount_price`
- `revenue`
- `profit_rate`
- `net_profit`
- `seller_shipping`
- `fixed_surcharge`
- `notes`
- `status`
- `created_at`
- `updated_at`
- `cover_image_id`
- `variant_summary`
- `preset_snapshot_json`
- `calculation_snapshot_json`

说明：

- `图片` 列嵌入封面图
- `cover_image_id` 用来回指主图
- `variant_summary` 只做列表展示
- 真正完整结构不要只靠这一行
- `preset_snapshot_json` 和 `calculation_snapshot_json` 用来保证回显稳定
- 如果给用户看太杂，可以把 `id / cover_image_id / ...json` 这些列放后面，甚至做窄列

### 2. `图片关系`

一张图一行。

建议字段：

- `id`
- `product_id`
- `sort`
- `role`
- `source_type`
- `file_name`
- `file_path`
- `relative_path`
- `variant_group_id`
- `variant_option_id`
- `excel_image_cell`
- `remark`

说明：

- `source_type` 可取：
  - `local`
  - `excel`
  - `embedded`
- `file_path` / `relative_path` 用于程序内部定位原图
- `excel_image_cell` 用来记录这张图最终嵌到了哪个单元格

### 3. `变体关系`

建议字段：

- `id`
- `product_id`
- `group_id`
- `group_name`
- `option_id`
- `option_value`
- `sort`

说明：

- 一个变体组选项会拆成多行
- 例如：
  - 尺码 / S
  - 尺码 / M
  - 尺码 / L

### 4. `扩展字段`

给“更多信息 / 扩展字段”用。

建议字段：

- `id`
- `product_id`
- `field_key`
- `field_label`
- `field_value`
- `sort`

这样后续就不会因为加字段又改主表结构。

### 5. `程序信息`

这一张给程序和用户都能看懂的说明用途。

建议字段：

- `app_version`
- `exported_at`
- `list_workbook_version`
- `main_sheet_name`
- `description`

建议写一些简单说明，例如：

- `商品列表` 主要给用户查看和筛选
- `图片关系 / 变体关系 / 扩展字段` 由程序维护
- 如果需要修改图片或变体，优先回程序中编辑

## 为什么图片不要只保存在单元格里

这是这件事里最关键的一点。

推荐把图片分成两层：

### 1. 业务层

程序永远先保存：

- 图片文件本身
- 图片和商品的关系
- 图片和变体的关系

也就是以 `product_images` 为准。

### 2. 展示层

再把其中部分图片嵌入 Excel 单元格，作为给人看的结果。

也就是说：

- “嵌入单元格图片”是展示结果
- “图片关系 sheet” 才是程序真实数据源

不能反过来。

因为单靠嵌入图片，程序不好稳定恢复这些信息：

- 这张图属于哪个商品
- 这张图是主图还是附图
- 它关联哪个变体组
- 它关联哪个变体选项
- 这张图原始文件名是什么
- 如果以后重新排序，图片应当怎么处理

所以一定要：

- 先有关系 sheet
- 再有 Excel 单元格嵌图

## 图片推荐如何落地

推荐使用“文件落地 + Excel 嵌图”的双轨方案。

### 文件层

图片先保存到程序本地图片库，继续沿用当前能力：

- `$APPLOCALDATA/img/...`

如果后续需要更强可迁移性，可以再加一个复制动作：

- 当列表 Excel 已绑定时
- 同时把图片复制到列表 Excel 同级目录
- 例如：
  - `商品库.xlsx`
  - `img/2026-04-14/xxx.png`

这样列表 Excel 和图片资源可以一起移动。

### Excel 展示层

在导出或同步列表 Excel 时：

- 给 `商品列表` sheet 预留图片列
- 例如 `cover_image`
- 由程序把主图嵌入对应行单元格

如果需要多图，不建议在主表一行塞很多嵌图。

更合理的是：

- 主表只放一张封面图
- 其它图放在 `图片关系` sheet
- 或者额外做一个 `product_gallery` 展示 sheet

## 图片与变体关联如何处理

这一块必须先定清楚，不然以后会越来越乱。

建议规则：

### 1. 一张图片最多关联一个变体组选项

当前你已有：

- `variationGroupId`
- `variationOptionId`

这就够了。

例如：

- 图片 A -> 颜色 / 红色
- 图片 B -> 颜色 / 蓝色

### 2. 如果图片没有绑定变体

视为：

- 商品公共图

### 3. 列表 Excel 里的落库方式

写入 `图片关系`：

- `variant_group_id`
- `variant_option_id`

恢复编辑时：

- 从 `变体关系` 恢复完整变体结构
- 从 `图片关系` 恢复每张图和对应选项的关系

### 4. Excel 单元格嵌图只承担封面图

如果真的要把“颜色图”也嵌到 Excel 里，后面可以额外做：

- `variant_gallery` sheet

但第一版不建议做太重。

## 列表 Excel 如何同步

这里建议分成两种保存方式。

### 1. 程序内实时数据

列表页先维护自己的 Pinia store：

- 当前商品列表
- 当前列表 Excel 文件路径
- 是否有未保存更改

### 2. 文件保存

操作按钮建议是：

- `绑定列表 Excel`
- `保存到列表 Excel`
- `另存为列表 Excel`

创建页点击 `添加到列表` 后：

- 先写入列表 store
- 如果已经绑定列表 Excel，可以直接尝试同步写入
- 或者先标记 `dirty`，由用户手动保存

我更推荐第二种：

- 添加到列表 -> 进 store
- 列表页右上角统一 `保存`

因为图片、变体、批量编辑都属于多步骤操作，手动保存更稳。

## Excel 写入方式的关键建议

这件事不能继续只靠现在的 `xlsx` 整本重写。

原因：

- 你后面不仅要读嵌图
- 还要写嵌图
- `SheetJS xlsx` 对图片嵌入和 drawing 保留并不适合当前场景

所以列表 Excel 推荐单独走一条链路。

## 推荐实现方式

### 方案 A：列表 Excel 单独使用 `exceljs`

适合度最高。

建议：

- 主 Excel 继续保持当前读写方式
- 列表 Excel 单独引入 `exceljs`
- 只给列表页做：
  - 读主表
  - 写主表
  - 写图片
  - 调整行高列宽

理由：

- `exceljs` 更适合做单元格图片嵌入
- 列表 Excel 和规则 Excel 分离后，技术债不会互相传染

### 方案 B：列表 Excel 的图片写入下沉到 Tauri Rust

适合后期强化版。

适合做：

- 更稳定地保留 zip 结构
- 更强的二进制控制
- 未来处理更复杂的 drawing 关系

但第一版不建议直接上。

因为开发成本更高。

## 推荐第一版实现边界

为了先跑通，第一版建议只做这些：

### 第一阶段

- 列表页可以绑定第二个 Excel
- 创建页可以“添加到列表”
- 列表页可以展示商品
- 列表页可以保存到第二个 Excel
- 列表 Excel 主表只嵌入一张封面图
- 完整图片关系写入 `图片关系`
- 变体关系写入 `变体关系`

### 暂时不做

- 一个商品多张图全部嵌入主表
- 在原 Excel 图片位置上精准回写
- 从嵌图反向恢复全部业务关系
- 复杂的 Excel 批量排版

这样复杂度会降很多。

## 创建页到列表页的推荐数据流

建议链路如下：

1. 用户在创建页选择预设并填写商品
2. 点击 `添加到列表`
3. 前端生成 `ProductRecord`
4. 同时生成：
   - `图片关系` rows
   - `变体关系` rows
   - `扩展字段` rows
5. 写入 `listStore`
6. 列表页立即可见
7. 用户在列表页点击 `保存`
8. 程序统一写入列表 Excel
9. 写 Excel 时再嵌入封面图

## 关于“联动 Excel 的嵌入单元格图片”

你前面说的是：

- Excel 里不是链接图
- 是嵌入单元格的图片
- 希望同步到程序
- 以后程序里的图片也能回到 Excel

这个我理解成两段：

### A. Excel -> 程序

这个现在已经部分具备：

- 能提取主 Excel 中嵌入图片
- 能保存到程序图片库
- 能给创建页用

### B. 程序 -> 列表 Excel

这里建议不要追求“回原位”。

更合理的是：

- 程序把图片写入列表 Excel 约定好的图片列
- 每个商品一行一个封面图
- 真正的完整关系还是写到辅助 sheet

也就是说：

- 主 Excel 的嵌图主要用于“取图”
- 列表 Excel 的嵌图主要用于“展示结果”

这两个用途可以不同，不必强绑成一个逻辑。

## 需要新增的 store / 模块

建议新增：

### 1. `src/stores/list.js`

负责：

- 列表 Excel 路径
- 商品列表
- 图片列表
- 变体列表
- 扩展字段列表
- dirty 状态

### 2. `src/utils/list/excel.js`

负责：

- 列表 Excel 的 sheet 读写
- 内部数据结构和 sheet 行结构转换

### 3. `src/utils/list/record.js`

负责：

- 从创建页表单生成 `ProductRecord`
- 生成 `图片关系`
- 生成 `变体关系`
- 生成 `扩展字段`

### 4. `src/utils/tauri/image-asset.js`

后续可能补：

- 复制图片到列表 Excel 同级目录
- 生成相对路径

## UI 建议

### 创建页

新增按钮：

- `添加到列表`
- `重置页面`

其中：

- `添加到列表` 是生成正式记录
- `重置页面` 是清空当前草稿

### 列表页

建议右上角操作：

- `绑定列表 Excel`
- `保存`
- `另存为`

建议列表列：

- 主图
- 款号
- 国家
- 平台
- 类目
- 广告类型
- 是否包邮
- 折前价
- 折后价
- 利润率
- 净利润
- 更新时间
- 操作

## 给用户的使用感受

用户最终看到的应该是：

- 一份正常的商品 Excel
- 主表就是 `商品列表`
- 图片直接显示在主表里
- 其它几个 sheet 只是辅助说明和关系表

不需要默认隐藏。

但建议在 `程序信息` sheet 里明确写一句：

- `商品列表` 可以查看、筛选、少量修改
- `图片关系 / 变体关系 / 扩展字段` 不建议手工维护
- 如果要改图片和变体，优先回程序中操作

## 最后的建议

如果目标是“真正能长期用”，我建议你把这件事严格分成两层：

1. `规则系统`
   - 预设 / 模板 / 选项 / 创建计算

2. `商品系统`
   - 创建产物 / 列表 / 图片 / 变体 / 导出 Excel

然后只在创建页做一次连接：

- 用规则系统算出结果
- 点击按钮，把结果写入商品系统

这是目前最稳、最不容易把项目拖乱的方案。

## 一句话结论

最合理的方案是：

- 继续保留当前主 Excel 作为规则库
- 新增第二个列表 Excel 作为商品库
- 创建页点击“添加到列表”时，只生成商品记录写入列表 store
- 列表页统一负责保存到第二个 Excel
- 图片真实关系保存在 `图片关系` 这类辅助 sheet
- Excel 单元格嵌图只作为展示层，不作为唯一数据源
