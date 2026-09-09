import csv
import json

def parse(csv_file, json_file):
    items = []
    with open(csv_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            d = {
                "bestandsnaam": (row.get("bestandsnaam") or "").strip(),
                "titel": (row.get("titel") or "").strip(),
                "dossier": (row.get("dossier") or "").strip(),
                "datum": (row.get("datum") or "").strip() or None,
                "entiteiten": (row.get("entiteiten") or "").strip(),
                "relaties": (row.get("relaties") or "").strip(),
            }
            wijk = (row.get("wijk_of_kern") or "").strip()
            if wijk:
                d["wijk_of_kern"] = wijk
            items.append(d)
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    print(f"Parsed {len(items)} items into {json_file}")

if __name__ == "__main__":
    parse("public/data/raadsstukken_metadata_tussentijds.csv", "public/data/raadsstukken_metadata_tussentijds.json")
