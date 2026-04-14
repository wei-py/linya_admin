function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function createTemplateMatrixColumn() {
  return {
    id: createId("col"),
    label: "",
  }
}

export function createTemplateMatrixRow(columns = []) {
  return {
    id: createId("row"),
    label: "",
    values: Object.fromEntries(columns.map(column => [column.id, ""])),
  }
}

export const templateRuleTypeOptions = [
  {
    title: "固定值",
    value: "fixed",
    subtitle: "无条件，直接返回一个结果值。",
  },
  {
    title: "一维区间",
    value: "range_1d",
    subtitle: "按一个数值区间查结果。",
  },
  {
    title: "二维区间",
    value: "range_2d",
    subtitle: "按两个数值区间联合查结果。",
  },
  {
    title: "枚举匹配",
    value: "enum",
    subtitle: "按类目、渠道这类离散值查结果。",
  },
  {
    title: "枚举 + 区间",
    value: "enum_range",
    subtitle: "先按枚举分组，再按区间命中结果。",
  },
  {
    title: "双枚举",
    value: "enum_pair",
    subtitle: "按两个离散值联合查结果。",
  },
]

export const templateRuleTypeMetaMap = {
  fixed: {
    title: "固定值",
    description: "适合默认费率、固定税率这类单值规则。",
    lookupArgs: "{任意输入}",
    columns: [
      { key: "value", label: "结果值", type: "number" },
      { key: "remark", label: "备注", type: "text" },
    ],
  },
  range_1d: {
    title: "一维区间",
    description: "适合按价格区间、重量区间查一列结果。",
    lookupArgs: "{折后售价}",
    columns: [
      { key: "xMin", label: "起始值", type: "number" },
      { key: "xMax", label: "结束值", type: "number" },
      { key: "value", label: "结果值", type: "number" },
      { key: "remark", label: "备注", type: "text" },
    ],
  },
  range_2d: {
    title: "二维区间",
    description: "适合按价格 + 重量这类双维度联合查表。",
    lookupArgs: "{重量}, {折后售价}",
    columns: [
      { key: "xMin", label: "X起始", type: "number" },
      { key: "xMax", label: "X结束", type: "number" },
      { key: "yMin", label: "Y起始", type: "number" },
      { key: "yMax", label: "Y结束", type: "number" },
      { key: "value", label: "结果值", type: "number" },
      { key: "remark", label: "备注", type: "text" },
    ],
  },
  enum: {
    title: "枚举匹配",
    description: "适合类目、广告类型、物流方式这类离散值。",
    lookupArgs: "{类目}",
    columns: [
      { key: "matchKey", label: "匹配值", type: "text" },
      { key: "value", label: "结果值", type: "number" },
      { key: "remark", label: "备注", type: "text" },
    ],
  },
  enum_range: {
    title: "枚举 + 区间",
    description: "适合类目 + 价格区间、刊登类型 + 价格区间。",
    lookupArgs: "{类目}, {折后售价}",
    columns: [
      { key: "matchKey", label: "匹配值", type: "text" },
      { key: "xMin", label: "起始值", type: "number" },
      { key: "xMax", label: "结束值", type: "number" },
      { key: "value", label: "结果值", type: "number" },
      { key: "remark", label: "备注", type: "text" },
    ],
  },
  enum_pair: {
    title: "双枚举",
    description: "适合类目 + 广告类型、国家 + 平台这类双离散值查表。",
    lookupArgs: "{类目}, {广告类型}",
    columns: [
      { key: "matchKey", label: "参数 1", type: "text" },
      { key: "matchKey2", label: "参数 2", type: "text" },
      { key: "value", label: "结果值", type: "number" },
      { key: "remark", label: "备注", type: "text" },
    ],
  },
}

export function createTemplateRow(ruleType = "fixed") {
  const id = createId("row")

  if (ruleType === "fixed") {
    return { id, value: "", remark: "" }
  }

  if (ruleType === "range_1d") {
    return { id, xMin: "", xMax: "", value: "", remark: "" }
  }

  if (ruleType === "enum") {
    return { id, matchKey: "", value: "", remark: "" }
  }

  if (ruleType === "enum_pair") {
    return { id, matchKey: "", matchKey2: "", value: "", remark: "" }
  }

  return { id, matchKey: "", xMin: "", xMax: "", value: "", remark: "" }
}

