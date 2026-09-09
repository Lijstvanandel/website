import json

with open("public/data/raadsstukken_metadata_tussentijds.json", "r", encoding="utf-8") as f:
    items = json.load(f)

nodes = []
edges = []
node_ids = set()

for item in items:
    fn = (item.get("bestandsnaam") or "").strip()
    if not fn:
        continue
    if fn not in node_ids:
        nodes.append({
            "id": fn,
            "label": (item.get("titel") or fn).strip(),
            "group": (item.get("dossier") or "Algemeen").strip(),
            "type": "Raadsstuk",
            "date": item.get("datum")
        })
        node_ids.add(fn)
    
    rels = item.get("relaties") or ""
    if rels:
        # Split by comma
        for r in [x.strip() for x in rels.split(",") if x.strip()]:
            if r not in node_ids:
                nodes.append({
                    "id": r,
                    "label": r,
                    "group": "Referentie",
                    "type": "Relatie",
                    "date": None
                })
                node_ids.add(r)
            edges.append({
                "source": fn,
                "target": r
            })

graph = {
    "nodes": nodes,
    "edges": edges
}

with open("public/data/network_graph.json", "w", encoding="utf-8") as f:
    json.dump(graph, f, ensure_ascii=False, indent=4)

print(f"network_graph.json updated with {len(nodes)} nodes and {len(edges)} edges")
