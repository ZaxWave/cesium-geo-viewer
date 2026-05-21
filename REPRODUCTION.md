# Cesium Geo Viewer — 实验复现说明文档

## 1. 实验概述

本项目为**基于 CesiumJS 的时空大数据三维可视化平台**，支持多源空间数据（影像、地形、倾斜摄影、BIM、点云、矢量）的统一展示与交互分析。

- **代码仓库**: https://github.com/ZaxWave/cesium-geo-viewer.git
- **提交版本**: `6083761` (2026-05-16)
- **分支**: `master`

---

## 2. 实验环境

| 项目 | 版本/配置 |
|------|----------|
| **操作系统** | Windows 11 Home China (build 26220) |
| **Node.js** | v22.14.0 |
| **npm** | 10.9.2 |
| **Python** | 3.12.3 |
| **CesiumJS** | ^1.110 (通过 `<script>` 标签加载 `Cesium.js`，非 ES 模块打包) |
| **Vite** | 4.4.5 |
| **浏览器** | 推荐 Chrome/Edge 最新版（需 WebGL 2.0 支持） |

### 硬件建议

| 项目 | 最低要求 | 推荐配置 |
|------|---------|---------|
| **CPU** | 4 核 | 8 核+ |
| **内存** | 8 GB | 16 GB+ |
| **GPU** | 集成显卡（WebGL 2.0） | 独立显卡 4GB+ |
| **磁盘** | 10 GB 空闲 | 20 GB+（含瓦片数据） |

---

## 3. 依赖项

### 3.1 Node.js 依赖 (`package.json`)

```json
{
  "devDependencies": {
    "vite": "^4.4.5",
    "vite-plugin-cesium": "^1.2.22"
  },
  "dependencies": {
    "cesium": "^1.110.0"
  }
}
```

锁文件 `package-lock.json` 记录了完整依赖树，**复现时必须使用该锁文件安装**以确保版本一致。

### 3.2 Python 依赖（数据处理脚本）

```bash
pip install ifcopenshell trimesh numpy
```

> 仅有数据处理需求时才需安装，运行平台本身无需 Python 依赖（`data_server.py` 仅使用标准库）。

### 3.3 外部服务（可选）

| 服务 | 用途 | 是否必需 |
|------|------|---------|
| **GeoServer** (localhost:8080) | WMS/WMTS/TMS 图层服务 | 可选 — 无 GeoServer 时 OGC 图层无法加载 |
| **Cesium ion Token** | Cesium World Terrain 在线地形 | 半必需 — 已内置 token，在线地形需联网 |
| **CesiumLab** | osgb→3D Tiles / DEM 地形切片 | 仅数据处理时使用 |

---

## 4. 项目文件说明

### 4.1 Git 仓库包含的文件

```
CesiumProject/
├── index.html                 # HTML 入口
├── package.json               # 依赖声明
├── package-lock.json          # 依赖锁文件（精确版本）
├── vite.config.js             # Vite 构建配置
├── README.md                  # 项目说明
├── REPRODUCTION.md            # 本文件 — 复现说明
├── .gitignore
├── .github/
│   └── copilot-instructions.md
├── public/
│   ├── data/                  # 小型静态数据（3DTiles / CZML / Models / Vector）
│   │   ├── 3DTiles/           # 点云/建筑白膜 tileset
│   │   ├── CZML/              # CZML 动态数据
│   │   ├── Models/            # glTF/GLB 模型
│   │   └── Vector/            # 矢量数据 & 底图图片
│   └── libs/
│       └── cesium/
│           └── Cesium.js      # CesiumJS 完整库（~4.9 MB）
├── src/
│   ├── main.js                # 入口：Viewer 初始化、场景编排
│   ├── config.js              # 集中配置（Token、路径、预设）
│   ├── index.css              # 毛玻璃 UI 样式
│   ├── cesium-shim.js         # Cesium 导入适配层
│   ├── layers/                # 数据加载模块
│   │   ├── imagery.js         # 底图工厂
│   │   ├── terrain.js         # 地形 Provider
│   │   ├── gcj02.js           # GCJ-02 ↔ WGS84 坐标转换
│   │   ├── ogc.js             # WMS/WMTS/TMS 图层
│   │   ├── pointcloud.js      # 3D Tiles 加载
│   │   ├── pointcloud_raw.js  # 原始点云 (PLY/PCD/TXT/OBJ)
│   │   ├── raster.js          # GeoTIFF 通过 GeoServer WMS
│   │   ├── vector.js          # GeoJSON/KML/CZML
│   │   ├── model.js           # glTF/GLB 模型
│   │   ├── bim.js             # BIM (IFC→GLB)
│   │   ├── logo.js            # 3D 文字 LOGO
│   │   ├── singleImage.js     # 单张图片底图
│   │   └── vehicle.js         # 车辆路径模拟
│   └── ui/
│       ├── layerSwitcher.js   # 底图切换面板
│       └── dataPanel.js       # 数据加载面板
└── scripts/
    ├── data_server.py         # 海量切片 HTTP 服务器
    ├── convert_ifc.py         # IFC → GLB 转换
    ├── generate_terrain.py    # DEM → 地形瓦片
    ├── wgs84_to_gcj02.py      # GCJ-02 坐标批量转换
    └── clip_beijing_central.py # 北京行政区划裁剪
```