export function createTemplateTable(ruleType = "fixed") {
  if (ruleType === "range_2d") {
    const columns = [
      createTemplateMatrixColumn(),
      createTemplateMatrixColumn(),
    ]

    return {
      id: createId("table"),
      name: "",
      country: "",
      platform: "",
      ruleType,
      valueUnit: "",
      sourceUrl: "",
      remark: "",
      xAxisLabel: "售价",
      yAxisLabel: "重量",
      columns,
      rows: [
        createTemplateMatrixRow(columns),
        createTemplateMatrixRow(columns),
      ],
    }
  }

  return {
    id: createId("table"),
    name: "",
    country: "",
    platform: "",
    ruleType,
    valueUnit: "",
    sourceUrl: "",
    remark: "",
    rows: [createTemplateRow(ruleType)],
  }
}

const mlBrShippingColumns = [
  { id: "ml_br_shipping_fee_col_19", label: "19" },
  { id: "ml_br_shipping_fee_col_49", label: "49" },
  { id: "ml_br_shipping_fee_col_79", label: "79" },
  { id: "ml_br_shipping_fee_col_100", label: "100" },
  { id: "ml_br_shipping_fee_col_120", label: "120" },
  { id: "ml_br_shipping_fee_col_150", label: "150" },
  { id: "ml_br_shipping_fee_col_200", label: "200" },
  { id: "ml_br_shipping_fee_col_last", label: "最后区间及以上" },
]

