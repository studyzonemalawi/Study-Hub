
import { StudyMaterial, User, UserProgress, Announcement, ChatRoom, ReadingStatus, Exam, ExamResult, EducationLevel, Grade, Category } from '../types';
import { supabase } from './supabase';

const MATERIALS_KEY = 'study_hub_materials';
const MESSAGES_KEY = 'study_hub_messages';
const COMMUNITY_MESSAGES_KEY = 'study_hub_community_messages';
const USERS_KEY = 'study_hub_users';
const PROGRESS_KEY = 'study_hub_progress';
const ANNOUNCEMENTS_KEY = 'study_hub_announcements';
const CHAT_ROOMS_KEY = 'study_hub_chat_rooms';
const EXAMS_KEY = 'study_hub_exams';
const EXAM_RESULTS_KEY = 'study_hub_exam_results';

const CHEMISTRY_NOTES_ID = 'chem-f1-notes-001';

const DEFAULT_ROOMS: ChatRoom[] = [
  { id: 'general-chat', title: 'General chat', description: 'Casual conversation and connecting with other students.', icon: '💬', activeUsers: 0 },
  { id: 'exam-talk', title: 'Exam Prep', description: 'Strategies and past paper discussions.', icon: '📝', activeUsers: 0 }
];

const SEED_MATERIAL: StudyMaterial = {
  id: CHEMISTRY_NOTES_ID,
  title: "Complete Form One Chemistry Notes",
  level: EducationLevel.SECONDARY,
  grade: "Form 1" as Grade,
  category: Category.NOTES,
  subject: "Chemistry",
  fileUrl: "https://vkykmbxpdmvvdtmciolo.supabase.co/storage/v1/object/public/materials/chemistry_f1_notes.pdf",
  fileName: "chemistry_f1_notes.pdf",
  uploadedAt: "2024-01-01T00:00:00.000Z"
};

