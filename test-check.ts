import { getAllDossiers } from "./src/server/dossierManager";
import { getDbFromSqlite } from "./src/server/sqliteDatabase";

const db = getDbFromSqlite();
const dossiers = getAllDossiers(db.customDossiers || [], db.deletedDossierSlugs || [], db.customSubdossiers);
const d = dossiers.find(d => d.slug === "bestuur-financin-en-organisatie");
const sub = d?.subdossiers?.find(s => s.title === "Test Sub");
console.log("Subdossier:", sub);
const doc = d?.documents?.find(doc => doc.bestandsnaam === "2.4 OD - Bijlage bij Gemeenschappelijke Regeling Omgevingsdienst IJsselland.pdf");
console.log("Document subdossier:", doc?.subdossier);