const mlBrShippingRows = [
  {
    id: "ml_br_shipping_fee_1",
    label: "0.3",
    values: {
      ml_br_shipping_fee_col_19: "5.65",
      ml_br_shipping_fee_col_49: "6.55",
      ml_br_shipping_fee_col_79: "7.75",
      ml_br_shipping_fee_col_100: "12.35",
      ml_br_shipping_fee_col_120: "14.35",
      ml_br_shipping_fee_col_150: "16.45",
      ml_br_shipping_fee_col_200: "18.45",
      ml_br_shipping_fee_col_last: "20.95",
    },
  },
  {
    id: "ml_br_shipping_fee_2",
    label: "0.5",
    values: {
      ml_br_shipping_fee_col_19: "5.95",
      ml_br_shipping_fee_col_49: "6.65",
      ml_br_shipping_fee_col_79: "7.85",
      ml_br_shipping_fee_col_100: "13.25",
      ml_br_shipping_fee_col_120: "15.45",
      ml_br_shipping_fee_col_150: "17.65",
      ml_br_shipping_fee_col_200: "19.85",
      ml_br_shipping_fee_col_last: "22.55",
    },
  },
  {
    id: "ml_br_shipping_fee_3",
    label: "1",
    values: {
      ml_br_shipping_fee_col_19: "6.05",
      ml_br_shipping_fee_col_49: "6.75",
      ml_br_shipping_fee_col_79: "7.95",
      ml_br_shipping_fee_col_100: "13.85",
      ml_br_shipping_fee_col_120: "16.15",
      ml_br_shipping_fee_col_150: "18.45",
      ml_br_shipping_fee_col_200: "20.75",
      ml_br_shipping_fee_col_last: "23.65",
    },
  },
  {
    id: "ml_br_shipping_fee_4",
    label: "1.5",
    values: {
      ml_br_shipping_fee_col_19: "6.15",
      ml_br_shipping_fee_col_49: "6.85",
      ml_br_shipping_fee_col_79: "8.05",
      ml_br_shipping_fee_col_100: "14.15",
      ml_br_shipping_fee_col_120: "16.45",
      ml_br_shipping_fee_col_150: "18.85",
      ml_br_shipping_fee_col_200: "21.15",
      ml_br_shipping_fee_col_last: "24.65",
    },
  },
  {
    id: "ml_br_shipping_fee_5",
    label: "2",
    values: {
      ml_br_shipping_fee_col_19: "6.25",
      ml_br_shipping_fee_col_49: "6.95",
      ml_br_shipping_fee_col_79: "8.15",
      ml_br_shipping_fee_col_100: "14.45",
      ml_br_shipping_fee_col_120: "16.85",
      ml_br_shipping_fee_col_150: "19.25",
      ml_br_shipping_fee_col_200: "21.65",
      ml_br_shipping_fee_col_last: "24.65",
    },
  },
  {
    id: "ml_br_shipping_fee_6",
    label: "3",
    values: {
      ml_br_shipping_fee_col_19: "6.35",
      ml_br_shipping_fee_col_49: "7.95",
      ml_br_shipping_fee_col_79: "8.55",
      ml_br_shipping_fee_col_100: "15.75",
      ml_br_shipping_fee_col_120: "18.35",
      ml_br_shipping_fee_col_150: "21.05",
      ml_br_shipping_fee_col_200: "23.65",
      ml_br_shipping_fee_col_last: "26.25",
    },
  },
  {
    id: "ml_br_shipping_fee_7",
    label: "4",
    values: {
      ml_br_shipping_fee_col_19: "6.45",
      ml_br_shipping_fee_col_49: "8.15",
      ml_br_shipping_fee_col_79: "8.95",
      ml_br_shipping_fee_col_100: "17.05",
      ml_br_shipping_fee_col_120: "19.85",
      ml_br_shipping_fee_col_150: "22.65",
      ml_br_shipping_fee_col_200: "25.55",
      ml_br_shipping_fee_col_last: "28.35",
    },
  },
  {
    id: "ml_br_shipping_fee_8",
    label: "5",
    values: {
      ml_br_shipping_fee_col_19: "6.55",
      ml_br_shipping_fee_col_49: "8.35",
      ml_br_shipping_fee_col_79: "9.75",
      ml_br_shipping_fee_col_100: "18.45",
      ml_br_shipping_fee_col_120: "21.55",
      ml_br_shipping_fee_col_150: "24.65",
      ml_br_shipping_fee_col_200: "27.75",
      ml_br_shipping_fee_col_last: "30.75",
    },
  },
  {
    id: "ml_br_shipping_fee_9",
    label: "6",
    values: {
      ml_br_shipping_fee_col_19: "6.65",
      ml_br_shipping_fee_col_49: "8.55",
      ml_br_shipping_fee_col_79: "9.95",
      ml_br_shipping_fee_col_100: "25.45",
      ml_br_shipping_fee_col_120: "28.55",
      ml_br_shipping_fee_col_150: "32.65",
      ml_br_shipping_fee_col_200: "35.75",
      ml_br_shipping_fee_col_last: "39.75",
    },
  },
  {
    id: "ml_br_shipping_fee_10",
    label: "7",
    values: {
      ml_br_shipping_fee_col_19: "6.75",
      ml_br_shipping_fee_col_49: "8.75",
      ml_br_shipping_fee_col_79: "10.15",
      ml_br_shipping_fee_col_100: "27.05",
      ml_br_shipping_fee_col_120: "31.05",
      ml_br_shipping_fee_col_150: "36.05",
      ml_br_shipping_fee_col_200: "40.05",
      ml_br_shipping_fee_col_last: "44.05",
    },
  },
  {
    id: "ml_br_shipping_fee_11",
    label: "8",
    values: {
      ml_br_shipping_fee_col_19: "6.85",
      ml_br_shipping_fee_col_49: "8.95",
      ml_br_shipping_fee_col_79: "10.35",
      ml_br_shipping_fee_col_100: "28.85",
      ml_br_shipping_fee_col_120: "33.65",
      ml_br_shipping_fee_col_150: "38.45",
      ml_br_shipping_fee_col_200: "43.25",
      ml_br_shipping_fee_col_last: "48.05",
    },
  },
  {
    id: "ml_br_shipping_fee_12",
    label: "9",
    values: {
      ml_br_shipping_fee_col_19: "6.95",
      ml_br_shipping_fee_col_49: "9.15",
      ml_br_shipping_fee_col_79: "10.55",
      ml_br_shipping_fee_col_100: "29.65",
      ml_br_shipping_fee_col_120: "34.55",
      ml_br_shipping_fee_col_150: "39.55",
      ml_br_shipping_fee_col_200: "44.45",
      ml_br_shipping_fee_col_last: "49.35",
    },
  },
  {
    id: "ml_br_shipping_fee_13",
    label: "11",
    values: {
      ml_br_shipping_fee_col_19: "7.05",
      ml_br_shipping_fee_col_49: "9.55",
      ml_br_shipping_fee_col_79: "10.95",
      ml_br_shipping_fee_col_100: "41.25",
      ml_br_shipping_fee_col_120: "48.05",
      ml_br_shipping_fee_col_150: "54.95",
      ml_br_shipping_fee_col_200: "61.75",
      ml_br_shipping_fee_col_last: "68.65",
    },
  },
  {
    id: "ml_br_shipping_fee_14",
    label: "13",
    values: {
      ml_br_shipping_fee_col_19: "7.15",
      ml_br_shipping_fee_col_49: "9.95",
      ml_br_shipping_fee_col_79: "11.35",
      ml_br_shipping_fee_col_100: "42.15",
      ml_br_shipping_fee_col_120: "49.25",
      ml_br_shipping_fee_col_150: "56.25",
      ml_br_shipping_fee_col_200: "63.25",
      ml_br_shipping_fee_col_last: "70.25",
    },
  },
  {
    id: "ml_br_shipping_fee_15",
    label: "15",
    values: {
      ml_br_shipping_fee_col_19: "7.25",
      ml_br_shipping_fee_col_49: "10.15",
      ml_br_shipping_fee_col_79: "11.55",
      ml_br_shipping_fee_col_100: "45.05",
      ml_br_shipping_fee_col_120: "52.45",
      ml_br_shipping_fee_col_150: "59.95",
      ml_br_shipping_fee_col_200: "67.45",
      ml_br_shipping_fee_col_last: "74.95",
    },
  },
  {
    id: "ml_br_shipping_fee_16",
    label: "17",
    values: {
      ml_br_shipping_fee_col_19: "7.35",
      ml_br_shipping_fee_col_49: "10.35",
      ml_br_shipping_fee_col_79: "11.75",
      ml_br_shipping_fee_col_100: "48.55",
      ml_br_shipping_fee_col_120: "56.05",
      ml_br_shipping_fee_col_150: "63.55",
      ml_br_shipping_fee_col_200: "70.75",
      ml_br_shipping_fee_col_last: "78.65",
    },
  },
  {
    id: "ml_br_shipping_fee_17",
    label: "20",
    values: {
      ml_br_shipping_fee_col_19: "7.45",
      ml_br_shipping_fee_col_49: "10.55",
      ml_br_shipping_fee_col_79: "11.95",
      ml_br_shipping_fee_col_100: "54.75",
      ml_br_shipping_fee_col_120: "63.85",
      ml_br_shipping_fee_col_150: "72.95",
      ml_br_shipping_fee_col_200: "82.05",
      ml_br_shipping_fee_col_last: "91.15",
    },
  },
  {
    id: "ml_br_shipping_fee_18",
    label: "25",
    values: {
      ml_br_shipping_fee_col_19: "7.65",
      ml_br_shipping_fee_col_49: "10.95",
      ml_br_shipping_fee_col_79: "12.15",
      ml_br_shipping_fee_col_100: "64.05",
      ml_br_shipping_fee_col_120: "75.05",
      ml_br_shipping_fee_col_150: "84.75",
      ml_br_shipping_fee_col_200: "95.35",
      ml_br_shipping_fee_col_last: "105.95",
    },
  },
  {
    id: "ml_br_shipping_fee_19",
    label: "30",
    values: {
      ml_br_shipping_fee_col_19: "7.75",
      ml_br_shipping_fee_col_49: "11.15",
      ml_br_shipping_fee_col_79: "12.35",
      ml_br_shipping_fee_col_100: "65.95",
      ml_br_shipping_fee_col_120: "75.45",
      ml_br_shipping_fee_col_150: "85.55",
      ml_br_shipping_fee_col_200: "96.25",
      ml_br_shipping_fee_col_last: "106.95",
    },
  },
  {
    id: "ml_br_shipping_fee_20",
    label: "40",
    values: {
      ml_br_shipping_fee_col_19: "7.85",
      ml_br_shipping_fee_col_49: "11.35",
      ml_br_shipping_fee_col_79: "12.55",
      ml_br_shipping_fee_col_100: "67.75",
      ml_br_shipping_fee_col_120: "78.95",
      ml_br_shipping_fee_col_150: "88.95",
      ml_br_shipping_fee_col_200: "99.15",
      ml_br_shipping_fee_col_last: "107.05",
    },
  },
  {
    id: "ml_br_shipping_fee_21",
    label: "50",
    values: {
      ml_br_shipping_fee_col_19: "7.95",
      ml_br_shipping_fee_col_49: "11.55",
      ml_br_shipping_fee_col_79: "12.75",
      ml_br_shipping_fee_col_100: "70.25",
      ml_br_shipping_fee_col_120: "81.05",
      ml_br_shipping_fee_col_150: "92.05",
      ml_br_shipping_fee_col_200: "102.55",
      ml_br_shipping_fee_col_last: "110.75",
    },
  },
  {
    id: "ml_br_shipping_fee_22",
    label: "60",
    values: {
      ml_br_shipping_fee_col_19: "8.05",
      ml_br_shipping_fee_col_49: "11.75",
      ml_br_shipping_fee_col_79: "12.95",
      ml_br_shipping_fee_col_100: "74.95",
      ml_br_shipping_fee_col_120: "86.45",
      ml_br_shipping_fee_col_150: "98.15",
      ml_br_shipping_fee_col_200: "109.35",
      ml_br_shipping_fee_col_last: "118.15",
    },
  },
  {
    id: "ml_br_shipping_fee_23",
    label: "70",
    values: {
      ml_br_shipping_fee_col_19: "8.15",
      ml_br_shipping_fee_col_49: "11.95",
      ml_br_shipping_fee_col_79: "13.15",
      ml_br_shipping_fee_col_100: "80.25",
      ml_br_shipping_fee_col_120: "92.95",
      ml_br_shipping_fee_col_150: "105.05",
      ml_br_shipping_fee_col_200: "117.15",
      ml_br_shipping_fee_col_last: "126.55",
    },
  },
  {
    id: "ml_br_shipping_fee_24",
    label: "80",
    values: {
      ml_br_shipping_fee_col_19: "8.25",
      ml_br_shipping_fee_col_49: "12.15",
      ml_br_shipping_fee_col_79: "13.35",
      ml_br_shipping_fee_col_100: "83.95",
      ml_br_shipping_fee_col_120: "97.05",
      ml_br_shipping_fee_col_150: "109.85",
      ml_br_shipping_fee_col_200: "122.45",
      ml_br_shipping_fee_col_last: "132.25",
    },
  },
  {
    id: "ml_br_shipping_fee_25",
    label: "90",
    values: {
      ml_br_shipping_fee_col_19: "8.35",
      ml_br_shipping_fee_col_49: "12.35",
      ml_br_shipping_fee_col_79: "13.55",
      ml_br_shipping_fee_col_100: "93.25",
      ml_br_shipping_fee_col_120: "107.45",
      ml_br_shipping_fee_col_150: "122.05",
      ml_br_shipping_fee_col_200: "136.05",
      ml_br_shipping_fee_col_last: "146.95",
    },
  },
  {
    id: "ml_br_shipping_fee_26",
    label: "100",
    values: {
      ml_br_shipping_fee_col_19: "8.45",
      ml_br_shipping_fee_col_49: "12.55",
      ml_br_shipping_fee_col_79: "13.75",
      ml_br_shipping_fee_col_100: "106.55",
      ml_br_shipping_fee_col_120: "123.95",
      ml_br_shipping_fee_col_150: "139.55",
      ml_br_shipping_fee_col_200: "155.55",
      ml_br_shipping_fee_col_last: "167.95",
    },
  },
  {
    id: "ml_br_shipping_fee_27",
    label: "125",
    values: {
      ml_br_shipping_fee_col_19: "8.55",
      ml_br_shipping_fee_col_49: "12.75",
      ml_br_shipping_fee_col_79: "13.95",
      ml_br_shipping_fee_col_100: "119.25",
      ml_br_shipping_fee_col_120: "138.05",
      ml_br_shipping_fee_col_150: "156.05",
      ml_br_shipping_fee_col_200: "173.95",
      ml_br_shipping_fee_col_last: "187.95",
    },
  },
  {
    id: "ml_br_shipping_fee_28",
    label: "150",
    values: {
      ml_br_shipping_fee_col_19: "8.65",
      ml_br_shipping_fee_col_49: "12.75",
      ml_br_shipping_fee_col_79: "14.15",
      ml_br_shipping_fee_col_100: "126.55",
      ml_br_shipping_fee_col_120: "146.15",
      ml_br_shipping_fee_col_150: "165.65",
      ml_br_shipping_fee_col_200: "184.65",
      ml_br_shipping_fee_col_last: "199.45",
    },
  },
  {
    id: "ml_br_shipping_fee_29",
    label: "150+",
    values: {
      ml_br_shipping_fee_col_19: "8.75",
      ml_br_shipping_fee_col_49: "12.95",
      ml_br_shipping_fee_col_79: "14.35",
      ml_br_shipping_fee_col_100: "166.15",
      ml_br_shipping_fee_col_120: "192.45",
      ml_br_shipping_fee_col_150: "217.55",
      ml_br_shipping_fee_col_200: "242.55",
      ml_br_shipping_fee_col_last: "261.95",
    },
  },
]

