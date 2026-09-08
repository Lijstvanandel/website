const fs = require('fs');
const path = require('path');

const part1 = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/metadata_part1.json'), 'utf8'));
const part2 = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/metadata_part2.json'), 'utf8'));
const part3 = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/metadata_part3.json'), 'utf8'));

const allMetadata = [...part1, ...part2, ...part3];

const targetDir = path.join(process.cwd(), 'public/data');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Write combined metadata file
fs.writeFileSync(
  path.join(targetDir, 'raadsstukken_metadata_tussentijds.json'),
  JSON.stringify(allMetadata, null, 2)
);
fs.writeFileSync(
  path.join(process.cwd(), 'src/data/raadsstukken_metadata_tussentijds.json'),
  JSON.stringify(allMetadata, null, 2)
);

// Build nodes and edges for network_graph.json
const nodesMap = new Map();
const edges = [];

allMetadata.forEach((item) => {
  // Document node
  if (!nodesMap.has(item.bestandsnaam)) {
    nodesMap.set(item.bestandsnaam, {
      id: item.bestandsnaam,
      label: item.titel,
      group: item.dossier,
      type: "Raadsstuk",
      date: item.datum || null
    });
  }

  // Relations
  if (item.relaties && typeof item.relaties === 'string') {
    const rels = item.relaties.split(',').map(r => r.trim()).filter(Boolean);
    rels.forEach((rel) => {
      if (!nodesMap.has(rel)) {
        nodesMap.set(rel, {
          id: rel,
          label: rel,
          group: "Referentie",
          type: "Relatie",
          date: null
        });
      }
      edges.push({
        source: item.bestandsnaam,
        target: rel
      });
    });
  }
});

const networkGraph = {
  nodes: Array.from(nodesMap.values()),
  edges: edges
};

fs.writeFileSync(
  path.join(targetDir, 'network_graph.json'),
  JSON.stringify(networkGraph, null, 2)
);
fs.writeFileSync(
  path.join(process.cwd(), 'src/data/network_graph.json'),
  JSON.stringify(networkGraph, null, 2)
);

console.log(`Merged ${allMetadata.length} items. Created graph with ${networkGraph.nodes.length} nodes and ${networkGraph.edges.length} edges.`);
