import lezingImg from "@/assets/markt-steenwijk.jpg";

export interface EventItem {
  id: string;
  title: string;
  shortDescription?: string;
  description: string;
  longDescription?: string;
  date: string; // ISO yyyy-mm-dd
  time?: string;
  startTime?: string;
  endTime?: string;
  address?: string;
  city?: string;
  fullAddress?: string;
  location?: string;
  coords?: [number, number];
  image?: string;
  thumbnailUrl?: string;
  ticketUrl?: string;
  isPublic?: boolean;
  isPublished?: boolean;
  isCancelled?: boolean;
  attendees?: string[];
  isAttending?: boolean;
  ticketCode?: string;
  nonMemberPrice?: number;
  ticketNotes?: string;
  locationHiddenUntil12h?: boolean;
}

export const events: EventItem[] = [
  {
    id: "lezing-electorale-tragedie",
    title: "Lezing: Electorale tragedie van de moderne mens",
    description:
      "Een avond vol scherpe analyse: hoe de moderne kiezer worstelt tussen idealen, instituties en de eigen leefwereld.",
    longDescription:
      "Sammy van Andel neemt u mee in een eigenzinnige beschouwing over de spanning tussen het ideaal van de mondige burger en de werkelijkheid van de stembus. Hoe komt het dat we steeds vaker stemmen tegen in plaats van vóór? Wat betekent dat voor lokale democratie in Steenwijkerland? Na de lezing is er ruime gelegenheid voor vragen en gesprek onder het genot van koffie.",
    date: "2026-06-12",
    time: "20:00 – 22:00",
    location: "Stadhuis, Markt — Steenwijk",
    coords: [52.7873, 6.1196],
    image: lezingImg,
    ticketUrl: "#",
  },
];