const mlBrFastShippingUnder79Rows = [
  { id: "ml_br_shipping_fast_1", xMin: "0", xMax: "0.3", value: "12.35", remark: "" },
  { id: "ml_br_shipping_fast_2", xMin: "0.3", xMax: "0.5", value: "13.25", remark: "" },
  { id: "ml_br_shipping_fast_3", xMin: "0.5", xMax: "1", value: "13.85", remark: "" },
  { id: "ml_br_shipping_fast_4", xMin: "1", xMax: "1.5", value: "14.15", remark: "" },
  { id: "ml_br_shipping_fast_5", xMin: "1.5", xMax: "2", value: "14.45", remark: "" },
  { id: "ml_br_shipping_fast_6", xMin: "2", xMax: "3", value: "15.75", remark: "" },
  { id: "ml_br_shipping_fast_7", xMin: "3", xMax: "4", value: "17.05", remark: "" },
  { id: "ml_br_shipping_fast_8", xMin: "4", xMax: "5", value: "18.45", remark: "" },
  { id: "ml_br_shipping_fast_9", xMin: "5", xMax: "6", value: "25.45", remark: "" },
  { id: "ml_br_shipping_fast_10", xMin: "6", xMax: "7", value: "27.05", remark: "" },
  { id: "ml_br_shipping_fast_11", xMin: "7", xMax: "8", value: "28.85", remark: "" },
  { id: "ml_br_shipping_fast_12", xMin: "8", xMax: "9", value: "29.65", remark: "" },
  { id: "ml_br_shipping_fast_13", xMin: "9", xMax: "11", value: "41.25", remark: "" },
  { id: "ml_br_shipping_fast_14", xMin: "11", xMax: "13", value: "42.15", remark: "" },
  { id: "ml_br_shipping_fast_15", xMin: "13", xMax: "15", value: "45.05", remark: "" },
  { id: "ml_br_shipping_fast_16", xMin: "15", xMax: "17", value: "48.55", remark: "" },
  { id: "ml_br_shipping_fast_17", xMin: "17", xMax: "20", value: "54.75", remark: "" },
  { id: "ml_br_shipping_fast_18", xMin: "20", xMax: "25", value: "64.05", remark: "" },
  { id: "ml_br_shipping_fast_19", xMin: "25", xMax: "30", value: "65.95", remark: "" },
  { id: "ml_br_shipping_fast_20", xMin: "30", xMax: "40", value: "67.75", remark: "" },
  { id: "ml_br_shipping_fast_21", xMin: "40", xMax: "50", value: "70.25", remark: "" },
  { id: "ml_br_shipping_fast_22", xMin: "50", xMax: "60", value: "74.95", remark: "" },
  { id: "ml_br_shipping_fast_23", xMin: "60", xMax: "70", value: "80.25", remark: "" },
  { id: "ml_br_shipping_fast_24", xMin: "70", xMax: "80", value: "83.95", remark: "" },
  { id: "ml_br_shipping_fast_25", xMin: "80", xMax: "90", value: "93.25", remark: "" },
  { id: "ml_br_shipping_fast_26", xMin: "90", xMax: "100", value: "106.55", remark: "" },
  { id: "ml_br_shipping_fast_27", xMin: "100", xMax: "125", value: "119.25", remark: "" },
  { id: "ml_br_shipping_fast_28", xMin: "125", xMax: "150", value: "126.55", remark: "" },
  { id: "ml_br_shipping_fast_29", xMin: "150", xMax: "", value: "166.15", remark: "150kg 以上" },
]

