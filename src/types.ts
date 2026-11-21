export interface ChapterRef {
  id: string;
  short: string;
  title: string;
  file: string;
  questions: number;
}

export interface Manifest {
  title: string;
  source: string;
  chapters: ChapterRef[];
}

export type Letter = 'A' | 'B' | 'C' | 'D';

export interface Question {
  n: number;
  text: string;
  options: { letter: Letter; text: string }[];
  answer: Letter;
  explanation: string;
}

export interface Chapter {
  id: string;
  title: string;
  short: string;
  contentMd: string;
  quiz: { title: string; questions: Question[] } | null;
}
