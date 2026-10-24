export type Locale = "fa" | "en";
export type Role = "admin" | "viewer";
export interface Base {
  _id: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}
export interface Person extends Base {
  kind: "teacher" | "supervisor";
  name: string;
  phone: string;
  email: string;
  active: boolean;
}
export interface SchoolClass extends Base {
  number: string;
  name: string;
  teacherId: string;
  supervisorId: string;
  location: string;
  startTime: string | null;
  endTime: string | null;
  legacySchedule?: string;
  studentCount: number;
  startedOn: string | null;
  assignments?: {
    teacherId: string;
    supervisorId: string;
    effectiveOn: string;
  }[];
}
export interface Topic {
  id: string;
  title: string;
  startPage: number;
  endPage: number;
}
export interface Curriculum extends Base {
  name: string;
  pages: number;
  topics: Topic[];
}
export interface Report extends Base {
  classId: string;
  curriculumId: string;
  topicIds: string[];
  lesson: string;
  totalStudents: number;
  present: number;
  reportDate: string | null;
  weekStart: string | null;
  submittedAt: string;
  teacherId: string;
  supervisorId: string;
  className: string;
  teacherName: string;
  supervisorName: string;
  legacy?: { id: number; month: string; week: number; monthWeek: number };
}
export interface Settings {
  _id: string;
  ownerId?: string;
  organization: string;
  timezone: string;
  weekStartsOn: number;
  deadlineDay: number;
  deadlineHour: number;
  rankingWeeks: number;
  weights: { timeliness: number; attendance: number; stability: number };
}
export interface User extends Base {
  username: string;
  passwordHash: string;
  name: string;
  role: Role;
  active: boolean;
}
export interface Session {
  _id: string;
  userId: string;
  expiresAt: Date;
  createdAt: string;
}
export interface Workspace {
  classes: SchoolClass[];
  people: Person[];
  curricula: Curriculum[];
  reports: Report[];
  settings: Settings;
  user: { name: string; username: string; role: Role };
  period: string;
  legacyCount: number;
}
export interface PersonStats {
  person: Person;
  classes: number;
  students: number;
  reports: number;
  expected: number;
  onTime: number;
  attendance: number | null;
  stability: number | null;
  score: number | null;
  weekly: {
    week: string;
    attendance: number | null;
    submitted: number;
    expected: number;
  }[];
}
