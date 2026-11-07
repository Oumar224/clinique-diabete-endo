import { mergeConfig } from 'vitest/config'
import baseConfig from './vitest.config'
export default mergeConfig(baseConfig, {
  test: {
    include: ['/tmp/opencode/**/*.repro.spec.ts'],
    environment: 'jsdom',
  },
  resolve: {
    alias: baseConfig.resolve?.alias,
  },
})
