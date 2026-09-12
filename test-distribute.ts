import { distributeDocumentsToSubdossier } from "./src/server/dossierManager";
import { getDbFromSqlite, saveDbToSqlite } from "./src/server/sqliteDatabase";

const result = distributeDocumentsToSubdossier(
  "bestuur-financin-en-organisatie",
  "Test Sub",
  ["2.4 OD - Bijlage bij Gemeenschappelijke Regeling Omgevingsdienst IJsselland.pdf"],
  getDbFromSqlite(),
  saveDbToSqlite
);
console.log("Result:", result?.success, result?.distributedCount);
