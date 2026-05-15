import { defineConfig } from 'vite'
import cesium from 'vite-plugin-cesium'
import path from 'path'

export default defineConfig({
  plugins: [cesium()],
  resolve: {
    alias: {
      // Use shim module that re-exports window.Cesium (loaded via <script>)
      // to avoid Vite pre-bundling the massive Cesium source tree
      cesium: path.resolve('src/cesium-shim.js'),
    },
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