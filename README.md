# Cesium Geo Viewer

一个基于 CesiumJS 的时空大数据三维可视化平台，旨在实现多源空间数据的统一展示与交互分析。

## 核心能力

- 多种数据类型加载：3DTiles、glTF、CZML、矢量数据、OGC 影像服务
- 北京中心城区建筑白膜展示与倾斜摄影集成
- 离线数据裁剪与预处理脚本支持
- 基于 Vite 的轻量前端构建与快速开发体验

## 技术栈

| 模块 | 方案 |
|---|---|
| 三维引擎 | CesiumJS 1.110 |
| 构建工具 | Vite 4 |
| 数据处理 | Python + GeoPandas |
| OGC 服务 | GeoServer (WMS / WMTS) |
| 白膜生成 | CesiumLab |

## 快速启动

1. 安装依赖

```bash
npm install
```

2. 启动本地开发服务器

```bash
npm run dev
```

3. 在浏览器中打开

```text
http://localhost:5173
```

## 数据预处理（可选）

推荐使用 Conda 创建独立 Python 环境，提升 Windows 下 GeoPandas 及空间库的稳定性：

```bash
conda create -n geo python=3.11
conda activate geo
conda install -c conda-forge geopandas
```

## 项目结构

```text
CesiumProject/
├─ src/
│  ├─ main.js              # Cesium 应用入口
│  ├─ index.css            # 全局样式
│  ├─ api/                 # OGC 服务配置与访问封装
│  ├─ layers/              # 图层加载与管理逻辑
│  ├─ ui/                  # 界面组件与交互面板
│  └─ utils/               # 通用工具函数
├─ public/
│  ├─ data/
│  │  ├─ 3DTiles/         # 3DTiles 数据目录
│  │  ├─ Models/          # glTF / 模型文件
│  │  ├─ Vector/          # 矢量数据文件
│  │  └─ CZML/            # 动态 CZML 数据
│  └─ images/             # 资源图片
├─ scripts/
│  └─ clip_beijing_central.py  # 北京中心城区建筑裁剪脚本
├─ data/                   # 原始空间数据（通常不纳入版本控制）
├─ package.json
└─ vite.config.js
```

## 数据处理工作流

1. 使用 `scripts/clip_beijing_central.py` 对原始建筑数据进行裁剪
2. 将裁剪后的结果导入 CesiumLab 生成白膜模型
3. 将生成的 3DTiles 部署到 `public/data/3DTiles/`

```bash
conda activate geo
python scripts/clip_beijing_central.py
```

## 当前功能概览

- ✅ Cesium 前端可视化框架搭建
- ✅ 建筑 Shapefile 白膜裁剪与展示
- ⬜ OGC 地图瓦片服务加载
- ⬜ GeoJSON / KML / 点云 / 地形数据支持
- ⬜ glTF / CZML 动态三维展示
- ⬜ BIM 与复杂模型集成
- ⬜ 交互式三维标注与动画模拟

## 说明

<<<<<<< HEAD
本项目适用于城市三维可视化、空间数据展示与时空分析应用场景，便于后续扩展多源影像、模型和动态专题数据。
=======
本项目适用于城市三维可视化、空间数据展示与时空分析应用场景，便于后续扩展多源影像、模型和动态专题数据。
>>>>>>> 3668bb0 (Update Cesium project: refine README, add Beijing clip script, improve config, styles, imagery, terrain, and UI components)
