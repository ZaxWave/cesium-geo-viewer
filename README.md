# Cesium Project

This is a basic Cesium project set up with Vite.

## Getting Started

1. Install dependencies: `npm install`
2. Run the development server: `npm run dev`
3. Open your browser to `http://localhost:5173`

## Project Structure

- `public/`: Static assets and data files
- `src/`: Source code
  - `main.js`: Entry point, initializes Cesium viewer
  - `index.css`: Global styles
  - `api/`: API configurations for GeoServer OGC services
  - `utils/`: Utility functions for Cesium (measurement, coordinate conversion, etc.)
  - `assets/`: Styles and small images

## Data Directories

- `public/data/3DTiles/`: 3D Tiles data
- `public/data/Models/`: glTF/OBJ models
- `public/data/Vector/`: GeoJSON, KML data
- `public/data/CZML/`: CZML animation data
- `public/images/`: Logos and base map images