### 4.2 大文件数据（不在 Git 仓库中）

以下数据因体积过大被 `.gitignore` 排除，需单独获取：

| 数据目录 | 内容 | 预估大小 | 来源 |
|---------|------|---------|------|
| `data/whu_oblique/` | 武汉大学倾斜摄影 3D Tiles | 数 GB | CesiumLab 处理 osgb 生成 |
| `data/terrain_whu/` | 武汉大学地形瓦片 | 数百 MB | CesiumLab DEM 切片 |
| `data/北京市百度建筑最新/` | 北京百度建筑数据 | - | 项目提供方 |
| `data/北京市中心城区建筑/` | 北京中心城区建筑 | - | 项目提供方 |
| `data/武汉大学数据/` | 武汉大学相关数据 | - | 项目提供方 |
| `data/武汉地形5/` | 武汉地形数据 | - | 项目提供方 |

> **复现核心功能不需要上述数据。** 这些数据仅用于高级功能演示（倾斜摄影、本地地形），缺失时相关按钮点击会静默失败（控制台会有 404 错误），不影响底图浏览、模型加载、矢量数据等基础功能。

---

## 5. 复现步骤

### Step 1 — 获取代码

```bash
git clone https://github.com/ZaxWave/cesium-geo-viewer.git
cd cesium-geo-viewer
```

或直接解压附带的 `cesium-geo-viewer-source.zip`。

### Step 2 — 安装依赖

```bash
npm ci
```

> 使用 `npm ci` 而非 `npm install`：严格按照 `package-lock.json` 安装，确保依赖版本与实验环境一致。

安装完成后，`vite-plugin-cesium` 会自动将 `node_modules/cesium/` 中的 Cesium 构建产物复制到 `public/libs/cesium/` 和 `public/cesium/`。

### Step 3 — （可选）配置 Token

编辑 `src/config.js`，按需填入自己的 Token：

```js
cesiumIonToken: 'your_token_here',    // Cesium ion（在线地形需要）
bingMapsKey: '',                       // Bing Maps
tiandituToken: 'your_token_here',     // 天地图
mapboxToken: '',                       // Mapbox
```

> 仓库中已内置可用 token，**可以直接运行，无需额外配置**。

### Step 4 — 启动数据服务器

```bash
npm run data-server
# → HTTP server listening on http://localhost:8082
```

该服务器为项目根目录提供静态文件服务（含 CORS 头），用于访问 `data/` 下的海量切片数据。

### Step 5 — 启动开发服务器

**另开一个终端：**

```bash
npm run dev
# → Vite dev server: http://localhost:5173
```

### Step 6 — 打开浏览器访问

```
http://localhost:5173
```

### Step 7 — 验证功能

按以下清单逐一验证各功能正常：

