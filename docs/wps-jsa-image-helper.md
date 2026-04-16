# WPS 宏使用说明

文件：

- [wps-jsa-image-helper.js](/Users/wx/Documents/learn/linya_admin/docs/wps-jsa-image-helper.js:1)
- [wps-jsa-image-helper-strict.js](/Users/wx/Documents/learn/linya_admin/docs/wps-jsa-image-helper-strict.js:1)

## 作用

这份 `JSA` 宏用于：

- 读取当前工作表中的 `图片路径` 列
- 按行把图片插入到 `图片` 列
- 自动清理该列旧图片
- 自动把图片缩放到单元格区域内

当前它做的是：

- 批量按路径插图
- 与单元格对齐

当前它还不做：

- 直接构造 `DISPIMG("ID_xxx", 1)` 的内部资源结构

## 两个版本

### 1. 通用版

文件：

- [wps-jsa-image-helper.js](/Users/wx/Documents/learn/linya_admin/docs/wps-jsa-image-helper.js:1)

特点：

- 对当前激活工作表生效
- 适合调试
- 灵活，但更容易误操作

### 2. 严格版

文件：

- [wps-jsa-image-helper-strict.js](/Users/wx/Documents/learn/linya_admin/docs/wps-jsa-image-helper-strict.js:1)

特点：

- 只处理 `商品列表`
- 固定读取：
  - `图片`
  - `图片路径`
- 更适合正式使用

## 适用前提

当前工作表需要有这些表头：

- `图片`
- `图片路径`

推荐直接对程序导出的 `商品列表` 主表使用。

## 路径规则

宏支持两种路径：

### 1. 相对路径

例如：

```txt
img/product_001_1_cover.jpg
```

宏会自动按当前工作簿所在目录去拼接。

### 2. 绝对路径

例如：

```txt
/Users/xxx/Desktop/demo/img/a.jpg
```

或：

```txt
C:\demo\img\a.jpg
```

宏会直接使用。

## 运行方式

1. 用 `WPS` 打开程序导出的列表工作簿
2. 如果使用通用版，先确认当前激活的是主表
3. 如果使用严格版，不要求先切表，但工作簿里必须存在 `商品列表`
3. 打开 `WPS 宏编辑器`
4. 新建一个 `JSA` 宏
5. 把对应脚本内容粘进去
6. 运行宏

## 运行效果

宏执行后会：

1. 读取首行表头
2. 找到 `图片` 列和 `图片路径` 列
3. 删除 `图片` 列中已有图片对象
4. 从第 2 行开始逐行读取 `图片路径`
5. 把图片插入对应行的 `图片` 单元格区域

## 注意事项

### 1. 工作表要正确

通用版默认对“当前激活工作表”运行。

所以建议：

- 先切到 `商品列表`
- 再运行宏

严格版会直接按 `商品列表` 名称查找。

### 2. 图片路径必须有效

如果路径为空或文件不存在，该行会跳过。

### 3. 这一步仍然是中间阶段

它的意义是：

- 先把程序导出的图片资源和主表正确对接

后续如果确认到稳定的 WPS 接口，再继续升级成更接近 `DISPIMG` 的版本。

## 建议工作流

1. 在程序中保存列表 Excel
2. 确认 Excel 同级有 `img/`
3. 用 WPS 打开工作簿
4. 在主表运行 `wps-jsa-image-helper.js`
5. 检查 `图片` 列显示

## 一句话

这份宏是 `WPS-DISPIMG` 路线里的第一步自动化工具，用来把程序准备好的图片路径批量变成工作表里的图片显示。
