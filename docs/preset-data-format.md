# 预设页数据格式

## 目标

预设页不再只处理“国家 + 平台”组合。

当前正式采用：

- 一个组合
- 对应多条参数项
- Excel 使用 2 个 sheet

这样后续扩展参数项、规则、排序都更稳定。

## 页面标准结构

页面内部建议统一使用下面这个结构：

```js
{
  id: "preset_001",
  country: "巴西",
  platform: "美客多",
  country_platform: "巴西_美客多",
  sort: 1,
  items: [
    {
      id: "item_001",
      preset_id: "preset_001",
      name: "活动费率",
      type: "number",
      unit: "%",
      value: "3",
      sort: 1
    },
    {
      id: "item_002",
      preset_id: "preset_001",
      name: "是否包邮",
      type: "boolean",
      unit: "",
      value: "是",
      sort: 2
    },
    {
      id: "item_003",
      preset_id: "preset_001",
      name: "固定附加费",
      type: "rule",
      unit: "RS",
      value: "查表(\"巴西美客多固定附加费表\", {折后售价})",
      sort: 3
    }
  ]
}
```

## 组合字段

组合层字段：

- `id` 组合唯一 ID
- `country` 国家名称
- `platform` 平台名称
- `country_platform` 国家和平台拼接值
- `sort` 组合排序
- `items` 当前组合下的参数项数组

组合规则：

```js
country_platform = `${country}_${platform}`
```

## 参数项字段

参数项层字段：

- `id` 参数项唯一 ID
- `preset_id` 所属组合 ID
- `name` 参数名称
- `type` 参数类型
- `unit` 单位
- `value` 值 / 规则
- `sort` 参数项排序

当前 `type` 建议先固定这几种：

- `number`
- `boolean`
- `text`
- `rule`

## Excel 方案

当前确定使用 2 个 sheet：

1. `preset_groups`
2. `preset_items`

### sheet 1: `preset_groups`

用于保存组合主信息。

列结构：

- `id`
- `country`
- `platform`
- `country_platform`
- `sort`

示例：

| id         | country | platform | country_platform | sort |
| ---------- | ------- | -------- | ---------------- | ---- |
| preset_001 | 巴西    | 美客多   | 巴西\_美客多     | 1    |
| preset_002 | 墨西哥  | 虾皮     | 墨西哥\_虾皮     | 2    |

### sheet 2: `preset_items`

用于保存参数项明细。

列结构：

- `id`
- `preset_id`
- `name`
- `type`
- `unit`
- `value`
- `sort`

示例：

| id       | preset_id  | name       | type    | unit | value                                      | sort |
| -------- | ---------- | ---------- | ------- | ---- | ------------------------------------------ | ---- |
| item_001 | preset_001 | 活动费率   | number  | %    | 3                                          | 1    |
| item_002 | preset_001 | 是否包邮   | boolean |      | 是                                         | 2    |
| item_003 | preset_001 | 固定附加费 | rule    | RS   | 查表("巴西美客多固定附加费表", {折后售价}) | 3    |

## 导入规则

导入 Excel 时按下面规则处理：

1. 读取 `preset_groups`
2. 读取 `preset_items`
3. 先把组合表转成组合对象
4. 再按 `preset_id` 把参数项挂到对应组合下
5. 自动清理字符串前后空格
6. `country_platform` 统一重新生成
7. 参数项按 `sort` 排序
8. 组合按 `sort` 排序

## 导出规则

导出 Excel 时按下面规则处理：

1. 页面数据先标准化
2. 组合层写入 `preset_groups`
3. 参数项层写入 `preset_items`
4. `country_platform` 统一重新生成
5. 固定列顺序输出

## 为什么用 2 个 sheet

原因：

- 一个组合下会有多条参数项
- 不想在每一行参数项里重复国家、平台
- 后续扩展字段更容易
- Excel 和页面结构更接近

## 当前边界

当前只是把数据格式定下来。

后续代码需要逐步迁移到这套结构：

- 预设页左侧操作组合
- 右侧维护参数项
- Excel helper 改成读写 `preset_groups` 和 `preset_items`

## 当前实现对应

当前代码还没完全迁到 2 个 sheet。

目前相关文件仍然是第一阶段实现：

- [src/views/PresetView.vue](/Users/wx/Documents/learn/linya_admin/src/views/PresetView.vue)
- [src/utils/preset/excel.js](/Users/wx/Documents/learn/linya_admin/src/utils/preset/excel.js)

下一步要做的是把 `excel.js` 从单一 `country_platform` sheet改成：

- `preset_groups`
- `preset_items`
