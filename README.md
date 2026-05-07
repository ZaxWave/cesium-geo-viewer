# Cesium Geo Viewer

基于 CesiumJS 的时空大数据三维可视化平台，支持多源空间数据的统一展示与交互分析。

## 技术栈

| 模块 | 方案 |
|---|---|
| 三维引擎 | CesiumJS ^1.110 |
| 构建工具 | Vite 4 |
| OGC 服务 | GeoServer (WMS / WMTS / TMS) |
| 数据处理 | CesiumLab (osgb→3DTiles, terrain slicing) |

## 快速启动

```bash
npm install
npm run dev
# → http://localhost:5173
```

## 项目结构

```
CesiumProject/
├─ src/
│  ├─ main.js              # 应用入口，Viewer 初始化 & 场景编排
│  ├─ config.js            # Token、GeoServer 预设、数据路径集中配置
│  ├─ index.css            # 毛玻璃面板 & 全局样式
│  ├─ layers/
│  │  ├─ imagery.js        # 底图工厂（天地图/高德/OSM/Bing/Mapbox）
│  │  ├─ terrain.js        # 地形 Provider（Flat / Cesium World / Local）
│  │  ├─ gcj02.js          # GCJ-02 ↔ WGS84 坐标转换 & 高德瓦片纠偏
│  │  ├─ ogc.js            # WMS / WMTS / TMS 图层工厂
│  │  ├─ pointcloud.js     # 3D Tiles 加载 & modelMatrix 偏移
│  │  ├─ raster.js         # GeoTIFF 通过 GeoServer WMS 加载
│  │  ├─ vector.js         # GeoJSON / KML / CZML 加载
│  │  ├─ model.js          # glTF / GLB 模型加载
│  │  └─ singleImage.js    # 单张图片底图叠加
│  └─ ui/
│     ├─ layerSwitcher.js  # 底图切换面板（芯片按钮）
│     └─ dataPanel.js      # 数据加载面板（3DTiles/WMS/CZML/glTF…）
├─ public/data/
│  ├─ 3DTiles/             # 3D Tiles（点云/建筑白膜）
│  ├─ 3DTiles_gcj02/       # GCJ-02 版本点云
│  ├─ whu_oblique/         # 武汉大学倾斜摄影模型
│  ├─ Models/              # glTF / GLB 模型文件
│  ├─ CZML/                # CZML 动态数据
│  └─ Vector/              # 矢量数据 & 底图图片
├─ scripts/
│  └─ wgs84_to_gcj02.py    # GCJ-02 坐标转换脚本
├─ package.json
└─ vite.config.js
```

## 功能概览

### 底图切换 (Layer Switcher)
- 高德影像/矢量（GCJ-02 自动纠偏到 WGS84）
- 天地图影像/矢量（需 Token）
- OpenStreetMap
- Bing Maps（需 Token）/ Mapbox（需 Token）

### 多源数据加载 (Data Panel)

| 类别 | 格式 | 加载方式 |
|------|------|---------|
| 矢量数据 | GeoJSON / KML | 文件上传 |
| CZML | .czml | 文件上传 / URL |
| 3D Tiles | tileset.json | URL 加载 |
| 倾斜摄影 | WHU Oblique | 一键加载 → 飞到武大 |
| glTF 模型 | .gltf / .glb | 文件上传 / URL |
| WMS / WMTS / TMS | GeoServer | URL + 图层名 |
| GeoTIFF | via WMS | GeoServer 图层名 |
| 单张底图 | jpg / png | URL 加载 |

### 地形控制 (Terrain)
- **Flat**（默认）— 平面椭球，适合点云/倾斜模型精确定位
- **Online** — Cesium World Terrain，需在 `config.js` 配置 `cesiumIonToken`
- **Local** — 本地地形瓦片，需配置 `localTerrainUrl`

### GCJ-02 坐标纠偏
- 高德底图通过瓦片坐标映射自动从 GCJ-02 纠偏回 WGS84
- 支持 WGS84 ↔ GCJ-02 双向坐标转换（`gcj02.js`）

## 配置说明 (`src/config.js`)

```js
{
  cesiumIonToken: '',        // Cesium Ion token → 解锁在线地形
  tiandituToken: '',         // 天地图 API token
  bingMapsKey: '',           // Bing Maps API key
  mapboxToken: '',           // Mapbox access token

  geoserverUrl: '/geoserver', // Vite 代理到 GeoServer

  geoserver: {
    wmsUrl, wmsLayer,        // WMS 预设
    wmtsUrl, wmtsLayer,      // WMTS 预设
    tmsUrl, tmsPath,         // TMS 预设
    tiffLayer,               // GeoTIFF 图层名
    xianCenter, hubeiCenter, // 区域相机位置
  },

  localTerrainUrl: '',       // 本地地形瓦片 URL
  whuCenter: [114.35, 30.53, 800],  // 武大相机位置

  data: {
    building3DTiles,         // 建筑/点云 3D Tiles
    whuOblique,              // 武大倾斜模型
    gltf, czml, singleImage, // glTF/CZML/图片预设路径
  },
}
```

## OGC 服务说明

GeoServer 通过 Vite 代理访问（`/geoserver` → `http://localhost:8080/geoserver`）：

- **WMS**: 1.1.1 版本，显式指定 `srs=EPSG:4326`，透明 PNG
- **WMTS**: KVP 模式，`tileMatrixSetID=EPSG:4326`，`GeographicTilingScheme`，`style=polygon`
- **TMS**: `UrlTemplateImageryProvider` + `{reverseY}`，`GeographicTilingScheme`

## 数据处理工作流

1. 原始 osgb 倾斜摄影 → CesiumLab 转换为 3D Tiles
2. DEM 数据 → CesiumLab 切为地形瓦片
3. 将生成的数据放入 `public/data/` 对应目录

## 说明

本项目适用于城市三维可视化、空间数据展示与时空分析应用场景，支持扩展多源影像、倾斜模型、BIM 数据和动态专题数据。
