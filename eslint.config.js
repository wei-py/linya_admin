import antfu from "@antfu/eslint-config"

export default antfu(
  {
    vue: true,
    ignores: [
      "dist",
      "docs/**/*.md",
      "node_modules",
      "src-tauri/gen",
      "src-tauri/target",
    ],
    stylistic: {
      quotes: "double",
      semi: false,
    },
  },
  {
    rules: {
      "style/max-len": [
        "error",
        {
          code: 80,
          ignoreComments: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreUrls: true,
        },
      ],
      "style/quotes": ["error", "double"],
      "vue/component-name-in-template-casing": [
        "error",
        "PascalCase",
        {
          registeredComponentsOnly: false,
        },
      ],
      "vue/singleline-html-element-content-newline": "off",
    },
  },
)
