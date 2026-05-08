"""Generate Cesium quantized-mesh terrain with proper global base tiles."""
import rasterio
import numpy as np
from quantized_mesh_encoder import encode
import json
import os
import math
import shutil

SRC_TIF = r"E:\Desktop\时空大数据平台技术\CesiumProject\data\武汉大学数据\武汉大学.tif"
OUT_DIR = r"E:\Desktop\时空大数据平台技术\CesiumProject\public\data\terrain_whu"

GRID_SIZE = 65  # Cesium standard terrain tile size


def make_mesh(heights, bounds):
    """Convert heightmap (row-major, N->S) to triangle mesh."""
    rows, cols = heights.shape
    west, south, east, north = bounds

    # Lat/Lon grid
    lats = np.linspace(north, south, rows)
    lons = np.linspace(west, east, cols)
    lons_grid, lats_grid = np.meshgrid(lons, lats)

    # Local ENU approximation
    lat0 = (north + south) / 2.0
    lon0 = (west + east) / 2.0
    meters_lat = 111320.0
    meters_lon = 111320.0 * math.cos(abs(lat0) * math.pi / 180.0)
    if meters_lon < 1:
        meters_lon = 1.0

    x = (lons_grid - lon0) * meters_lon
    y = (lats_grid - lat0) * meters_lat
    z = np.nan_to_num(heights, nan=0.0).astype(np.float32)

    positions = np.column_stack([x.ravel(), y.ravel(), z.ravel()]).astype(np.float32)

    # Triangle indices (counter-clockwise winding)
    indices = []
    for r in range(rows - 1):
        for c in range(cols - 1):
            tl = r * cols + c
            tr = tl + 1
            bl = (r + 1) * cols + c
            br = bl + 1
            indices.append([tl, bl, br])
            indices.append([tl, br, tr])

    return positions, np.array(indices, dtype=np.uint32)


