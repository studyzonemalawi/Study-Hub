
import { StudyMaterial, Message, User, UserProgress, Testimonial, Announcement, CommunityMessage, ChatRoom, ReadingStatus, Exam, ExamResult, EducationLevel, Grade, Category } from '../types';
import { supabase } from './supabase';

const MATERIALS_KEY = 'study_hub_materials';
const MESSAGES_KEY = 'study_hub_messages';
const COMMUNITY_MESSAGES_KEY = 'study_hub_community_messages';
const USERS_KEY = 'study_hub_users';
const PROGRESS_KEY = 'study_hub_progress';
const TESTIMONIALS_KEY = 'study_hub_testimonials';
const ANNOUNCEMENTS_KEY = 'study_hub_announcements';
const CHAT_ROOMS_KEY = 'study_hub_chat_rooms';
const EXAMS_KEY = 'study_hub_exams';
const EXAM_RESULTS_KEY = 'study_hub_exam_results';
const LAST_SYNC_KEY = 'study_hub_last_sync';

const SEED_MATERIALS: StudyMaterial[] = [
  {
    id: 'jce-social-studies-holly',
    title: 'JCE Social Studies (Forms 1 & 2)',
    level: EducationLevel.SECONDARY,
    grade: 'Form 2' as Grade,
    category: Category.BOOKS,
    subject: 'Social Studies',
    fileUrl: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf', // Using a reliable sample PDF for the readable format requirement
    fileName: 'JCE_Social_Studies_Holly.pdf',
    uploadedAt: new Date().toISOString()
  }
];

const DEFAULT_ROOMS: ChatRoom[] = [
  { id: 'difficult-topics', title: 'Understanding difficult topics', description: 'Break down complex concepts with your peers.', icon: '🧠', activeUsers: 156 },
  { id: 'homework-help', title: 'Homework Help', description: 'Stuck on a problem? Ask the community for a hand.', icon: '📚', activeUsers: 203 },
  { id: 'exam-talk', title: 'Exam Talk/Question & Answer', description: 'Strategies, past paper discussions, and exam tips.', icon: '📝', activeUsers: 342 },
  { id: 'wellbeing', title: 'Student Life & Wellbeing', description: 'Balance, mental health, and life as a student in Malawi.', icon: '🌱', activeUsers: 89 },
  { id: 'careers', title: 'Careers & Life After School', description: 'Discuss university choices, jobs, and future paths.', icon: '🚀', activeUsers: 124 },
  { id: 'general-chat', title: 'General chat', description: 'Casual conversation and connecting with other students.', icon: '💬', activeUsers: 412 }
];

