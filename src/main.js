import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import './index.css'

// Cesium.Ion.defaultAccessToken = 'your_access_token_here' // Replace with your Cesium Ion token if needed

const viewer = new Cesium.Viewer('cesiumContainer', {
  terrainProvider: Cesium.createWorldTerrain()
})