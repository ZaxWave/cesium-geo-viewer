"""
Clip Beijing building shapefile to central urban area.
Central area covers: 东城, 西城, 朝阳, 海淀, 丰台, 石景山
Approx bounds (WGS84): 116.15-116.60°E, 39.75-40.05°N
"""
import geopandas as gpd
import os
from pathlib import Path

# --- Config ---
INPUT_SHP = r"E:\Desktop\时空大数据平台技术\CesiumProject\data\北京市百度建筑最新\北京市百度建筑最新.shp"
OUTPUT_DIR = Path(r"E:\Desktop\时空大数据平台技术\CesiumProject\data\北京市中心城区建筑")
OUTPUT_NAME = "北京市中心城区建筑.shp"

# Beijing central urban area bounding box (WGS84)
# Covers 东城/西城/朝阳/海淀/丰台/石景山 core areas
MIN_LON, MIN_LAT = 116.15, 39.75
MAX_LON, MAX_LAT = 116.60, 40.05

def main():
    print(f"Reading: {INPUT_SHP}")
    gdf = gpd.read_file(INPUT_SHP)
    print(f"  Total features: {len(gdf):,}")
    print(f"  Total bounds: {gdf.total_bounds}")

    # Bounding box filter using spatial index (fast)
    clipped = gdf.cx[MIN_LON:MAX_LON, MIN_LAT:MAX_LAT].copy()
    print(f"  Clipped features: {len(clipped):,} ({len(clipped)/len(gdf)*100:.1f}%)")
    print(f"  Clipped bounds: {clipped.total_bounds}")

    # Save
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUTPUT_DIR / OUTPUT_NAME
    clipped.to_file(str(out_path), encoding="utf-8")
    print(f"\nSaved to: {out_path}")

    # Show file sizes
    for f in OUTPUT_DIR.glob(f"{OUTPUT_NAME.split('.')[0]}.*"):
        size_mb = os.path.getsize(f) / (1024 * 1024)
        print(f"  {f.name}: {size_mb:.1f} MB")

    print("\nDone. Use this smaller file in CesiumLab.")

if __name__ == "__main__":
    main()
