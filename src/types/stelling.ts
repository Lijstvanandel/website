export type StellingType = "swipe" | "scale"; // swipe = Eens / Oneens, scale = 1 t/m 10

export interface StellingItem {
  id: string;
  title: string;
  category?: string;
  description?: string;
  imageUrl: string;
  type: StellingType; // "swipe" of "scale"
  scaleMinLabel?: string; // bijv. "1 (Helemaal oneens)"
  scaleMaxLabel?: string; // bijv. "10 (Volledig mee eens)"
  deadlineDate?: string; // YYYY-MM-DD
  maxParticipants?: number; // Maximaal aantal respondenten (bijv. 100)
  active: boolean;
  createdAt: string;
  createdBy?: string;
}

export interface StellingAnswer {
  stellingId: string;
  type: StellingType;
  value: "eens" | "oneens" | number; // "eens" | "oneens" | 1..10
  answeredAt: string;
}

export interface StellingSubmission {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  city?: string;
  answers: StellingAnswer[];
  generalFeedback?: string; // Eindopmerking van het lid voor de fractievergadering
  submittedAt: string;
  isPWA?: boolean;
}

export interface StellingStats {
  totalSubmissions: number;
  totalParticipants: number;
  perStelling: Record<
    string,
    {
      totalResponses: number;
      eensCount?: number;
      oneensCount?: number;
      eensPercentage?: number;
      oneensPercentage?: number;
      scaleDistribution?: Record<number, number>;
      scaleAverage?: number;
      isDeadlinePassed?: boolean;
      isMaxReached?: boolean;
      isOpen: boolean;
    }
  >;
  remarks: Array<{
    userId: string;
    fullName: string;
    city?: string;
    generalFeedback: string;
    submittedAt: string;
  }>;
}
