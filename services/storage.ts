
import { StudyMaterial, Message, User, UserProgress, Testimonial, Announcement } from '../types';

const MATERIALS_KEY = 'study_hub_materials';
const MESSAGES_KEY = 'study_hub_messages';
const USERS_KEY = 'study_hub_users';
const PROGRESS_KEY = 'study_hub_progress';
const TESTIMONIALS_KEY = 'study_hub_testimonials';
const ANNOUNCEMENTS_KEY = 'study_hub_announcements';
const LAST_SYNC_KEY = 'study_hub_last_sync';

export const storage = {
  getMaterials: (): StudyMaterial[] => {
    const data = localStorage.getItem(MATERIALS_KEY);
    return data ? JSON.parse(data) : [];
  },
  
  saveMaterial: (material: StudyMaterial) => {
    const materials = storage.getMaterials();
    materials.push(material);
    localStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
  },

  deleteMaterial: (id: string) => {
    const materials = storage.getMaterials().filter(m => m.id !== id);
    localStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
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

  getUsers: (): User[] => {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveUser: (user: User) => {
    const users = storage.getUsers();
    const existingIndex = users.findIndex(u => u.phoneNumber === user.phoneNumber);
    if (existingIndex === -1) {
      users.push(user);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  },

  updateUser: (updatedUser: User) => {
    const users = storage.getUsers();
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      users[index] = updatedUser;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      const session = localStorage.getItem('study_hub_session');
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed.id === updatedUser.id) {
          localStorage.setItem('study_hub_session', JSON.stringify(updatedUser));
        }
      }
    }
  },

  deleteUser: (userId: string) => {
    const users = storage.getUsers().filter(u => u.id !== userId);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    const messages = storage.getMessages().filter(m => m.senderId !== userId && m.receiverId !== userId);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    const progresses = storage.getAllProgress();
    delete progresses[userId];
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progresses));
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

  getTestimonials: (): Testimonial[] => {
    const data = localStorage.getItem(TESTIMONIALS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveTestimonial: (testimonial: Testimonial) => {
    const testimonials = storage.getTestimonials();
    testimonials.unshift(testimonial);
    localStorage.setItem(TESTIMONIALS_KEY, JSON.stringify(testimonials));
  },

  getAnnouncements: (): Announcement[] => {
    const data = localStorage.getItem(ANNOUNCEMENTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveAnnouncement: (announcement: Announcement) => {
    const announcements = storage.getAnnouncements();
    announcements.unshift(announcement);
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(announcements));
  },

  deleteAnnouncement: (id: string) => {
    const announcements = storage.getAnnouncements().filter(a => a.id !== id);
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(announcements));
  },

  // Mock Synchronization Method
  syncWithServer: async (userId: string) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const lastSync = localStorage.getItem(LAST_SYNC_KEY);
    const progress = storage.getUserProgress(userId);
    const user = storage.getUsers().find(u => u.id === userId);

    console.log(`[Sync] Reconciling data for user ${userId}...`);
    console.log(`[Sync] Progress items: ${progress.length}, Saved files: ${user?.downloadedIds.length}`);

    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    return {
      success: true,
      timestamp: new Date().toISOString()
    };
  }
};
