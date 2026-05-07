# Cesium Geo Viewer

基于 CesiumJS 的时空大数据三维可视化平台，支持矢量建筑白膜、倾斜摄影、glTF 模型、动态 CZML 等多源数据加载。

## 技术栈

| 层 | 技术 |
|------|------|
| 三维引擎 | CesiumJS 1.110 |
| 构建工具 | Vite 4 |
| 数据预处理 | Python + GeoPandas |
| 服务发布 | GeoServer (OGC WMS/WMTS) |
| 白膜生成 | CesiumLab |

## 快速开始

```bash
# 1. 安装依赖（需要 Node.js ≥ 18）
npm install

# 2. 启动开发服务器
npm run dev

# 3. 浏览器打开 http://localhost:5173
```

## 可选：配置数据预处理环境

数据裁剪、格式转换等离线任务建议用 conda 管理（geopandas 在 Windows 上通过 conda 安装更稳定）：

```bash
conda create -n geo python=3.11
conda activate geo
conda install -c conda-forge geopandas
```

## 项目结构

```
cesium-geo-viewer/
  src/
    main.js              # Cesium 入口，初始化 Viewer
    index.css            # 全局样式
    api/                 # GeoServer OGC 服务配置
    utils/               # 量测、坐标转换等工具函数
    assets/              # 样式及图标
  public/
    data/
      3DTiles/           # 建筑白膜（3DTiles）
      Models/            # glTF / OBJ 模型
      Vector/            # GeoJSON / KML 数据
      CZML/              # CZML 动态数据
    images/              # Logo 及底图
  scripts/
    clip_beijing_central.py  # 北京中心城区建筑裁剪脚本
  data/                  # 原始数据（gitignored）
  package.json
  vite.config.js
```

## 数据处理工作流

原始数据（全北京 250 万栋建筑，542MB）→ 裁剪为中心城区：

```bash
conda activate geo
python scripts/clip_beijing_central.py
```

裁剪后（44 万栋，199MB）→ CesiumLab 拉伸白膜 → 输出 3DTiles 到 `public/data/3DTiles/`

## 功能清单

- [x] Cesium 开发环境搭建
- [x] 建筑 Shapefile 白膜拉伸（CesiumLab）
- [ ] 影像底图加载（Bing / 天地图 / 高德 / OSM / MapBox）
- [ ] OGC 服务加载（WMS / WMTS / TMS）
- [ ] GeoJSON / KML / TIFF / 点云 / 地形数据加载
- [ ] 武汉大学信息学部倾斜摄影加载
- [ ] glTF / CZML / 单张图片底图加载
- [ ] BIM 数据加载
- [ ] 三维 LOG 放置
- [ ] 道路车辆行驶模拟
