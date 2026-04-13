# TemplateView 页面说明

## 页面定位

`TemplateView.vue` 是规则表管理页。

这个页面不负责写死任何平台规则，而是负责维护“规则表数据”。

当前目标是把这类会经常变化的内容从代码里抽出去：

- 运费表
- 固定附加费表
- 佣金表
- 活动费率表

页面文件：

- [src/views/TemplateView.vue](/Users/wx/Documents/learn/linya_admin/src/views/TemplateView.vue)

规则类型定义：

- [src/constants/template.js](/Users/wx/Documents/learn/linya_admin/src/constants/template.js)

## 当前职责

当前模板页主要做 3 件事：

- 管理规则表列表
- 编辑规则表基础信息
- 按规则类型编辑规则行

这版先做页面内存态编辑，不接 Excel 持久化。

也就是说：

- 现在可以切换、编辑、增删规则表和规则行
- 刷新页面后不会保存
- 后续再接 `template_tables` 和 `template_table_rows`

## 为什么要做成规则表

像 Mercado Livre、Shopee 这类平台规则会变。

经常变化的通常不是算法，而是：

- 区间
- 费率
- 固定值
- 适用条件

所以应该做成：

- 代码只负责“怎么查”
- 页面和 Excel 负责“查什么数据”

而不是把这些内容写死在 `if / else` 或常量里。

## 当前支持的规则类型

当前第一版支持 5 种结构：

### 1. 固定值 `fixed`

适合：

- 默认税率
- 默认贴单费用

规则行结构：

- `value`
- `remark`

### 2. 一维区间 `range_1d`

适合：

- 固定附加费按价格分段
- 运费按重量分段

规则行结构：

- `xMin`
- `xMax`
- `value`
- `remark`

### 3. 二维区间 `range_2d`

适合：

- 运费按重量 + 售价分段

这类在页面上不再按普通“规则行列表”显示，而是按矩阵编辑：

- 横向：价格区间
- 纵向：重量区间
- 单元格：命中的结果值

页面结构：

- `columns`
  - 每一列表示一个横向区间上限
- `rows`
  - 每一行表示一个纵向区间上限
- `row.values[column.id]`
  - 当前单元格的结果值

### 4. 枚举匹配 `enum`

适合：

- 广告类型 -> 费率
- 类目 -> 固定值

规则行结构：

- `matchKey`
- `value`
- `remark`

### 5. 枚举 + 区间 `enum_range`

适合：

- 类目 + 售价区间 -> 佣金费率

规则行结构：

- `matchKey`
- `xMin`
- `xMax`
- `value`
- `remark`

## 当前页面结构

页面分成左右两栏。

### 左侧

左侧包含：

- 规则表列表
- 规则类型说明

规则表列表支持：

- 新建规则表
- 切换当前规则表
- 删除规则表

### 右侧

右侧包含：

- 规则表基础信息
- 当前类型说明
- 预设引用示例
- 规则行编辑表格 / 二维矩阵编辑器

基础信息字段目前包括：

- `name`
- `country`
- `platform`
- `ruleType`
- `valueUnit`
- `sourceUrl`
- `remark`

## 当前数据结构

当前页面使用的规则表对象结构：

```js
{
  id: "ml_br_shipping_fee",
  name: "巴西美客多运费补贴表",
  country: "巴西",
  platform: "美客多",
  ruleType: "range_2d",
  valueUnit: "R$",
  sourceUrl: "https://www.mercadolivre.com.br/ajuda/40538",
  remark: "按重量和售价区间命中一行运费值。",
  rows: [],
}
```

不同 `ruleType` 下，`rows` 的字段结构不同。

其中 `range_2d` 当前结构是：

```js
{
  id: "ml_br_shipping_fee",
  name: "巴西美客多运费补贴表",
  ruleType: "range_2d",
  xAxisLabel: "售价",
  yAxisLabel: "重量",
  columns: [
    { id: "col_1", label: "19" },
    { id: "col_2", label: "49" },
  ],
  rows: [
    {
      id: "row_1",
      label: "0.3",
      values: {
        col_1: "5.65",
        col_2: "6.55",
      },
    },
  ],
}
```

这些结构都统一收在：

- [src/constants/template.js](/Users/wx/Documents/learn/linya_admin/src/constants/template.js)

## 预设页如何引用

模板页维护的是“规则表本身”。

预设页后续不直接存规则细节，而是只引用规则表：

```txt
查表("巴西美客多固定附加费表", {折后售价})
```

或者：

```txt
查表("巴西美客多运费补贴表", {重量}, {折后售价})
```

所以边界是：

- 模板页维护规则表内容
- 预设页只引用规则表名称
- 创建页负责把当前订单字段带进去计算

## 当前内置演示数据

为了先把页面形态跑起来，这版内置了几张样板表：

- `巴西美客多固定附加费表`
- `巴西美客多运费补贴表`
- `巴西美客多 79 以下快速免邮表`
- `巴西美客多佣金表`

其中：

- 运费补贴表和 `79` 以下快速免邮表，当前已经按来源链接里的官方区间值补齐
- 固定附加费表，当前已经按来源链接里的官方规则补齐：`79` 以上不收固定费，`12.50` 以下按售价一半收取
- 佣金表的来源页当前只给出费率范围，没有直接给出可录入的类目细表，所以这里先保留空表，后续再手工补录

## 后续建议

下一步建议按这个顺序继续：

1. 给模板页接 Pinia store
2. 再接 Excel 持久化
3. 在预设页把 `规则` 类型改成“选择规则表”
4. 在创建页接真正的 `查表()` 计算逻辑
