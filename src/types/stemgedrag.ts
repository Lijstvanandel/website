export type MotionType = "eigen" | "mede-indiener" | "regulier";
export type VoteType = "voor" | "tegen";
export type MotionCategory = "motie" | "voorstel" | "amendement";

export interface StemgedragItem {
  id: string;
  title: string;
  category?: MotionCategory; // "motie" | "voorstel" | "amendement"
  motionType: MotionType; // "eigen" | "mede-indiener" | "regulier"
  vote: VoteType; // "voor" | "tegen"
  description: string; // maximaal 600 tekens
  date: string;
  raadsvergadering?: string;
  resultaat?: string; // bijv. "Aangenomen", "Verworpen", "Ingetrokken"
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
  | "mede-indiener";

export type VoteFilter = "all" | "voor" | "tegen";

export type StemgedragFilter =
  | "all"
  | "eigen"
  | "mede-indiener"
  | "tegen"
  | "voor"
  | "motie"
  | "voorstel"
  | "amendement"
  | PrimaryFilter;

