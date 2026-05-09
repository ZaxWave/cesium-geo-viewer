import json, os
from collections import defaultdict

terrain_dir = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'terrain_whu')

tiles = defaultdict(lambda: defaultdict(list))
for root, dirs, files in os.walk(terrain_dir):
    for f in files:
        if f.endswith('.terrain'):
            parts = os.path.relpath(os.path.join(root, f), terrain_dir).replace('\\', '/').split('/')
            if len(parts) == 3:
                z, x, y = int(parts[0]), int(parts[1]), int(parts[2].replace('.terrain', ''))
                tiles[z][x].append(y)

available = []
for z in sorted(tiles):
    x_tiles = []
    for x in sorted(tiles[z]):
        ys = sorted(tiles[z][x])
        start = ys[0]; end = ys[0]
        ranges = []
        for y in ys[1:]:
            if y == end + 1:
                end = y
            else:
                ranges.append({'startX': x, 'endX': x, 'startY': start, 'endY': end})
                start = y; end = y
        ranges.append({'startX': x, 'endX': x, 'startY': start, 'endY': end})
        x_tiles.extend(ranges)
    available.append(x_tiles)

layer = {
    'tilejson': '1.0',
    'name': 'WHU Terrain',
    'format': 'quantized-mesh-1.0',
    'version': '1.0.0',
    'tiles': ['{z}/{x}/{y}.terrain'],
    'bounds': [-180, -90, 180, 90],
    'valid_bounds': [114.3473, 30.5261, 114.3598, 30.5369],
    'projection': 'EPSG:4326',
    'minzoom': 0,
    'maxzoom': 17,
    'available': available
}

with open(os.path.join(terrain_dir, 'layer.json'), 'w') as f:
    json.dump(layer, f)
print(f'layer.json updated — {len(available)} zoom levels')
