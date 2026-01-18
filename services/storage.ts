
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
const LAST_SYNC_KEY = 'study_hub_last_sync';

const SEED_MATERIALS: StudyMaterial[] = [
  {
    id: 'form1-chemistry-chirindanji',
    title: 'Complete Form One Chemistry Notes',
    level: EducationLevel.SECONDARY,
    grade: 'Form 1' as Grade,
    category: Category.NOTES,
    subject: 'Chemistry',
    fileUrl: '#digital',
    fileName: 'Form1_Chemistry_Notes.digital',
    isDigital: true,
    uploadedAt: new Date().toISOString(),
    content: `
# TOPIC 1: INTRODUCTION TO CHEMISTRY
## MEANING OF CHEMISTRY
Chemistry is the branch of science dealing with elements and the compounds they form and the reactions they undergo.

## BRANCHES OF CHEMISTRY
The branches of chemistry include physical, environmental, analytical, industrial, organic and inorganic chemistry.

**a. PHYSICAL CHEMISTRY**
It is the study of how chemical compounds and their constituents react with each other.

**b. ENVIRONMENTAL CHEMISTRY**
It is the study of how chemicals react naturally in the environment and human impact on natural systems.

**c. ANALYTICAL CHEMISTRY**
It is the study of separation, identification, and quantification of the chemical components of natural and artificial materials.

**d. INDUSTRIAL CHEMISTRY**
It is the study of the application of physical and chemical processes towards the change of raw materials into beneficial products.

**e. ORGANIC CHEMISTRY**
It is the study of compounds that contain carbon except oxides of carbon and carbonates.

**f. INORGANIC CHEMISTRY**
It is the study of compounds that do not contain carbon and non-living things.

---

## IMPORTANCE OF CHEMISTRY IN EVERYDAY LIFE
Chemistry is important in everyday life and it is applied in different ways. Some of the applications of chemistry are:
• Water treatment. Different chemical processes are used to purify water so that it is safe for drinking.
• Cooking nsima. Mixing of the ingredients applies concepts in chemistry.
• Making a cup of tea.
• Pharmaceuticals.
• Food industries. Chemistry is involved in the processing of the food. For example, lime is added to brown sugar so that it becomes white.
• Manufacture of soap and detergents also applies knowledge of chemistry.
• Manufacture of pesticides.

---

## TOPIC 2: ESSENTIAL MATHEMATICAL SKILLS IN CHEMISTRY
## EXPRESSING NUMBERS IN STANDARD FORM
The standard form or the scientific notation is a special way of writing very large number or very small numbers. When a number is expressed in standard form, its meaning or value does not change.
The number is written in two parts which give the original number when multiplied. One of the numbers must be between 1 and 10 and the other is a power of ten.

## TOPIC 3: COMPOSITION AND CLASSIFICATION OF MATTER
## MATTER
Matter is defined as anything that has mass and occupies space.

## STATES OF MATTER
There are three states of matter. These are solids, liquids and gases.

---

## TOPIC 4: ATOMIC STRUCTURE
## ATOM
An atom is defined as the smallest particle of matter.
An atom consists of three sub-atomic particles. These include protons, neutrons and electrons.
The central part of the atom is called the nucleus.
    `
  },
  {
    id: 'jce-social-studies-holly',
    title: 'JCE Social Studies (Forms 1 & 2)',
    level: EducationLevel.SECONDARY,
    grade: 'Form 2' as Grade,
    category: Category.BOOKS,
    subject: 'Social Studies',
    fileUrl: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf',
    fileName: 'JCE_Social_Studies_Holly.pdf',
    uploadedAt: new Date().toISOString()
  }
];

const DEFAULT_ROOMS: ChatRoom[] = [
  { id: 'general-chat', title: 'General chat', description: 'Casual conversation and connecting with other students.', icon: '💬', activeUsers: 412 },
  { id: 'exam-talk', title: 'Exam Prep', description: 'Strategies and past paper discussions.', icon: '📝', activeUsers: 342 }
];

