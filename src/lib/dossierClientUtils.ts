/**
 * Client-side utility functions for dossiers and subdossiers
 */

export function getSubdossierClientThumbnail(
  subTitle?: string,
  hoofddossier?: string,
  fallbackParentThumbnail?: string
): string {
  const clean = (subTitle || "").toLowerCase().trim();

  // Woningbouw & Bouwen
  if (
    clean.includes("woningbouw") ||
    clean.includes("nieuwbouw") ||
    clean.includes("woon") ||
    clean.includes("starterslening") ||
    clean.includes("bouw")
  ) {
    return "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80";
  }
  // Stikstof & Natuur
  if (
    clean.includes("stikstof") ||
    clean.includes("natura") ||
    clean.includes("weerribben") ||
    clean.includes("natuur") ||
    clean.includes("pfas") ||
    clean.includes("landschap")
  ) {
    return "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&auto=format&fit=crop&q=80";
  }
  // Zonne-energie & Zonneparken
  if (clean.includes("zonne") || clean.includes("zonnepark") || clean.includes("zonneweide")) {
    return "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80";
  }
  // Windenergie & Windturbines
  if (clean.includes("wind") || clean.includes("windturbine") || clean.includes("windenergie")) {
    return "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&auto=format&fit=crop&q=80";
  }
  // IceBear, Milieu & Luchtkwaliteit
  if (
    clean.includes("icebear") ||
    clean.includes("lucht") ||
    clean.includes("geur") ||
    clean.includes("emissie") ||
    clean.includes("milieu")
  ) {
    return "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80";
  }
  // Waterbeheer, Watertoets & Hemelwater
  if (
    clean.includes("water") ||
    clean.includes("watertoets") ||
    clean.includes("geohydrologie") ||
    clean.includes("hemelwater")
  ) {
    return "https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=800&auto=format&fit=crop&q=80";
  }
  // Verkeer, Infrastructuur & Wegen
  if (
    clean.includes("verkeer") ||
    clean.includes("weg") ||
    clean.includes("infrastructuur") ||
    clean.includes("rondweg") ||
    clean.includes("mobiliteit") ||
    clean.includes("vervoer")
  ) {
    return "https://images.unsplash.com/photo-1519817650390-64a93db51149?w=800&auto=format&fit=crop&q=80";
  }
  // Jeugdhulp, RSJ & Jeugdzorg
  if (
    clean.includes("jeugd") ||
    clean.includes("kind") ||
    clean.includes("rsj") ||
    clean.includes("gezin") ||
    clean.includes("onderwijs") ||
    clean.includes("leerling")
  ) {
    return "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&auto=format&fit=crop&q=80";
  }
  // Cultuur, Museum, De Meenthe & Theater
  if (
    clean.includes("museum") ||
    clean.includes("meenthe") ||
    clean.includes("theater") ||
    clean.includes("cultuur") ||
    clean.includes("kunst") ||
    clean.includes("monument") ||
    clean.includes("bibliotheek")
  ) {
    return "https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=800&auto=format&fit=crop&q=80";
  }
  // Archief & Historie
  if (
    clean.includes("archief") ||
    clean.includes("historisch") ||
    clean.includes("collectie overijssel") ||
    clean.includes("hco")
  ) {
    return "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80";
  }
  // Gezondheid, GGD, SPUK & Zorg
  if (
    clean.includes("gezondheid") ||
    clean.includes("ggd") ||
    clean.includes("zorg") ||
    clean.includes("wmo") ||
    clean.includes("preventie") ||
    clean.includes("huiselijk geweld")
  ) {
    return "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80";
  }
  // Armoede, Schuldhulp, Participatiewet & Werk
  if (
    clean.includes("armoede") ||
    clean.includes("schuld") ||
    clean.includes("inkomen") ||
    clean.includes("participatiewet") ||
    clean.includes("werk")
  ) {
    return "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&auto=format&fit=crop&q=80";
  }
  // Brandweer, Veiligheid, APV & Handhaving
  if (
    clean.includes("brandweer") ||
    clean.includes("veiligheid") ||
    clean.includes("handhaving") ||
    clean.includes("crisis") ||
    clean.includes("politie")
  ) {
    return "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&auto=format&fit=crop&q=80";
  }
  // Gemeenschappelijke Regelingen (GR), Omgevingsdienst & Zienswijze
  if (
    clean.includes("gemeenschappelijke regeling") ||
    clean.includes("gr") ||
    clean.includes("omgevingsdienst") ||
    clean.includes("zienswijze") ||
    clean.includes("veiligheidsregio")
  ) {
    return "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80";
  }
  // Stadsvisie, Gebiedsontwikkeling & Ruimtelijke Ordening
  if (
    clean.includes("stadsvisie") ||
    clean.includes("gebiedsontwikkeling") ||
    clean.includes("ruimtelijk") ||
    clean.includes("bestemming") ||
    clean.includes("omgevingsplan") ||
    clean.includes("omgevingswet")
  ) {
    return "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop&q=80";
  }
  // Openbare Ruimte, Groen, Parkeren & Verlichting
  if (
    clean.includes("openbare ruimte") ||
    clean.includes("verlichting") ||
    clean.includes("groen") ||
    clean.includes("parkeren") ||
    clean.includes("pacht") ||
    clean.includes("onderhoud")
  ) {
    return "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=800&auto=format&fit=crop&q=80";
  }
  // Toerisme, Recreatie, Woonschepen & Waterwegen
  if (
    clean.includes("recreatie") ||
    clean.includes("toerisme") ||
    clean.includes("schip") ||
    clean.includes("woonschip") ||
    clean.includes("ligplaats")
  ) {
    return "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=800&auto=format&fit=crop&q=80";
  }
  // Begroting, Belasting, Jaarstukken & Financiën
  if (
    clean.includes("begroting") ||
    clean.includes("financi") ||
    clean.includes("subsidie") ||
    clean.includes("tarief") ||
    clean.includes("kostenverhaal") ||
    clean.includes("belasting")
  ) {
    return "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80";
  }
  // Samenleving, Inclusie, Asiel & Participatie
  if (
    clean.includes("samenleving") ||
    clean.includes("inclusie") ||
    clean.includes("asiel") ||
    clean.includes("participatie") ||
    clean.includes("wijk")
  ) {
    return "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&auto=format&fit=crop&q=80";
  }

  if (fallbackParentThumbnail) {
    return fallbackParentThumbnail;
  }
  return "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80";
}
