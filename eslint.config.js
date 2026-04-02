import antfu from '@antfu/eslint-config'

export default antfu(
  {
    vue: true,
    ignores: ['dist', 'node_modules', 'src-tauri/gen', 'src-tauri/target'],
    stylistic: {
      quotes: 'single',
      semi: false,
    },
  },
  {
    rules: {
      'vue/component-name-in-template-casing': [
        'error',
        'PascalCase',
        {
          registeredComponentsOnly: false,
        },
      ],
    },
  },
)
