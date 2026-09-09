import json, csv

# Load current JSON to examine structure
with open("public/data/raadsstukken_metadata_tussentijds.json", "r") as f:
    current_meta = json.load(f)

print("Current metadata count:", len(current_meta))
