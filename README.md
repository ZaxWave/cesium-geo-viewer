# Cesium Geo Viewer

基于 CesiumJS 的时空大数据三维可视化平台，支持多源空间数据的统一展示与交互分析。

## 技术栈

| 模块 | 方案 |
|---|---|
| 三维引擎 | CesiumJS ^1.110 |
| 构建工具 | Vite 4 |
| OGC 服务 | GeoServer (WMS / WMTS / TMS) |
| 数据处理 | CesiumLab (osgb→3DTiles, DEM terrain slicing) |
| IFC 转换 | ifcopenshell + trimesh (IFC → GLB) |

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
│  ├─ main.js              # Viewer 初始化，场景编排，相机控制，坐标追踪
│  ├─ config.js            # Token、GeoServer 预设、数据路径集中配置
│  ├─ index.css            # 毛玻璃面板 & 全局样式
│  ├─ layers/
│  │  ├─ imagery.js        # 底图工厂（天地图/高德/OSM/Bing/Mapbox）
│  │  ├─ terrain.js        # 地形 Provider（Flat / Cesium World / Local）
│  │  ├─ gcj02.js          # GCJ-02 ↔ WGS84 坐标转换 & 高德瓦片纠偏
│  │  ├─ ogc.js            # WMS / WMTS / TMS 图层工厂
│  │  ├─ pointcloud.js     # 3D Tiles 加载（含 modelMatrix 偏移）
│  │  ├─ pointcloud_raw.js # 原始点云加载（PLY/PCD/TXT/OBJ→Entity cluster）
│  │  ├─ raster.js         # GeoTIFF 通过 GeoServer WMS 加载
│  │  ├─ vector.js         # GeoJSON / KML / CZML 加载
│  │  ├─ model.js          # glTF / GLB 模型加载（含 silhouette 描边）
│  │  ├─ bim.js            # BIM 模型加载（IFC→GLB，含 demo building 回退）
│  │  ├─ logo.js           # 3D 文字 LOGO 放置
│  │  ├─ singleImage.js    # 单张图片底图叠加
│  │  └─ vehicle.js        # 路径点选 + 3D 车辆行驶模拟
│  └─ ui/
│     ├─ layerSwitcher.js  # 底图切换面板（芯片按钮）
│     └─ dataPanel.js      # 数据加载面板（分 Tab：影像/模型/其他）
├─ public/data/
│  ├─ 3DTiles/             # 3D Tiles（点云/建筑白膜）
│  ├─ 3DTiles_gcj02/       # GCJ-02 版本点云
│  ├─ whu_oblique/         # 武汉大学倾斜摄影模型
│  ├─ Models/              # glTF/GLB 模型文件
│  ├─ CZML/                # CZML 动态数据（卫星轨迹等）
│  └─ Vector/              # 矢量数据 & 底图图片
├─ scripts/
│  ├─ convert_ifc.py       # IFC → GLB 转换（保留法线 & 颜色）
│  ├─ generate_terrain.py  # DEM GeoTIFF → QuantizedMesh 地形瓦片
│  ├─ wgs84_to_gcj02.py    # GCJ-02 坐标批量转换
│  └─ clip_beijing_central.py  # 北京行政区划裁剪
├─ package.json
└─ vite.config.js
```

## 功能概览

### 底图切换

- 高德影像/矢量（GCJ-02 自动纠偏）
- 天地图影像/矢量
- OpenStreetMap
- Bing Maps / Mapbox（需 Token）

### 数据加载（三栏 Tab）

**Tab 1 — 影像**
| 格式 | 说明 |
|------|------|
| WMS / WMTS / TMS | GeoServer OGC 服务 |
| Single Image | 单张图片底图叠加 |
| GeoTIFF | 通过 GeoServer WMS 加载 |

**Tab 2 — 模型**
| 格式 | 说明 |
|------|------|
| 3D Tiles | 点云 / 建筑白膜 |
| WHU Oblique | 武汉大学信息学部倾斜摄影（一键飞入） |
| glTF / GLB | 通用 3D 模型，支持上传 & URL |
| BIM (IFC→GLB) | BIM 模型加载，含 Demo 建筑回退 |
| Point Cloud | 原始点云文件（PLY/PCD/TXT/OBJ）→ Entity 点簇 |
| CZML | 动态时序数据，支持上传 & URL |

**Tab 3 — 其他**
| 功能 | 说明 |
|------|------|
| Vector Data | GeoJSON / KML 文件上传 |
| 3D LOGO | 自定义文字放置在 WHU 坐标 |
| Vehicle Sim | 地图点击选点 → 3D 车辆沿路径行驶 |
| Terrain | Flat / Cesium World / Local 地形切换 |

### 地形控制

- **Flat** — 平面椭球，适合点云/倾斜模型精确定位
- **Online** — Cesium World Terrain（需 `cesiumIonToken`）
- **Local** — CesiumLab 切片本地地形（需 `localTerrainUrl`）

### 相机操作

| 操作 | 功能 |
|------|------|
| 左键拖拽 | 旋转 |
| 右键拖拽 | 平移 |
| 滚轮 | 缩放 |
| 中键 / Ctrl+左键 | 倾斜 |

鼠标悬停时右下角实时显示经纬度坐标。

### 车辆路径模拟

1. 在「其他」Tab 点击 **Pick Path**
2. 在地图上左键点击添加路径点（显示蓝色编号标记 + 连线）
3. 点击 **Start** 启动 3D 车辆模型沿路径行驶（第一人称跟随视角）
4. 点击 **Stop** 停止 / **Clear** 清除路径

### GCJ-02 坐标纠偏

高德底图通过瓦片坐标映射自动从 GCJ-02 纠偏回 WGS84，支持双向坐标转换（`gcj02.js`）。

## 配置说明 (`src/config.js`)

```js
{
  cesiumIonToken: '',        // Cesium Ion token
  tiandituToken: '',         // 天地图 API token
  bingMapsKey: '',           // Bing Maps API key
  mapboxToken: '',           // Mapbox access token

  geoserverUrl: '/geoserver', // Vite 代理 → GeoServer

  geoserver: {
    wmsUrl, wmsLayer,        // WMS 预设
    wmtsUrl, wmtsLayer,      // WMTS 预设
    tmsUrl, tmsPath,         // TMS 预设
    tiffLayer,               // GeoTIFF 图层名
    xianCenter, hubeiCenter, // 区域相机位置
  },

  localTerrainUrl: '',       // CesiumLab 地形瓦片路径
  whuCenter: [114.35, 30.53, 800],   // 武大倾斜模型相机
  logoPosition: [114.356, 30.527, 0], // 3D LOGO 放置坐标

  data: {
    building3DTiles,          // 3D Tiles 路径
    pointCloudGCJ02Offset,    // GCJ-02 点云微调偏移
    whuOblique,               // 武大倾斜模型
    gltf, czml, bim,          // 预设路径
  },
}
```

## 数据处理工作流

1. **倾斜摄影** — osgb → CesiumLab → 3D Tiles → `public/data/whu_oblique/`
2. **地形切片** — DEM GeoTIFF → CesiumLab (ctb/散列) → `public/data/terrain_whu/`
3. **IFC 模型** — `python scripts/convert_ifc.py input.ifc output.glb` → `public/data/Models/`
4. **CGCS2000 3DTiles** — 如需叠加 GCJ-02 点云，通过 `pointCloudGCJ02Offset` 微调

## 说明

本项目适用于城市三维可视化、空间数据展示与时空分析应用场景，支持扩展多源影像、倾斜模型、BIM 数据和动态专题数据。
