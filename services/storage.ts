
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

---

## 2. FRACTIONS AND PERCENTAGES
### 2.1 Converting Fractions to Percentages
To convert a fraction to a percentage, multiply by 100.
**Example:** 1/4 = (1/4) x 100 = 25%.

### 2.2 Ratio and Proportion
Ratios compare two quantities. 
**Scenario:** If a recipe uses 2 cups of sugar for 5 cups of flour, the ratio is **2:5**.

---

## 3. GEOMETRY
### 3.1 Properties of Triangles
- **Equilateral:** All sides and angles are equal.
- **Isosceles:** Two sides and two angles are equal.
- **Scalene:** No sides or angles are equal.

### 3.2 Area and Perimeter
- **Area of Rectangle:** Length x Width.
- **Perimeter of Circle (Circumference):** 2 x π x Radius.
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
**Examples of Waste Products:**
- Unused chemicals (acids, alkalis).
- Broken laboratory glassware and sharp objects.
- Plastics, waste papers, and rubbers.
- Poisonous gases from reactions.

**Safe Disposal Methods:**
- **Normal Waste Bins:** For non-recyclable plastics, wood, and paper.
- **Controlled Containers:** For sharp objects (scalpels) and hazardous items.
- **Water Draining:** For harmless soluble inorganic salts and diluted detergents.
- **Incineration:** High-temperature burning for syringes, needles, and organic solvents.

### 1.2 Scientific Investigation
A systematic process to find an answer to a problem.
**Key Components:**
1. **Problem Identification:** Asking questions (e.g., What causes rusting?).
2. **Hypothesis:** A guessed answer based on experience.
3. **Variables:**
   - **Independent (IV):** The quantity you decide to change (x-axis).
   - **Dependent (DV):** The quantity you observe/measure (y-axis).
   - **Control (CV):** Factors kept constant.

### 1.3 Purity of a Substance
A pure substance has constant composition and consistent properties.
**Criteria for Purity:**
- **Melting Point:** Pure substances have a specific MP. Impurities lower the MP.
- **Boiling Point:** Pure substances have a fixed BP. Impurities raise the BP.
- **Chromatography:** Used to separate mixtures of soluble substances (dyes, hits).

**Relative Flow Values (Rf):**
Rf = (Distance travelled by substance) / (Distance travelled by solvent).
*Rf values are always less than 1.*

---

## TOPIC 2: NITROGEN, SULPHUR AND PHOSPHORUS

### 2.1 Nitrogen (Group V)
- Makes up 78% of the air.
- Atomic Number: 7, Configuration: 2.5, Valency: 3.
- **Properties:** Colorless, odorless, inert (triple covalent bond N≡N).
- **Industrial Preparation:** The Haber Process.
  - Nitrogen + Hydrogen ⇌ Ammonia (NH3).
  - Conditions: Iron catalyst, 450°C, 300 atmospheres.

### 2.2 Sulphur (Group VI)
- Found in volcanic regions and metal ores.
- **Extraction:** The Frasch Process.
  - Super-heated water melts sulphur; compressed air forces it to the surface.
- **Allotropes:** Rhombic (stable below 96°C) and Monoclinic (stable above 96°C).
- **Industrial Use:** Manufacture of Sulphuric Acid via the Contact Process.
  - Catalyst: Vanadium (V) Oxide.

### 2.3 Phosphorus (Group V)
- Atomic Number: 15, Configuration: 2.8.5.
- **Allotropes:** White and Red phosphorus.
- **Uses:** Fertilizers (NPK), matches, and detergents.

---

## TOPIC 3: CHEMICAL BONDING AND PROPERTIES OF MATTER

### 3.1 Ionic (Electrovalent) Bonding
- Formed by transferring electrons from a metal (cation) to a non-metal (anion).
- **Properties:** High MP/BP, conduct electricity in molten/aqueous state, soluble in water.

### 3.2 Covalent Bonding
- Formed by sharing electrons between non-metals.
- **Properties:** Low MP/BP, insulators (non-electrolytes), volatile.
- **Types:** Pure covalent (equal sharing) and Dative (one atom provides both electrons).

### 3.3 Allotropy (Carbon)
- **Graphite:** Hexagonal rings in layers. Conducts electricity due to delocalized electrons. Used as a lubricant.
- **Diamond:** Tetrahedral structure. Hardest known substance. Non-conductor.

---

## TOPIC 4: STOICHIOMETRY

### 4.1 The Mole Concept
- **The Mole:** Amount containing 6.023 x 10^23 particles (Avogadro's Constant).
- **Molar Mass:** Mass of 1 mole (g/mol).
- **Formulas:**
  - Moles = Mass / Molar Mass.
  - Molarity = Moles / Volume (dm³).

### 4.2 Standard Solutions
- A solution of known concentration.
- **Dilution Law:** C1V1 = C2V2.

### 4.3 Titration
- Gradual addition of a titrant to an analyte to find unknown concentration.
- **Indicators:** Phenolphthalein (pink in base) and Methyl Orange.

---

## TOPIC 5: HEATS OF REACTION

### 5.1 Enthalpy Change (ΔH)
- **Exothermic:** Heat released to surroundings. ΔH is negative. Temperature rises. (e.g., Combustion, Neutralization).
- **Endothermic:** Heat absorbed from surroundings. ΔH is positive. Temperature falls. (e.g., Photosynthesis).

---

## TOPIC 6: ORGANIC CHEMISTRY (ALKANOLS)

- **Functional Group:** Hydroxyl group (-OH).
- **General Formula:** CnH2n+1OH.
- **Primary Alkanol:** -OH bonded to a carbon with only one other carbon bond.
- **Secondary Alkanol:** -OH bonded to a carbon with two other carbon bonds.
- **Tertiary Alkanol:** -OH bonded to a carbon with three other carbon bonds.

---

## TOPIC 10: IDENTIFICATION OF UNKNOWN COMPOUNDS

**Test Results for Families:**
- **Alkanes:** Insoluble in water, no reaction with Bromine.
- **Alkenes:** Decolorize orange/brown Bromine solution.
- **Alkanols:** Soluble in water, react with Sodium to produce Hydrogen gas.
- **Alkanoic Acids:** Turn blue litmus red, pH < 7.
- **Alkanals (Aldehydes):** Form orange precipitate with 2,4-DNPH; Silver mirror with Tollen's reagent.
- **Alkanones (Ketones):** Form orange precipitate with 2,4-DNPH; No reaction with Tollen's.
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
          // Fixed: school_name mapping from local schoolName
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
            // Fixed: last_read mapping from local lastRead
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
