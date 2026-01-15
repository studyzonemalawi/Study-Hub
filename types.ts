
export enum EducationLevel {
  PRIMARY = 'Primary',
  SECONDARY = 'Secondary'
}

export enum Category {
  NOTES = 'Notes',
  BOOKS = 'Books',
  PAST_PAPERS = 'Past Papers & Exams'
}

export enum ReadingStatus {
  NOT_STARTED = 'Not Started',
  READING = 'Reading',
  COMPLETED = 'Completed'
}

export enum AccountRole {
  STUDENT = 'Student',
  TEACHER = 'Teacher',
  PARENT = 'Parent',
  GUARDIAN = 'Guardian'
}

export type Grade = 'Standard 5' | 'Standard 6' | 'Standard 7' | 'Standard 8' | 'Form 1' | 'Form 2' | 'Form 3' | 'Form 4';

export type ProfileGrade = Grade | 'Prefer not to say' | 'Not Studying' | 'Other';

export interface StudyMaterial {
  id: string;
  title: string;
  level: EducationLevel;
  grade: Grade;
  category: Category;
  subject: string;
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
}

export interface UserProgress {
  materialId: string;
  status: ReadingStatus;
  lastRead: string;
  progressPercent: number;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  isAdmin: boolean;
}

export interface ChatRoom {
  id: string;
  title: string;
  description: string;
  icon: string;
  activeUsers: number;
}

export interface CommunityMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  imageUrl?: string;
  audioUrl?: string;
  timestamp: string;
  isOfficial?: boolean;
}

export interface Testimonial {
  id: string;
  userId: string;
  userName: string;
  userProfilePic: string;
  userRole: string;
  content: string;
  rating: number;
  timestamp: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  timestamp: string;
  priority: 'normal' | 'urgent' | 'important';
}

export interface ExamQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface Exam {
  id: string;
  title: string;
  level: EducationLevel;
  grade: Grade;
  subject: string;
  questions: ExamQuestion[];
  createdAt: string;
  createdBy: string;
}

export interface ExamResult {
  examId: string;
  userId: string;
  score: number;
  totalQuestions: number;
  answers: Record<string, string>;
  feedback: Record<string, { isCorrect: boolean; tip: string; correctAnswer: string }>;
  completedAt: string;
}

export interface User {
  id: string;
  email: string;
  password?: string;
  authProvider: 'email';
  appRole: 'user' | 'admin';
  name: string;
  age?: number;
  accountRole?: AccountRole;
  isProfileComplete?: boolean;
  district?: string;
  reason?: string;
  schoolName?: string;
  currentGrade?: ProfileGrade;
  bio?: string;
  profilePic?: string;
  termsAccepted?: boolean;
  isPublic?: boolean;
  dateJoined: string;
  lastLogin: string;
  downloadedIds: string[];
  favoriteIds: string[];
}

export const PRIMARY_SUBJECTS = [
  'English', 'Chichewa', 'Mathematics', 'Expressive Arts', 
  'Life Skills', 'Social Studies', 'Science and Technology', 
  'Agriculture', 'Bible knowledge'
];

export const SECONDARY_SUBJECTS = [
  'English Language', 'English Literature', 'Physics', 'Chemistry', 
  'Biology', 'Physical Geography', 'Human Geography', 'Chichewa', 
  'Mathematics', 'Life Skills', 'Agriculture', 'History', 
  'Bible knowledge', 'Computer studies', 'Social Studies'
];

export const PRIMARY_GRADES: Grade[] = ['Standard 5', 'Standard 6', 'Standard 7', 'Standard 8'];
export const SECONDARY_GRADES: Grade[] = ['Form 1', 'Form 2', 'Form 3', 'Form 4'];
export const OTHER_GRADE_OPTIONS: ProfileGrade[] = ['Prefer not to say', 'Not Studying', 'Other'];

export const MALAWI_DISTRICTS = [
  'Balaka', 'Blantyre', 'Chikwawa', 'Chiradzulu', 'Chitipa', 'Dedza', 'Dowa', 
  'Karonga', 'Kasungu', 'Likoma', 'Lilongwe', 'Machinga', 'Mangochi', 'Mchinji', 
  'Mulanje', 'Mwanza', 'Mzimba', 'Nkhata Bay', 'Nkhotakota', 'Nsanje', 'Ntcheu', 
  'Ntchisi', 'Phalombe', 'Rumphi', 'Salima', 'Thyolo', 'Zomba'
];

export const JOIN_REASONS = [
  'Examination Preparation',
  'Accessing Textbooks',
  'General Study',
  'Teaching Resources',
  'Other'
];
