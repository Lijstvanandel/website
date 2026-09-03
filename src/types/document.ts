export interface MemberDocument {
  id: string;
  title: string;
  description: string;
  category: string;
  confidentiality: string;
  date: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  pageCount?: number;
  content?: string;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
}
