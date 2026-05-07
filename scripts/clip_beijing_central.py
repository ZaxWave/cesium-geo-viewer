"""
Clip Beijing building shapefile to selected urban area.
Edit the BBOX_NAME below to switch presets:
  - "erhuan"    二环内核心区 (~3-5万栋, 推荐CesiumLab)
  - "sanhuan"   三环内 (~10-15万栋)
  - "liuqu"     城六区 (~44万栋, 较大)
"""
import geopandas as gpd
import os
from pathlib import Path

# --- Config ---
BBOX_NAME = "erhuan"   # 改这里切换区域

INPUT_SHP = r"E:\Desktop\时空大数据平台技术\CesiumProject\data\北京市百度建筑最新\北京市百度建筑最新.shp"
OUTPUT_DIR = Path(r"E:\Desktop\时空大数据平台技术\CesiumProject\data\北京市中心城区建筑")

# Bounding box presets (WGS84)
PRESETS = {
    "erhuan":  (116.32, 39.86, 116.48, 39.97, "二环内核心区"),
    "sanhuan": (116.26, 39.82, 116.52, 40.02, "三环内"),
    "liuqu":   (116.15, 39.75, 116.60, 40.05, "城六区"),
}

MIN_LON, MIN_LAT, MAX_LON, MAX_LAT, AREA_NAME = PRESETS[BBOX_NAME]
OUTPUT_NAME = f"北京市{AREA_NAME}建筑.shp"

def main():
    print(f"Area: {AREA_NAME}  |  BBOX: [{MIN_LON},{MIN_LAT} ~ {MAX_LON},{MAX_LAT}]")
    print(f"Reading: {INPUT_SHP}")
    gdf = gpd.read_file(INPUT_SHP)
    print(f"  Total features: {len(gdf):,}")

    clipped = gdf.cx[MIN_LON:MAX_LON, MIN_LAT:MAX_LAT].copy()
    print(f"  Clipped features: {len(clipped):,} ({len(clipped)/len(gdf)*100:.1f}%)")
    print(f"  Clipped bounds: {clipped.total_bounds}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUTPUT_DIR / OUTPUT_NAME
    clipped.to_file(str(out_path), encoding="utf-8")
    print(f"\nSaved to: {out_path}")

    total_mb = 0
    for f in OUTPUT_DIR.glob(f"{OUTPUT_NAME.split('.')[0]}.*"):
        size_mb = os.path.getsize(f) / (1024 * 1024)
        total_mb += size_mb
        print(f"  {f.name}: {size_mb:.1f} MB")
    print(f"  Total: {total_mb:.1f} MB")
    print(f"\nDone. Use {OUTPUT_NAME} in CesiumLab.")

if __name__ == "__main__":
    main()
