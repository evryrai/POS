import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    globals: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests/e2e/**']
  }
})
