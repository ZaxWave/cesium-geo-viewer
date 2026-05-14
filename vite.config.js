import { defineConfig } from 'vite'
import cesium from 'vite-plugin-cesium'

export default defineConfig({
  plugins: [cesium()],
  optimizeDeps: {
    include: ['cesium'],
  },
  server: {
    proxy: {
      '/geoserver': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/tianditu': {
        target: 'https://t0.tianditu.gov.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tianditu/, '/DataServer'),
        headers: { Referer: 'https://www.tianditu.gov.cn/' },
      },
    },
    watch: {
      ignored: ['**/public/data/**'],
    },
  },
})