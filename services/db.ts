
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot,
  Timestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "./firebase";
import { StudyMaterial, Message, User, UserProgress, Testimonial, Announcement } from "../types";

export const dbService = {
  // Users
  getUser: async (userId: string) => {
    const docRef = doc(db, "users", userId);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() as User : null;
  },
  saveUser: async (user: User) => {
    await setDoc(doc(db, "users", user.id), user);
  },
  updateUser: async (userId: string, updates: Partial<User>) => {
    await updateDoc(doc(db, "users", userId), updates);
  },
  getAllUsers: async () => {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map(d => d.data() as User);
  },

  // Materials
  getMaterials: async () => {
    const q = query(collection(db, "materials"), orderBy("uploadedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as StudyMaterial));
  },
  uploadMaterial: async (file: File, metadata: Omit<StudyMaterial, 'id' | 'fileUrl' | 'uploadedAt'>) => {
    const fileRef = ref(storage, `materials/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    
    const docData = {
      ...metadata,
      fileUrl: url,
      uploadedAt: new Date().toISOString()
    };
    
    const docRef = await addDoc(collection(db, "materials"), docData);
    return { ...docData, id: docRef.id };
  },
  deleteMaterial: async (material: StudyMaterial) => {
    // Try to delete from storage first if it's a firebase URL
    if (material.fileUrl.includes("firebasestorage")) {
      try {
        const fileRef = ref(storage, material.fileUrl);
        await deleteObject(fileRef);
      } catch (e) { console.warn("File not found in storage", e); }
    }
    await deleteDoc(doc(db, "materials", material.id));
  },

  // Announcements
  subscribeAnnouncements: (callback: (anns: Announcement[]) => void) => {
    const q = query(collection(db, "announcements"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as Announcement)));
    });
  },
  saveAnnouncement: async (ann: Omit<Announcement, 'id'>) => {
    await addDoc(collection(db, "announcements"), ann);
  },
  deleteAnnouncement: async (id: string) => {
    await deleteDoc(doc(db, "announcements", id));
  },

  // Support Messages
  subscribeMessages: (userId: string, isAdmin: boolean, callback: (msgs: Message[]) => void) => {
    let q;
    if (isAdmin) {
      q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
    } else {
      q = query(
        collection(db, "messages"), 
        where("participants", "array-contains", userId),
        orderBy("timestamp", "asc")
      );
    }
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as Message)));
    });
  },
  sendMessage: async (msg: Omit<Message, 'id'>) => {
    const participants = [msg.senderId, msg.receiverId];
    await addDoc(collection(db, "messages"), { ...msg, participants });
  },

  // Testimonials
  getTestimonials: async () => {
    const q = query(collection(db, "testimonials"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Testimonial));
  },
  saveTestimonial: async (test: Omit<Testimonial, 'id'>) => {
    await addDoc(collection(db, "testimonials"), test);
  },

  // Progress
  updateProgress: async (userId: string, progress: UserProgress) => {
    const progressId = `${userId}_${progress.materialId}`;
    await setDoc(doc(db, "progress", progressId), { ...progress, userId });
  },
  getUserProgress: async (userId: string) => {
    const q = query(collection(db, "progress"), where("userId", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as UserProgress);
  }
};