export const storage = {
  getMaterials: (): StudyMaterial[] => {
    const data = localStorage.getItem(MATERIALS_KEY);
    const materials = data ? JSON.parse(data) : [];
    const seedIds = SEED_MATERIALS.map(sm => sm.id);
    const existingIds = materials.map((m: any) => m.id);
    const needsSeeding = seedIds.some(id => !existingIds.includes(id));
    if (materials.length === 0 || needsSeeding) {
      const missingSeeds = SEED_MATERIALS.filter(sm => !existingIds.includes(sm.id));
      const combined = [...materials, ...missingSeeds];
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
      } catch (e) { console.warn(e); }
    }
  },

  deleteMaterial: async (id: string) => {
    const materials = storage.getMaterials().filter(m => m.id !== id);
    localStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
    if (navigator.onLine) await supabase.from('materials').delete().eq('id', id);
  },

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
  saveChatRoom: (room: any) => {
    const r = storage.getChatRooms(); r.push(room);
    localStorage.setItem(CHAT_ROOMS_KEY, JSON.stringify(r));
  },

  getUsers: () => JSON.parse(localStorage.getItem(USERS_KEY) || '[]'),
  saveUser: (user: any) => {
    const u = storage.getUsers();
    const idx = u.findIndex((x: any) => x.id === user.id);
    if (idx === -1) u.push(user); else u[idx] = user;
    localStorage.setItem(USERS_KEY, JSON.stringify(u));
  },

  updateUser: (updatedUser: any) => {
    const u = storage.getUsers();
    const idx = u.findIndex((x: any) => x.id === updatedUser.id);
    if (idx !== -1) u[idx] = updatedUser; else u.push(updatedUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(u));
    const sess = localStorage.getItem('study_hub_session');
    if (sess && JSON.parse(sess).id === updatedUser.id) localStorage.setItem('study_hub_session', JSON.stringify(updatedUser));
  },

  deleteUser: (uid: string) => localStorage.setItem(USERS_KEY, JSON.stringify(storage.getUsers().filter((u: any) => u.id !== uid))),

  getUserFromCloud: async (uid: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
      if (error) return null;
      return { id: data.id, name: data.name, email: data.email, district: data.district, schoolName: data.school_name, currentGrade: data.grade, accountRole: data.role, isProfileComplete: true };
    } catch { return null; }
  },

  getAllProgress: () => JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'),
  getUserProgress: (uid: string) => storage.getAllProgress()[uid] || [],
  updateProgress: (uid: string, p: UserProgress) => {
    const all = storage.getAllProgress();
    if (!all[uid]) all[uid] = [];
    const idx = all[uid].findIndex((x: any) => x.materialId === p.materialId);
    if (idx !== -1) all[uid][idx] = p; else all[uid].push(p);
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  },

  recordDownload: (uid: string, mid: string) => {
    const u = storage.getUsers().find((x: any) => x.id === uid);
    if (u && !u.downloadedIds.includes(mid)) { u.downloadedIds.push(mid); storage.updateUser(u); }
  },

  removeDownload: (uid: string, mid: string) => {
    const u = storage.getUsers().find((x: any) => x.id === uid);
    if (u) { u.downloadedIds = u.downloadedIds.filter((x: string) => x !== mid); storage.updateUser(u); }
  },

  getAnnouncements: () => JSON.parse(localStorage.getItem(ANNOUNCEMENTS_KEY) || '[]'),
  saveAnnouncement: async (ann: Announcement) => {
    const a = storage.getAnnouncements(); a.unshift(ann);
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(a));
    if (navigator.onLine) await supabase.from('announcements').upsert({ id: ann.id, title: ann.title, content: ann.content, priority: ann.priority, timestamp: ann.timestamp });
  },

  deleteAnnouncement: async (id: string) => {
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(storage.getAnnouncements().filter((x: any) => x.id !== id)));
    if (navigator.onLine) await supabase.from('announcements').delete().eq('id', id);
  },

  getTestimonials: () => JSON.parse(localStorage.getItem('study_hub_testimonials') || '[]'),
  saveTestimonial: (t: any) => {
    const all = storage.getTestimonials(); all.unshift(t);
    localStorage.setItem('study_hub_testimonials', JSON.stringify(all));
  },

  getExams: () => JSON.parse(localStorage.getItem(EXAMS_KEY) || '[]'),
  saveExam: (e: any) => { const x = storage.getExams(); x.unshift(e); localStorage.setItem(EXAMS_KEY, JSON.stringify(x)); },
  deleteExam: (id: string) => localStorage.setItem(EXAMS_KEY, JSON.stringify(storage.getExams().filter((x: any) => x.id !== id))),

  getExamResults: (uid: string) => JSON.parse(localStorage.getItem(EXAM_RESULTS_KEY) || '[]').filter((r: any) => r.userId === uid),
  saveExamResult: (res: any) => {
    const all = JSON.parse(localStorage.getItem(EXAM_RESULTS_KEY) || '[]');
    all.unshift(res); localStorage.setItem(EXAM_RESULTS_KEY, JSON.stringify(all));
  },

  syncWithServer: async (uid: string) => {
    if (!navigator.onLine) return { success: false };
    try {
      const u = storage.getUsers().find((x: any) => x.id === uid);
      if (u) await supabase.from('profiles').upsert({ id: u.id, name: u.name, email: u.email, district: u.district, grade: u.currentGrade, role: u.accountRole });
      return { success: true, timestamp: new Date().toISOString() };
    } catch { return { success: false }; }
  }
};
