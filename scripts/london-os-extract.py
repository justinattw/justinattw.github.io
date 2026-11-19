"""Extract OS polygons; requires pyshp==2.3.1. See src/london-os/README.md."""
import json
import sys
from pathlib import Path

import shapefile

root = Path(sys.argv[1])
bounds = (516000, 170000, 542000, 190000)
features = []
for kind, path in [
    ("park", root / "greenspace/TQ_GreenspaceSite"),
    ("water", root / "water/TQ_TidalWater"),
]:
    reader = shapefile.Reader(str(path), encoding="cp1252")
    for item in reader.iterShapeRecords():
        left, bottom, right, top = item.shape.bbox
        if right < bounds[0] or left > bounds[2] or top < bounds[1] or bottom > bounds[3]:
            continue
        properties = item.record.as_dict()
        if kind == "park" and properties["function"] != "Public Park Or Garden":
            continue
        name = properties.get("distName1", "")
        if kind == "park" and not name:
            continue
        features.append({
            "kind": kind,
            "name": name if kind == "park" else "Thames tidal water",
            "sourceId": properties.get("id", ""),
            "geometry": item.shape.__geo_interface__,
        })
json.dump({"bounds": bounds, "features": features}, sys.stdout)