def write_tile(path, positions, triangle_indices, bounds):
    """Write a single quantized-mesh terrain tile."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as f:
        encode(f, positions, triangle_indices, bounds=bounds)


def create_flat_tile(bounds, elevation=1.0):
    """Create a slightly non-zero flat terrain tile."""
    heights = np.full((GRID_SIZE, GRID_SIZE), elevation, dtype=np.float32)
    positions, indices = make_mesh(heights, bounds)
    return positions, indices


def create_dem_tile(src, tile_w, tile_e, tile_s, tile_n):
    """Create a terrain tile from DEM data. Returns (positions, indices) or None."""
    row_nw, col_nw = rasterio.transform.rowcol(src.transform, tile_w, tile_n)
    row_se, col_se = rasterio.transform.rowcol(src.transform, tile_e, tile_s)

    r0 = max(0, int(min(row_nw, row_se)))
    r1 = min(src.height, int(max(row_nw, row_se)) + 1)
    c0 = max(0, int(min(col_nw, col_se)))
    c1 = min(src.width, int(max(col_nw, col_se)) + 1)

    if r1 - r0 < 2 or c1 - c0 < 2:
        return None

    data = src.read(1, window=((r0, r1), (c0, c1)))
    data = data.astype(np.float32)
    if src.nodata is not None:
        data[data == src.nodata] = np.nan

    h, w = data.shape
    if h < 2 or w < 2:
        return None

    # Resample
    row_idx = np.linspace(0, h - 1, GRID_SIZE, dtype=np.int32)
    col_idx = np.linspace(0, w - 1, GRID_SIZE, dtype=np.int32)
    sampled = data[row_idx[:, None], col_idx]

    if not np.any(np.isfinite(sampled)):
        return None

    positions, indices = make_mesh(sampled, [tile_w, tile_s, tile_e, tile_n])
    return positions, indices


def generate_tiles():
    # Clean output
    if os.path.exists(OUT_DIR):
        shutil.rmtree(OUT_DIR)

    print("Generating Level 0 global tiles...")
    # Cesium geodetic scheme: Level 0 = 2 tiles (x=0 west, x=1 east)
    # Tile 0/0/0: lon [-180, 0], lat [-90, 90]
    # Tile 0/1/0: lon [0, 180], lat [-90, 90]
    pos0, ind0 = create_flat_tile([-180, -90, 0, 90], 1.0)
    write_tile(os.path.join(OUT_DIR, "0", "0", "0.terrain"), pos0, ind0, [-180, -90, 0, 90])

    pos1, ind1 = create_flat_tile([0, -90, 180, 90], 1.0)
    write_tile(os.path.join(OUT_DIR, "0", "1", "0.terrain"), pos1, ind1, [0, -90, 180, 90])
    print("  Level 0: 2 tiles OK")

    # Levels 1-13: parent chain for WHU area
    with rasterio.open(SRC_TIF) as src:
        w, s, e, n = src.bounds
        print(f"DEM: lon [{w:.4f}, {e:.4f}], lat [{s:.4f}, {n:.4f}]")

        for zoom in range(1, 14):
            n_tiles = 2 ** zoom
            tile_size = 360.0 / n_tiles

            tx_min = int(math.floor((w + 180) / tile_size))
            tx_max = int(math.floor((e + 180) / tile_size))
            ty_min = int(math.floor((90 - n) / tile_size))
            ty_max = int(math.floor((90 - s) / tile_size))

            count = 0
            for tx in range(max(0, tx_min), min(n_tiles, tx_max + 1)):
                for ty in range(max(0, ty_min), min(n_tiles, ty_max + 1)):
                    tile_path = os.path.join(OUT_DIR, str(zoom), str(tx), f"{ty}.terrain")
                    if os.path.exists(tile_path):
                        continue
                    tw = tx * tile_size - 180
                    tn = 90 - ty * tile_size
                    tb = [tw, tn - tile_size, tw + tile_size, tn]
                    pos, ind = create_flat_tile(tb, 1.0)
                    write_tile(tile_path, pos, ind, tb)
                    count += 1

            if count > 0:
                print(f"  Zoom {zoom}: {count} placeholder tiles")

        # Levels 14-17: real DEM data
        print("Generating detailed WHU tiles...")
        total_dem = 0
        for zoom in range(14, 18):
            n_tiles = 2 ** zoom
            tile_size = 360.0 / n_tiles
            tx_min = int(math.floor((w + 180) / tile_size))
            tx_max = int(math.floor((e + 180) / tile_size))
            ty_min = int(math.floor((90 - n) / tile_size))
            ty_max = int(math.floor((90 - s) / tile_size))

            count = 0
            for tx in range(max(0, tx_min), min(n_tiles, tx_max + 1)):
                for ty in range(max(0, ty_min), min(n_tiles, ty_max + 1)):
                    tw = tx * tile_size - 180
                    te = tw + tile_size
                    tn = 90 - ty * tile_size
                    ts = tn - tile_size

                    result = create_dem_tile(src, tw, te, ts, tn)
                    if result is None:
                        continue
                    pos, ind = result
                    tile_path = os.path.join(OUT_DIR, str(zoom), str(tx), f"{ty}.terrain")
                    write_tile(tile_path, pos, ind, [tw, ts, te, tn])
                    count += 1

            total_dem += count
            print(f"  Zoom {zoom}: {count} DEM tiles")
        print(f"  Total DEM tiles: {total_dem}")

    # Count total
    total = sum(1 for _ in os.walk(OUT_DIR) for f in _[2] if f.endswith('.terrain'))
    print(f"\nTotal terrain tiles: {total}")

    # layer.json
    layer = {
        "tilejson": "2.1.0",
        "name": "WHU Terrain",
        "format": "quantized-mesh-1.0",
        "version": "1.0.0",
        "tiles": ["{z}/{x}/{y}.terrain"],
        "bounds": [-180, -90, 180, 90],
        "projection": "EPSG:4326",
        "minzoom": 0,
        "maxzoom": 17,
    }
    with open(os.path.join(OUT_DIR, 'layer.json'), 'w') as f:
        json.dump(layer, f)
    print("Done!")


if __name__ == '__main__':
    generate_tiles()
