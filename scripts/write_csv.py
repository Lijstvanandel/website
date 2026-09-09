import json

with open("public/data/raadsstukken_metadata_tussentijds.json", "r", encoding="utf-8") as f:
    items = json.load(f)

with open("public/data/raadsstukken_metadata_tussentijds.csv", "w", encoding="utf-8") as f:
    f.write("bestandsnaam;titel;dossier;datum;entiteiten;relaties;wijk_of_kern\n")
    for item in items:
        fn = item.get("bestandsnaam", "")
        tit = item.get("titel", "")
        dos = item.get("dossier", "")
        dat = item.get("datum") or ""
        ent = item.get("entiteiten", "")
        rel = item.get("relaties", "")
        f.write(f"{fn};{tit};{dos};{dat};{ent};{rel};\n")

print(f"Base CSV written: {len(items)} rows")
