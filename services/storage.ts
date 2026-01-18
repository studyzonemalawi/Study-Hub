
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
    id: 'msce-chemistry-form1-chirindanji',
    title: 'Complete Form One Chemistry Notes',
    level: EducationLevel.SECONDARY,
    grade: 'Form 1' as Grade,
    category: Category.NOTES,
    subject: 'Chemistry',
    fileUrl: '#digital',
    fileName: 'Form1_Chemistry_Chirindanji.digital',
    isDigital: true,
    uploadedAt: new Date().toISOString(),
    content: `
# COMPLETE FORM ONE CHEMISTRY NOTES
## SYLLABUS-BASED
### Compiled by: Ganizani Chirindanji

---

## TABLE OF CONTENT
1. **TOPIC 1 : INTRODUCTION TO CHEMISTRY** ... 1
2. **TOPIC 2 : ESSENTIAL MATHEMATICAL SKILLS IN CHEMISTRY** ... 11
3. **TOPIC 3: COMPOSITION AND CLASSIFICATION OF MATTER** ... 16
4. **TOPIC 4 : ATOMIC STRUCTURE** ... 34
5. **TOPIC 5 : THE PERIODIC TABLE** ... 42
6. **TOPIC 6 : PHYSICAL AND CHEMICAL CHANGES** ... 47
7. **TOPIC 7 : ORGANIC COMPOUNDS** ... 58

---

# TOPIC 1: INTRODUCTION TO CHEMISTRY

## MEANING OF CHEMISTRY
Chemistry is the branch of science dealing with elements and the compounds they form and the reactions they undergo.

## BRANCHES OF CHEMISTRY
The branches of chemistry include physical, environmental, analytical, industrial, organic and inorganic chemistry.

### a. PHYSICAL CHEMISTRY
It is the study of how chemical compounds and their constituents react with each other.

### b. ENVIRONMENTAL CHEMISTRY
It is the study of how chemicals react naturally in the environment and human impact on natural systems.

### c. ANALYTICAL CHEMISTRY
It is the study of separation, identification, and quantification of the chemical components of natural and artificial materials.

### d. INDUSTRIAL CHEMISTRY
It is the study of the application of physical and chemical processes towards the change of raw materials into beneficial products.

### e. ORGANIC CHEMISTRY
It is the study of compounds that contain carbon except oxides of carbon and carbonates.

### f. INORGANIC CHEMISTRY
It is the study of compounds that do not contain carbon and non-living things.

---

## IMPORTANCE OF CHEMISTRY IN EVERYDAY LIFE
Chemistry is important in everyday life and it is applied in different ways. Some of the applications of chemistry are:
- **Water treatment.** Different chemical processes are used to purify water so that it is safe for drinking.
- **Cooking nsima.** Mixing of the ingredients applies concepts in chemistry.
- **Making a cup of tea.**
- **Pharmaceuticals.**
- **Food industries.** Chemistry is involved in the processing of the food. For example, lime is added to brown sugar so that it becomes white.
- **Manufacture of soap and detergents** also applies knowledge of chemistry.
- **Manufacture of pesticides.**

## AREAS WHERE CHEMISTRY IS APPLIED
- Pharmaceutical companies that manufacture medical drugs.
- Companies that make food and drinks (soft and alcoholic).
- Companies that manufacture oil products.
- Companies that manufacture fertilizers and pesticides.
- Water purification and supply companies.
- The mining industries.

---

## CAREERS IN CHEMISTRY AND THEIR IMPORTANCE
Most careers in modern society require the application of the knowledge in chemistry.

### a. Medicine and nursing
Doctors and nurses need chemistry as part of their training.

### b. Pharmacist
Pharmacists require chemistry as part of their training in order to understand the chemicals they are providing.

### c. Food chemist
Food chemists help test manufactured food to ensure that it is safe to eat.

### d. Teacher chemist
Chemistry teachers prepare students for different careers by teaching them chemistry in schools.

---

## THE LABORATORY
A laboratory is a special room equipped for conducting scientific research and experimentation.

### SAFETY RULES IN THE LABORATORY
- Do not drink, taste nor eat anything in the laboratory. Any chemical is never tasted in the laboratory but can be tested.
- Handle all materials in the laboratory carefully. Glassware must be held with both hands.
- Never run or play in the laboratory.
- Wear protective materials such as lab coat, an apron, and safety goggles.
- Never work in the laboratory barefooted.
- Avoid disturbing or pushing a colleague who is busy working in the laboratory.
- Clean all equipment and workplaces after each laboratory period.
- Follow experimental procedures and do not take short cuts.
- Turn off water, gas and electricity outlets when not in use.
- Keep flame and flammable solutions apart.
- Always work in a well ventilated area.

---

## HAZARD SYMBOLS
- **X (Cross):** Harmful or irritant substance.
- **Skull and Crossbones:** Toxic substance.
- **Flame:** Highly flammable.
- **Corrosive (Dripping liquid):** Corrosive.
- **Dead tree/fish:** Dangerous to the environment.

---

## THE SI UNIT SYSTEM OF MEASUREMENT
The system of measurement used nowadays is known as the SI system of units. SI stands for International System.

### BASIC UNITS
- **Length:** Metre (M)
- **Mass:** Kilogram (Kg)
- **Time:** Second (S)
- **Temperature:** Kelvin (K)

---

# TOPIC 3: COMPOSITION AND CLASSIFICATION OF MATTER

## MATTER
Matter is defined as anything that has mass and occupies space.

## STATES OF MATTER
There are three states of matter: **Solids**, **Liquids**, and **Gases**.

### 1. SOLIDS
- Particles are tightly packed, usually in a regular pattern.
- They do not flow.
- They have a definite shape and volume.
- They are difficult to compress.

### 2. LIQUIDS
- Particles are close together, but with no regular arrangement.
- Liquids flow.
- They have indefinite shape (take the shape of the container) but definite volume.

### 3. GASES
- Particles are very far apart with no regular arrangement.
- Particles move randomly at very high speeds.
- They have indefinite shape and volume.
- They can be easily compressed.

---

# TOPIC 4: ATOMIC STRUCTURE
An atom is defined as the smallest particle of matter.

## COMPOSITION OF AN ATOM
An atom consists of three sub-atomic particles: **Protons**, **Neutrons** and **Electrons**.
- **Nucleus:** Central part containing protons and neutrons.
- **Energy Levels (Shells):** Imaginary paths where electrons move.

| Particle | Charge | Mass | Location |
| :--- | :--- | :--- | :--- |
| Proton | +1 | 1 amu | Nucleus |
| Electron | -1 | ~0 | Shells |
| Neutron | 0 | 1 amu | Nucleus |
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
  },
  {
    id: 'std8-maths-intro',
    title: 'Instant Math: Arithmetic Mastery',
    level: EducationLevel.PRIMARY,
    grade: 'Standard 8' as Grade,
    category: Category.NOTES,
    subject: 'Mathematics',
    fileUrl: '#digital',
    fileName: 'Std8_Math_Mastery.digital',
    isDigital: true,
    uploadedAt: new Date().toISOString(),
    content: `
