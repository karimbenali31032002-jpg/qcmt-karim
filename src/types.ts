export interface Attachment {
  name: string;
  url: string;
  createdAt: Date | any;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  category?: string;
  qcmCount: number;
  attachments?: Attachment[];
  createdAt: any;
}

export interface QCM {
  id: string;
  courseId?: string;
  context?: string;
  question: string;
  options: string[];
  answerIndices: number[];
  explanation?: string;
  defaultRating?: number;
  sourcePdfUrl?: string;
  sourcePdfName?: string;
  createdAt: any;
}

export interface UserRating {
  id: string;
  userId: string;
  qcmId: string;
  courseId?: string;
  rating: 1 | 2 | 3;
  lastUpdated: any;
}

export type ViewState = 'dashboard' | 'course' | 'session' | 'stats' | 'import';
