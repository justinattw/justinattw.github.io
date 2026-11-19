"""Extract OS polygons; requires pyshp==2.3.1. See src/london-os/README.md."""
import json
import sys
from pathlib import Path

import shapefile

root = Path(sys.argv[1])
bounds = (516000, 170000, 542000, 190000)
features = []
inland_water = {
    "79368A1B-1535-427A-AC7A-21DE1BC32E68": "The Serpentine",
    "C35CF86D-6E18-4003-B108-9E5807903B30": "The Long Water",
    "D06E2E80-1390-4BB9-B1EA-743F25FD08DA": "Round Pond",
}
found_inland = set()
for kind, layer, path in [
    ("park", "GreenspaceSite", root / "greenspace/TQ_GreenspaceSite"),
    ("water", "TidalWater", root / "water/TQ_TidalWater"),
    ("water", "SurfaceWater_Area", root / "water/TQ_SurfaceWater_Area"),
]:
    reader = shapefile.Reader(str(path), encoding="cp1252")
    for item in reader.iterShapeRecords():
        left, bottom, right, top = item.shape.bbox
        if right < bounds[0] or left > bounds[2] or top < bounds[1] or bottom > bounds[3]:
            continue
        properties = item.record.as_dict()
        source_id = properties.get("id", properties.get("ID", ""))
        if layer == "SurfaceWater_Area":
            if source_id not in inland_water:
                continue
            found_inland.add(source_id)
        if kind == "park" and properties["function"] != "Public Park Or Garden":
            continue
        name = properties.get("distName1", "")
        if kind == "park" and not name:
            continue
        features.append({
            "kind": kind,
            "name": inland_water[source_id] if layer == "SurfaceWater_Area" else name if kind == "park" else "Thames tidal water",
            "sourceId": source_id,
            "sourceLayer": layer,
            "geometry": item.shape.__geo_interface__,
        })
if found_inland != set(inland_water):
    raise RuntimeError("The reviewed Hyde Park water features are missing from this OS edition.")
json.dump({"bounds": bounds, "features": features}, sys.stdout)