# Mathematics: Arithmetic Mastery
## Standard 8 - Malawi National Curriculum

---

## 1. NUMBER SYSTEMS
### 1.1 Understanding Large Numbers
In Standard 8, we work with numbers up to **millions**.
**Example:** 5,230,450 (Five million, two hundred and thirty thousand, four hundred and fifty).

### 1.2 Factors and Multiples
- **Highest Common Factor (HCF):** The largest number that divides two or more numbers.
- **Lowest Common Multiple (LCM):** The smallest number that is a multiple of two or more numbers.
    `
  },
  {
    id: 'msce-chemistry-form3-chirindanji',
    title: 'Complete Chemistry Notes (Form 3)',
    level: EducationLevel.SECONDARY,
    grade: 'Form 3' as Grade,
    category: Category.NOTES,
    subject: 'Chemistry',
    fileUrl: '#digital',
    fileName: 'Complete_Chemistry_Form3.digital',
    isDigital: true,
    uploadedAt: new Date().toISOString(),
    content: `
# Complete Chemistry Notes
## Senior Secondary (Form 3) - Syllabus Based
### Compiled by: Ganizani Chirindanji

---

## TOPIC 1: EXPERIMENTAL TECHNIQUES

### 1.1 Chemical Waste Management
Chemical waste is a product or unwanted material from a chemical reaction or an expired product no longer needed.
    `
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
