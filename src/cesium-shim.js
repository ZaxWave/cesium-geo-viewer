// Shim: re-exports Cesium global (loaded via <script> in index.html)
// so that `import Cesium from 'cesium'` works without Vite pre-bundling
// the massive Cesium source tree.
export default window.Cesium;
