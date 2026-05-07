"""
Convert shapefile coordinates from WGS84 to GCJ-02.
Use this BEFORE feeding data to CesiumLab if you want Gaode alignment.

Run: python scripts/wgs84_to_gcj02.py
Output: data/北京市中心城区建筑/北京市二环内核心区建筑_GCJ02.shp
"""
import geopandas as gpd
import math
from pathlib import Path
from shapely.ops import transform as shapely_transform

INPUT_SHP = r"E:\Desktop\时空大数据平台技术\CesiumProject\data\北京市中心城区建筑\北京市二环内核心区建筑.shp"
OUTPUT_SHP = INPUT_SHP.replace('.shp', '_GCJ02.shp')

# ---------- GCJ-02 transform (standard algorithm) ----------
PI = math.pi
A = 6378245.0
EE = 0.00669342162296594323

def _delta(lon, lat):
    dlon = 300.0 + lon + 2.0 * lat + 0.1 * lon * lon + 0.1 * lon * lat + 0.1 * math.sqrt(abs(lon))
    dlon += (20.0 * math.sin(6.0 * lon * PI) + 20.0 * math.sin(2.0 * lon * PI)) * 2.0 / 3.0
    dlon += (20.0 * math.sin(lon * PI) + 40.0 * math.sin(lon / 3.0 * PI)) * 2.0 / 3.0
    dlon += (150.0 * math.sin(lon / 12.0 * PI) + 300.0 * math.sin(lon / 30.0 * PI)) * 2.0 / 3.0

    dlat = -100.0 + 2.0 * lon + 3.0 * lat + 0.2 * lat * lat + 0.1 * lon * lat + 0.2 * math.sqrt(abs(lon))
    dlat += (20.0 * math.sin(6.0 * lon * PI) + 20.0 * math.sin(2.0 * lon * PI)) * 2.0 / 3.0
    dlat += (20.0 * math.sin(lat * PI) + 40.0 * math.sin(lat / 3.0 * PI)) * 2.0 / 3.0
    dlat += (160.0 * math.sin(lat / 12.0 * PI) + 320 * math.sin(lat * PI / 30.0)) * 2.0 / 3.0

    radlat = lat / 180.0 * PI
    magic = 1 - EE * math.sin(radlat) ** 2
    sqrtmagic = math.sqrt(magic)
    dlat = (dlat * 180.0) / ((A * (1 - EE)) / (magic * sqrtmagic) * PI)
    dlon = (dlon * 180.0) / (A / sqrtmagic * math.cos(radlat) * PI)
    return dlon, dlat

def wgs84_to_gcj02(lon, lat):
    dlon, dlat = _delta(lon - 105.0, lat - 35.0)
    return lon + dlon, lat + dlat

# ---------- Main ----------
print(f"Reading: {INPUT_SHP}")
gdf = gpd.read_file(INPUT_SHP)
print(f"  Features: {len(gdf):,}")

# Apply GCJ-02 transform to all geometries (handles all Shapely types)
gdf.geometry = gdf.geometry.apply(
    lambda geom: shapely_transform(lambda x, y, z=None: wgs84_to_gcj02(x, y), geom)
)

print(f"Writing: {OUTPUT_SHP}")
gdf.to_file(OUTPUT_SHP, encoding='utf-8')

import os
total = sum(os.path.getsize(str(f)) / 1e6 for f in Path(OUTPUT_SHP).parent.glob(Path(OUTPUT_SHP).stem + '.*'))
print(f"  Total: {total:.1f} MB")
print("Done. Feed this GCJ-02 shapefile into CesiumLab for Gaode-aligned 3DTiles.")