- [ ] **底图加载**: 默认显示高德影像底图，左下角底图切换器可见
- [ ] **底图切换**: 点击切换按钮（高德矢量、天地图影像/矢量、OSM），底图正确切换
- [ ] **相机操作**: 左键旋转、右键平移、滚轮缩放、中键倾斜
- [ ] **坐标追踪**: 鼠标悬停时右下角显示经纬度
- [ ] **3D Tiles 加载**: Tab 模型 → 点击 3D Tiles / GCJ-02 点云，数据正确加载到场景
- [ ] **glTF 模型**: Tab 模型 → 点击 glTF，模型正确加载
- [ ] **CZML 动画**: Tab 模型 → 点击 CZML / Upload CZML，动态数据播放
- [ ] **BIM 模型**: Tab 模型 → 点击 BIM，Demo 建筑加载
- [ ] **WHU Oblique**: Tab 模型 → 点击 WHU Oblique，相机飞入武大（如数据缺失则控制台报错）
- [ ] **WMS 图层**: Tab 影像 → 点击 WMS（需 GeoServer 运行）
- [ ] **车辆模拟**: Tab 其他 → Pick Path → 地图点击 → Start，3D 车辆行驶
- [ ] **地形切换**: Tab 其他 → Flat/Online/Local 切换
- [ ] **3D LOGO**: Tab 其他 → 输入文字 → 点击 3D LOGO
- [ ] **单张底图**: 左下角切换到 Single Image

---

## 6. 关键架构说明

### 6.1 CesiumJS 加载方式

CesiumJS 通过 `index.html` 中的 `<script>` 标签加载 `public/libs/cesium/Cesium.js`（~4.9MB），而非通过 Vite 打包。`src/cesium-shim.js` 将 `window.Cesium` 重新导出，使各模块可用 `import Cesium from 'cesium'` 导入。

**这样做的原因**：CesiumJS 源码体积巨大，Vite 预构建会严重拖慢启动速度（数分钟），且可能导致内存溢出。

### 6.2 数据分层架构

```
浏览器 (localhost:5173)
  ├── Vite Dev Server (port 5173)
  │   ├── /src/*          → 应用源码（ES 模块，Vite HMR）
  │   ├── /data/*         → public/data/ 小型静态数据
  │   ├── /geoserver/*    → 代理到 GeoServer (localhost:8080)
  │   └── /tianditu/*     → 代理到天地图服务器（CORS 绕过）
  │
  └── Data Server (port 8082)
      └── /data/*          → 项目根目录 data/ 海量切片
```

### 6.3 GCJ-02 坐标纠偏

中国地图服务商（高德、天地图）使用 GCJ-02 坐标系，与 WGS84 存在 ~300-500m 偏移。本项目的处理策略：

- **高德底图**: 通过 `gcj02.js` 中的 `createGcj02CorrectedGaodeProvider()` 在瓦片层面自动纠偏回 WGS84
- **天地图底图**: 保持 GCJ-02，与本地地形和 3D Tiles 对齐
- **坐标系对齐规则**: 在线地形（WGS84）→ 高德底图；本地地形（GCJ-02）→ 天地图底图

---

## 7. 常见问题

### Q: `npm run dev` 启动后 Vite 假死/卡住？

A: 检查 `public/data/` 下是否有海量文件（数千个瓦片），应移至项目根目录 `data/` 下，通过 data-server 访问。

### Q: 天地图加载失败/空白？

A: 检查 `src/config.js` 中的 `tiandituToken` 是否有效。天地图 token 可能过期，需到天地图官网申请新的。

### Q: GeoServer 图层无法加载？

A: 确保 GeoServer 运行在 `localhost:8080`，且已发布相应的 WMS/WMTS/TMS 图层。

### Q: Cesium Ion 地形提示 token 无效？

A: `src/config.js` 中的 `cesiumIonToken` 可能已过期，到 https://ion.cesium.com 申请新的 token。

### Q: 3D Tiles 或倾斜模型加载后位置偏移？

A: 检查坐标系对齐：3D Tiles（GCJ-02）需搭配天地图底图；在线地形（WGS84）需搭配高德底图。加载 3D Tiles 时会自动切换底图。

---

## 8. 联系方式

如有复现问题，请在 GitHub 提交 Issue：
https://github.com/ZaxWave/cesium-geo-viewer/issues

---

> 文档生成日期: 2026-05-21
> 对应代码版本: `6083761` (master branch)
