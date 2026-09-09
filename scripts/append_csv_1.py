header = "bestandsnaam;titel;dossier;datum;entiteiten;relaties;wijk_of_kern\n"
with open("public/data/raadsstukken_metadata_tussentijds.csv", "w", encoding="utf-8") as f:
    f.write(header)
print("Header written")