export const storage = {
  // --- MATERIALS ---
  getMaterials: (): StudyMaterial[] => {
    const data = localStorage.getItem(MATERIALS_KEY);
    let materials: StudyMaterial[] = data ? JSON.parse(data) : [];
    
    // Ensure the seed material exists
    if (!materials.find(m => m.id === CHEMISTRY_NOTES_ID)) {
      materials = [SEED_MATERIAL, ...materials];
      localStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
    }
    
    return materials;
  },
  
  saveMaterial: async (material: StudyMaterial) => {
    const materials = storage.getMaterials();
    if (!materials.find(m => m.id === material.id)) {
      materials.push(material);
      localStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
    }
    
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
      } catch (e) { console.warn("Cloud material save failed", e); }
    }
  },

  fetchGlobalMaterials: async () => {
    if (!navigator.onLine) return;
    try {
      const { data, error } = await supabase.from('materials').select('*');
      if (error) throw error;
      if (data) {
        const mapped: StudyMaterial[] = data.map(m => ({
          id: m.id,
          title: m.title,
          level: m.level as EducationLevel,
          grade: m.grade as Grade,
          category: m.category as Category,
          subject: m.subject,
          fileUrl: m.file_url,
          fileName: m.file_name,
          uploadedAt: m.uploaded_at
        }));
        
        // Ensure seed material is still there even after fetch
        const final = [...mapped];
        if (!final.find(x => x.id === CHEMISTRY_NOTES_ID)) {
          final.unshift(SEED_MATERIAL);
        }
        
        localStorage.setItem(MATERIALS_KEY, JSON.stringify(final));
        return final;
      }
    } catch (e) { console.warn("Failed to fetch global materials", e); }
  },

  deleteMaterial: async (id: string) => {
    const materials = storage.getMaterials().filter(m => m.id !== id);
    localStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
    if (navigator.onLine) await supabase.from('materials').delete().eq('id', id);
  },

  // --- MESSAGES ---
  getMessages: () => JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]'),
  saveMessage: (msg: any) => {
    const m = storage.getMessages(); m.push(msg);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(m));
  },

  getCommunityMessages: (roomId: string) => JSON.parse(localStorage.getItem(COMMUNITY_MESSAGES_KEY) || '[]').filter((m: any) => m.roomId === roomId),
  saveCommunityMessage: (msg: any) => {
    const all = JSON.parse(localStorage.getItem(COMMUNITY_MESSAGES_KEY) || '[]');
    all.push(msg); localStorage.setItem(COMMUNITY_MESSAGES_KEY, JSON.stringify(all));
  },

  getChatRooms: () => JSON.parse(localStorage.getItem(CHAT_ROOMS_KEY) || JSON.stringify(DEFAULT_ROOMS)),

  saveChatRoom: (room: ChatRoom) => {
    const rooms = storage.getChatRooms();
    rooms.push(room);
    localStorage.setItem(CHAT_ROOMS_KEY, JSON.stringify(rooms));
  },

  // --- USERS & PROFILES ---
  getUsers: () => JSON.parse(localStorage.getItem(USERS_KEY) || '[]'),
  
  saveUser: (user: User) => {
    const u = storage.getUsers();
    const idx = u.findIndex((x: any) => x.id === user.id);
    if (idx === -1) u.push(user); else u[idx] = user;
    localStorage.setItem(USERS_KEY, JSON.stringify(u));
  },

  updateUser: async (updatedUser: User) => {
    storage.saveUser(updatedUser);
    const sess = localStorage.getItem('study_hub_session');
    if (sess && JSON.parse(sess).id === updatedUser.id) {
      localStorage.setItem('study_hub_session', JSON.stringify(updatedUser));
    }

    if (navigator.onLine) {
      try {
        await supabase.from('profiles').upsert({
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          district: updatedUser.district,
          grade: updatedUser.currentGrade,
          role: updatedUser.accountRole,
          level: updatedUser.educationLevel,
          downloaded_ids: updatedUser.downloadedIds,
          favorite_ids: updatedUser.favoriteIds,
          school_name: updatedUser.schoolName,
          bio: updatedUser.bio,
          is_profile_complete: updatedUser.isProfileComplete,
          last_login: updatedUser.lastLogin
        });
      } catch (e) { console.warn("Cloud profile update failed", e); }
    }
  },

  getUserFromCloud: async (uid: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
      if (error || !data) return null;
      return {
        id: data.id,
        email: data.email,
        authProvider: 'email',
        appRole: data.email === 'studyhubmalawi@gmail.com' ? 'admin' : 'user',
        name: data.name,
        district: data.district,
        schoolName: data.school_name,
        currentGrade: data.grade,
        educationLevel: data.level,
        accountRole: data.role,
        bio: data.bio,
        isProfileComplete: data.is_profile_complete,
        downloadedIds: data.downloaded_ids || [],
        favoriteIds: data.favorite_ids || [],
        dateJoined: data.created_at || new Date().toISOString(),
        lastLogin: data.last_login || new Date().toISOString(),
      };
    } catch { return null; }
  },

  // --- PROGRESS SYNC ---
  getAllProgress: () => JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'),
  getUserProgress: (uid: string) => storage.getAllProgress()[uid] || [],
  
  updateProgress: async (uid: string, p: UserProgress) => {
    const all = storage.getAllProgress();
    if (!all[uid]) all[uid] = [];
    const idx = all[uid].findIndex((x: any) => x.materialId === p.materialId);
    if (idx !== -1) all[uid][idx] = p; else all[uid].push(p);
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));

    if (navigator.onLine) {
      try {
        await supabase.from('user_progress').upsert({
          user_id: uid,
          material_id: p.materialId,
          status: p.status,
          progress_percent: p.progressPercent,
          last_read: p.lastRead
        });
      } catch (e) { console.warn("Cloud progress update failed", e); }
    }
  },

  syncProgressWithCloud: async (uid: string) => {
    if (!navigator.onLine) return;
    try {
      const { data: cloudData, error } = await supabase.from('user_progress').select('*').eq('user_id', uid);
      if (error) throw error;
      
      const localAll = storage.getAllProgress();
      const localUserProgress = localAll[uid] || [];
      
      const merged: UserProgress[] = [...localUserProgress];
      
      if (cloudData) {
        cloudData.forEach(cp => {
          const lIdx = merged.findIndex(lp => lp.materialId === cp.material_id);
          const cloudItem: UserProgress = {
            materialId: cp.material_id,
            status: cp.status as ReadingStatus,
            progressPercent: cp.progress_percent,
            lastRead: cp.last_read
          };

          if (lIdx === -1) {
            merged.push(cloudItem);
          } else {
            const localDate = new Date(merged[lIdx].lastRead).getTime();
            const cloudDate = new Date(cp.last_read).getTime();
            if (cloudDate > localDate) {
              merged[lIdx] = cloudItem;
            }
          }
        });
      }

      localAll[uid] = merged;
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(localAll));

      for (const item of merged) {
        await supabase.from('user_progress').upsert({
          user_id: uid,
          material_id: item.materialId,
          status: item.status,
          progress_percent: item.progressPercent,
          last_read: item.lastRead
        });
      }
    } catch (e) { console.warn("Full progress sync failed", e); }
  },

  recordDownload: async (uid: string, mid: string) => {
    const users = storage.getUsers();
    const u = users.find((x: any) => x.id === uid);
    if (u && !u.downloadedIds.includes(mid)) { 
      u.downloadedIds.push(mid); 
      await storage.updateUser(u); 
    }
  },

  removeDownload: async (uid: string, mid: string) => {
    const users = storage.getUsers();
    const u = users.find((x: any) => x.id === uid);
    if (u) { 
      u.downloadedIds = u.downloadedIds.filter((x: string) => x !== mid); 
      await storage.updateUser(u); 
    }
  },

  // --- ANNOUNCEMENTS ---
  getAnnouncements: () => JSON.parse(localStorage.getItem(ANNOUNCEMENTS_KEY) || '[]'),
  saveAnnouncement: async (ann: Announcement) => {
    const a = storage.getAnnouncements(); a.unshift(ann);
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(a));
    if (navigator.onLine) await supabase.from('announcements').upsert({ id: ann.id, title: ann.title, content: ann.content, priority: ann.priority, timestamp: ann.timestamp });
  },

  deleteAnnouncement: async (id: string) => {
    const a = storage.getAnnouncements().filter((x: any) => x.id !== id);
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(a));
    if (navigator.onLine) await supabase.from('announcements').delete().eq('id', id);
  },

  fetchGlobalAnnouncements: async ( ) => {
    if (!navigator.onLine) return;
    try {
      const { data, error } = await supabase.from('announcements').select('*').order('timestamp', { ascending: false });
      if (error) throw error;
      if (data) localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(data));
    } catch {}
  },

  // --- TESTIMONIALS ---
  getTestimonials: () => JSON.parse(localStorage.getItem('study_hub_testimonials') || '[]'),
  saveTestimonial: (t: any) => {
    const all = storage.getTestimonials(); all.unshift(t);
    localStorage.setItem('study_hub_testimonials', JSON.stringify(all));
  },

  // --- EXAMS ---
  getExams: () => JSON.parse(localStorage.getItem(EXAMS_KEY) || '[]'),
  saveExam: (e: any) => { const x = storage.getExams(); x.unshift(e); localStorage.setItem(EXAMS_KEY, JSON.stringify(x)); },

  saveExamResult: async (result: ExamResult) => {
    const results = JSON.parse(localStorage.getItem(EXAM_RESULTS_KEY) || '[]');
    results.push(result);
    localStorage.setItem(EXAM_RESULTS_KEY, JSON.stringify(results));
    
    if (navigator.onLine) {
      try {
        await supabase.from('exam_results').upsert({
          exam_id: result.examId,
          user_id: result.userId,
          score: result.score,
          total_questions: result.totalQuestions,
          answers: result.answers,
          feedback: result.feedback,
          completed_at: result.completedAt
        });
      } catch (e) { console.warn("Cloud exam result save failed", e); }
    }
  },

  // --- FINAL CLOUD SYNC ---
  syncWithServer: async (uid: string) => {
    if (!navigator.onLine) return { success: false };
    try {
      const cloudUser = await storage.getUserFromCloud(uid);
      const localUsers = storage.getUsers();
      const localUser = localUsers.find(u => u.id === uid);

      if (cloudUser && localUser) {
        const mergedUser = { ...localUser, ...cloudUser };
        storage.saveUser(mergedUser);
      } else if (cloudUser) {
        storage.saveUser(cloudUser);
      } else if (localUser) {
        await storage.updateUser(localUser);
      }

      await storage.syncProgressWithCloud(uid);
      await storage.fetchGlobalMaterials();
      await storage.fetchGlobalAnnouncements();

      return { success: true, timestamp: new Date().toISOString() };
    } catch (e) { 
      console.error("Master Sync Failed", e);
      return { success: false }; 
    }
  }
};