export const templateDemoTables = [
  {
    id: "ml_br_fixed_fee",
    name: "巴西美客多固定附加费表",
    country: "巴西",
    platform: "美客多",
    ruleType: "range_1d",
    valueUnit: "R$",
    sourceUrl: "https://www.mercadolivre.com.br/ajuda/870",
    remark:
      "来源页当前说明：79 以上不收固定费，12.50 以下按售价一半收取固定费。",
    rows: [
      {
        id: "ml_br_fixed_fee_1",
        xMin: "12.5",
        xMax: "29",
        value: "6.25",
        remark: "来源页还说明商品售价至少应为 R$ 8。",
      },
      {
        id: "ml_br_fixed_fee_2",
        xMin: "29",
        xMax: "50",
        value: "6.50",
        remark: "",
      },
      {
        id: "ml_br_fixed_fee_3",
        xMin: "50",
        xMax: "79",
        value: "6.75",
        remark: "",
      },
    ],
  },
  {
    id: "ml_br_shipping_fee",
    name: "巴西美客多运费补贴表",
    country: "巴西",
    platform: "美客多",
    ruleType: "range_2d",
    valueUnit: "R$",
    sourceUrl: "https://www.mercadolivre.com.br/ajuda/40538",
    remark: "按重量和售价区间命中一行运费值。",
    xAxisLabel: "售价",
    yAxisLabel: "重量",
    columns: mlBrShippingColumns,
    rows: mlBrShippingRows,
  },
  {
    id: "ml_br_shipping_fast_under_79",
    name: "巴西美客多 79 以下快速免邮表",
    country: "巴西",
    platform: "美客多",
    ruleType: "range_1d",
    valueUnit: "R$",
    sourceUrl: "https://www.mercadolivre.com.br/ajuda/40538",
    remark: "官方 79 以下可选快速免邮成本，按重量区间查值。",
    rows: mlBrFastShippingUnder79Rows,
  },
  {
    id: "ml_br_commission",
    name: "巴西美客多佣金表",
    country: "巴西",
    platform: "美客多",
    ruleType: "enum_pair",
    valueUnit: "%",
    sourceUrl: "https://www.mercadolivre.com.br/ajuda/tarifas-e-faturamento_1044",
    remark:
      "来源页当前只明确给出费率范围：Clássico 为 10%~14%，Premium 为 15%~19%。类目细表未直接给出，这里先不写死猜测值。",
    rows: [
      {
        id: "ml_br_commission_1",
        matchKey: "",
        matchKey2: "Clássico",
        value: "",
        remark: "填写该类目在 Mercado Livre 后台查询到的精确费率。",
      },
      {
        id: "ml_br_commission_2",
        matchKey: "",
        matchKey2: "Premium",
        value: "",
        remark: "填写该类目在 Mercado Livre 后台查询到的精确费率。",
      },
    ],
  },
]