export const storage = {
  getMaterials: (): StudyMaterial[] => {
    const data = localStorage.getItem(MATERIALS_KEY);
    const materials = data ? JSON.parse(data) : [];
    
    // Seed logic: If empty or missing the new JCE book, add it
    if (materials.length === 0 || !materials.some((m: any) => m.id === 'jce-social-studies-holly')) {
      const combined = [...materials, ...SEED_MATERIALS];
      localStorage.setItem(MATERIALS_KEY, JSON.stringify(combined));
      return combined;
    }
    return materials;
  },
  
  saveMaterial: async (material: StudyMaterial) => {
    const materials = storage.getMaterials();
    materials.push(material);
    localStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
    
    if (navigator.onLine) {
      try {
        await supabase.from('materials').upsert({
          id: material.id,
          title: material.title,
          level: material.level,
          grade: material.grade,
          category: material.category,
          subject: material.subject,
          file_url: material.fileUrl,
          file_name: material.fileName,
          uploaded_at: material.uploadedAt
        });
      } catch (e) {
        console.warn("Cloud sync deferred", e);
      }
    }
  },

  deleteMaterial: async (id: string) => {
    const materials = storage.getMaterials().filter(m => m.id !== id);
    localStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
    if (navigator.onLine) {
      await supabase.from('materials').delete().eq('id', id);
    }
  },

  getMessages: (): Message[] => {
    const data = localStorage.getItem(MESSAGES_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveMessage: (msg: Message) => {
    const messages = storage.getMessages();
    messages.push(msg);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  },

  getCommunityMessages: (roomId: string): CommunityMessage[] => {
    const data = localStorage.getItem(COMMUNITY_MESSAGES_KEY);
    const all = data ? JSON.parse(data) : [];
    return all.filter((m: CommunityMessage) => m.roomId === roomId);
  },

  saveCommunityMessage: (msg: CommunityMessage) => {
    const data = localStorage.getItem(COMMUNITY_MESSAGES_KEY);
    const all = data ? JSON.parse(data) : [];
    all.push(msg);
    localStorage.setItem(COMMUNITY_MESSAGES_KEY, JSON.stringify(all));
  },

  getChatRooms: (): ChatRoom[] => {
    const data = localStorage.getItem(CHAT_ROOMS_KEY);
    if (!data) {
      localStorage.setItem(CHAT_ROOMS_KEY, JSON.stringify(DEFAULT_ROOMS));
      return DEFAULT_ROOMS;
    }
    return JSON.parse(data);
  },

  saveChatRoom: (room: ChatRoom) => {
    const rooms = storage.getChatRooms();
    rooms.push(room);
    localStorage.setItem(CHAT_ROOMS_KEY, JSON.stringify(rooms));
  },

  getUsers: (): User[] => {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveUser: (user: User) => {
    const users = storage.getUsers();
    const existingIndex = users.findIndex(u => u.id === user.id);
    if (existingIndex === -1) {
      users.push(user);
    } else {
      users[existingIndex] = user;
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  updateUser: (updatedUser: User) => {
    const users = storage.getUsers();
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      users[index] = updatedUser;
    } else {
      users.push(updatedUser);
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    const session = localStorage.getItem('study_hub_session');
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed.id === updatedUser.id) {
        localStorage.setItem('study_hub_session', JSON.stringify(updatedUser));
      }
    }
  },

  deleteUser: (userId: string) => {
    const users = storage.getUsers().filter(u => u.id !== userId);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  getUserFromCloud: async (userId: string): Promise<Partial<User> | null> => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error) return null;
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        district: data.district,
        schoolName: data.school_name,
        currentGrade: data.grade,
        accountRole: data.role,
        bio: data.bio,
        isProfileComplete: !!data.name && !!data.district
      };
    } catch (e) {
      return null;
    }
  },

  getAllProgress: (): Record<string, UserProgress[]> => {
    const data = localStorage.getItem(PROGRESS_KEY);
    return data ? JSON.parse(data) : {};
  },

  getUserProgress: (userId: string): UserProgress[] => {
    const all = storage.getAllProgress();
    return all[userId] || [];
  },

  updateProgress: (userId: string, progress: UserProgress) => {
    const all = storage.getAllProgress();
    if (!all[userId]) all[userId] = [];
    const index = all[userId].findIndex(p => p.materialId === progress.materialId);
    if (index !== -1) {
      all[userId][index] = { ...all[userId][index], ...progress };
    } else {
      all[userId].push(progress);
    }
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  },

  recordDownload: (userId: string, materialId: string) => {
    const users = storage.getUsers();
    const user = users.find(u => u.id === userId);
    if (user && !user.downloadedIds.includes(materialId)) {
      user.downloadedIds.push(materialId);
      storage.updateUser(user);
    }
  },

  removeDownload: (userId: string, materialId: string) => {
    const users = storage.getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
      user.downloadedIds = user.downloadedIds.filter(id => id !== materialId);
      storage.updateUser(user);
    }
  },

  getAnnouncements: (): Announcement[] => {
    const data = localStorage.getItem(ANNOUNCEMENTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveAnnouncement: async (announcement: Announcement) => {
    const announcements = storage.getAnnouncements();
    announcements.unshift(announcement);
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(announcements));
    
    if (navigator.onLine) {
      try {
        await supabase.from('announcements').upsert({
          id: announcement.id,
          title: announcement.title,
          content: announcement.content,
          priority: announcement.priority,
          timestamp: announcement.timestamp
        });
      } catch (e) {
        console.warn("Announcement sync deferred", e);
      }
    }
  },

  deleteAnnouncement: async (id: string) => {
    const announcements = storage.getAnnouncements().filter(a => a.id !== id);
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(announcements));
    if (navigator.onLine) {
      await supabase.from('announcements').delete().eq('id', id);
    }
  },

  getTestimonials: (): Testimonial[] => {
    const data = localStorage.getItem(TESTIMONIALS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveTestimonial: (testimonial: Testimonial) => {
    const testimonials = storage.getTestimonials();
    testimonials.unshift(testimonial);
    localStorage.setItem(TESTIMONIALS_KEY, JSON.stringify(testimonials));
  },

  // Exam Methods
  getExams: (): Exam[] => {
    const data = localStorage.getItem(EXAMS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveExam: (exam: Exam) => {
    const exams = storage.getExams();
    exams.unshift(exam);
    localStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
  },

  deleteExam: (examId: string) => {
    const exams = storage.getExams().filter(e => e.id !== examId);
    localStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
  },

  getExamResults: (userId: string): ExamResult[] => {
    const data = localStorage.getItem(EXAM_RESULTS_KEY);
    const all = data ? JSON.parse(data) : [];
    return all.filter((r: ExamResult) => r.userId === userId);
  },

  saveExamResult: (result: ExamResult) => {
    const data = localStorage.getItem(EXAM_RESULTS_KEY);
    const all = data ? JSON.parse(data) : [];
    all.unshift(result);
    localStorage.setItem(EXAM_RESULTS_KEY, JSON.stringify(all));
  },

  syncWithServer: async (userId: string) => {
    if (!navigator.onLine) return { success: false, timestamp: null };

    try {
      const users = storage.getUsers();
      const user = users.find(u => u.id === userId);
      
      if (user && user.isProfileComplete) {
        await supabase.from('profiles').upsert({
          id: user.id,
          name: user.name,
          email: user.email,
          district: user.district,
          school_name: user.schoolName,
          grade: user.currentGrade,
          role: user.accountRole,
          bio: user.bio,
          updated_at: new Date().toISOString()
        });
      }

      const userProgress = storage.getUserProgress(userId);
      if (userProgress.length > 0) {
        await supabase.from('user_progress').upsert(
          userProgress.map(p => ({
            user_id: userId,
            material_id: p.materialId,
            status: p.status,
            progress_percent: p.progressPercent,
            last_read: p.lastRead
          }))
        );
      }

      const [materialsRes, annRes, progRes] = await Promise.all([
        supabase.from('materials').select('*'),
        supabase.from('announcements').select('*').order('timestamp', { ascending: false }),
        supabase.from('user_progress').select('*').eq('user_id', userId)
      ]);

      if (materialsRes.data) {
        const localMaterials: StudyMaterial[] = materialsRes.data.map(rm => ({
          id: rm.id,
          title: rm.title,
          level: rm.level,
          grade: rm.grade,
          category: rm.category,
          subject: rm.subject,
          fileUrl: rm.file_url,
          fileName: rm.file_name,
          uploadedAt: rm.uploaded_at
        }));
        localStorage.setItem(MATERIALS_KEY, JSON.stringify(localMaterials));
      }

      if (annRes.data) {
        localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(annRes.data));
      }

      if (progRes.data) {
        const cloudProgress: UserProgress[] = progRes.data.map(rp => ({
          materialId: rp.material_id,
          status: rp.status as ReadingStatus,
          progressPercent: rp.progress_percent,
          lastRead: rp.last_read
        }));
        const allProgress = storage.getAllProgress();
        allProgress[userId] = cloudProgress;
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(allProgress));
      }

      const syncTimestamp = new Date().toISOString();
      localStorage.setItem(LAST_SYNC_KEY, syncTimestamp);
      return { success: true, timestamp: syncTimestamp };
    } catch (err) {
      console.error("[Sync] Error:", err);
      return { success: false, timestamp: null };
    }
  }
};
