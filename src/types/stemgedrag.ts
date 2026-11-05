export type MotionType = "eigen" | "mede-indiener" | "regulier";
export type VoteType = "voor" | "tegen" | "ingetrokken-toezegging";
export type MotionCategory = "motie" | "voorstel" | "amendement";

export interface StemgedragItem {
  id: string;
  title: string;
  category?: MotionCategory; // "motie" | "voorstel" | "amendement"
  motionType: MotionType; // "eigen" | "mede-indiener" | "regulier"
  vote: VoteType; // "voor" | "tegen" | "ingetrokken-toezegging"
  description: string; // maximaal 600 tekens
  date: string;
  raadsvergadering?: string;
  resultaat?: string; // bijv. "Aangenomen", "Verworpen", "Ingetrokken i.v.m. toezegging"
  imageUrl?: string;
  pdfUrl?: string;
  pdfFileName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PrimaryFilter =
  | "alle-stemmingen"
  | "alle-moties"
  | "eigen-moties"
  | "alle-amendementen"
  | "eigen-amendementen"
  | "eigen-moties-en-amendementen"
  | "mede-indiener";

export type VoteFilter = "all" | "voor" | "tegen" | "ingetrokken-toezegging";

export type StemgedragFilter =
  | "all"
  | "eigen"
  | "mede-indiener"
  | "tegen"
  | "voor"
  | "ingetrokken-toezegging"
  | "motie"
  | "voorstel"
  | "amendement"
  | PrimaryFilter;


