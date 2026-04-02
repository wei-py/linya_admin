import antfu from '@antfu/eslint-config'

export default antfu(
  {
    vue: true,
    typescript: true,
    stylistic: true,
    ignores: ['dist', 'node_modules', 'src-tauri/target'],
  },
  {
    rules: {
      'style/semi': ['error', 'never'],
      'ts/consistent-type-definitions': ['error', 'type'],
      'vue/component-name-in-template-casing': ['error', 'PascalCase', {
        registeredComponentsOnly: false,
      }],
    },
  },
)
