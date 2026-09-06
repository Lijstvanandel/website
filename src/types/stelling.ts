export type StellingType = "swipe" | "scale"; // swipe = Eens / Oneens, scale = 1 t/m 10

export interface QrLocation {
  id: string;
  name: string; // bijv. "Skatebaan Steenwijk" of "WC Café De Markt"
  slug: string; // bijv. "skatebaan-steenwijk"
  stickerText: string; // bijv. "Geef je mening tijdens het skaten" of "Geef je mening tijdens de natuurlijke behoefte"
  description?: string;
  address?: string;
  createdAt: string;
}

export interface StellingItem {
  id: string;
  title: string;
  category?: string;
  description?: string;
  imageUrl: string;
  type: StellingType; // "swipe" of "scale"
  scaleMinLabel?: string; // bijv. "1 (Helemaal oneens)"
  scaleMaxLabel?: string; // bijv. "10 (Volledig mee eens)"
  startDate?: string; // YYYY-MM-DD (vanaf wanneer zichtbaar)
  deadlineDate?: string; // YYYY-MM-DD (tot wanneer zichtbaar)
  maxParticipants?: number; // Maximaal aantal respondenten (bijv. 100)
  targetLocations?: string[]; // Array of qrLocation IDs waar deze stelling getoond mag worden (leeg = overal / algemeen)
  showInPwaAndApp?: boolean; // Altijd tonen in PWA en na login (standaard true)
  active: boolean;
  createdAt: string;
  createdBy?: string;
  totalAnswers?: number;
  isOpen?: boolean;
}

export interface StellingAnswer {
  stellingId: string;
  type: StellingType;
  value: "eens" | "oneens" | number; // "eens" | "oneens" | 1..10
  answeredAt: string;
}

export interface StellingSubmission {
  id: string;
  userId?: string;
  username?: string;
  fullName?: string;
  city?: string;
  isAnonymous?: boolean; // true wanneer benaderd via QR-locatie
  qrLocationId?: string; // id van de QR-code sticker locatie
  qrLocationName?: string; // naam van de sticker locatie
  answers: StellingAnswer[];
  generalFeedback?: string; // Eindopmerking voor fractievergadering
  submittedAt: string;
  isPWA?: boolean;
}

export interface StellingStats {
  totalSubmissions: number;
  totalParticipants: number;
  totalAnonymous: number;
  perLocationCount: Record<string, number>;
  perStelling: Record<
    string,
    {
      title: string;
      type: "swipe" | "scale";
      totalResponses: number;
      eensCount?: number;
      oneensCount?: number;
      eensPercentage?: number;
      oneensPercentage?: number;
      scaleDistribution?: Record<number, number>;
      scaleAverage?: number;
      isNotStartedYet?: boolean;
      isDeadlinePassed?: boolean;
      isMaxReached?: boolean;
      isOpen: boolean;
      locationBreakdown?: Record<string, { total: number; eens?: number; oneens?: number; avgScale?: number }>;
    }
  >;
  remarks: Array<{
    id?: string;
    userId?: string;
    fullName?: string;
    city?: string;
    isAnonymous?: boolean;
    qrLocationName?: string;
    generalFeedback: string;
    submittedAt: string;
    isPWA?: boolean;
  }>;
}
