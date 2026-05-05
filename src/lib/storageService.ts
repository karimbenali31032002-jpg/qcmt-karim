import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  addDoc,
  writeBatch
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { auth, db, storage, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { Course, QCM, UserRating } from '@/src/types';

const COLLECTIONS = {
  COURSES: 'courses',
  QCMS: 'qcms',
  RATINGS: 'userRatings'
};

class StorageService {
  private isAdmin(): boolean {
    if (!auth) return false;
    // Only the primary developer can edit global content for now
    return auth.currentUser?.email === 'karimbenali31032002@gmail.com';
  }

  // Files/Uploads (Migrated to Firebase Storage)
  async uploadFile(file: File): Promise<string> {
    if (!storage) throw new Error("Storage not initialized");
    const fileId = `uploads/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, fileId);
    
    try {
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (e) {
      console.error("Firebase Storage error:", e);
      throw e;
    }
  }

  async deleteFile(url: string): Promise<void> {
    if (!url || !url.includes('firebasestorage') || !storage) return;
    try {
      const storageRef = ref(storage, url);
      await deleteObject(storageRef);
    } catch (e) {
      console.error("Error deleting file from storage:", e);
    }
  }

  // Courses
  async getCourses(): Promise<Course[]> {
    if (!db) return [];
    const path = COLLECTIONS.COURSES;
    try {
      const q = query(collection(db, path), orderBy('title', 'asc'));
      const snapshot = await getDocs(q);
      const courses = snapshot.docs.map(doc => ({
        ...(doc.data() as object),
        id: doc.id
      })) as Course[];

      // In Firestore, qcmCount is better managed as a field because aggregate queries are expensive
      // For now, we trust the count in the document or re-sync if needed periodically
      return courses;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
      return [];
    }
  }

  async getCourse(id: string): Promise<Course | undefined> {
    if (!db) return undefined;
    const path = `${COLLECTIONS.COURSES}/${id}`;
    try {
      const docSnap = await getDoc(doc(db, COLLECTIONS.COURSES, id));
      if (docSnap.exists()) {
        return { ...docSnap.data(), id: docSnap.id } as Course;
      }
      return undefined;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
    }
  }

  async addCourse(course: Omit<Course, 'id' | 'createdAt'>): Promise<Course> {
    if (!db) throw new Error("Database not initialized");
    const path = COLLECTIONS.COURSES;
    try {
      const newCourseData = {
        ...course,
        createdAt: Timestamp.now(),
        qcmCount: course.qcmCount || 0
      };
      const docRef = await addDoc(collection(db, path), newCourseData);
      return { ...newCourseData, id: docRef.id } as Course;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
      throw e;
    }
  }

  async updateCourse(id: string, updates: Partial<Course>): Promise<Course> {
    if (!db) throw new Error("Database not initialized");
    const path = `${COLLECTIONS.COURSES}/${id}`;
    try {
      const docRef = doc(db, COLLECTIONS.COURSES, id);
      const cleanUpdates = { ...updates };
      delete (cleanUpdates as any).id;
      
      await updateDoc(docRef, cleanUpdates);
      const updated = await this.getCourse(id);
      return updated!;
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
      throw e;
    }
  }

  async deleteCourse(id: string): Promise<void> {
    if (!id || !db) return;
    const path = `${COLLECTIONS.COURSES}/${id}`;
    try {
      // 1. Get the course to cleanup attachments
      const course = await this.getCourse(id);
      
      // 2. Delete Course document
      await deleteDoc(doc(db, COLLECTIONS.COURSES, id));
      
      // 3. Cleanup attachments from storage
      if (course?.attachments) {
        for (const att of course.attachments) {
          await this.deleteFile(att.url);
        }
      }

      // Note: In production, we'd use a Cloud Function to cleanup QCMs and Ratings.
      // Here we will do a client-side cleanup for convenience in this turn.
      const qcms = await this.getQCMS(id);
      for (const qcm of qcms) {
        await this.deleteQCM(qcm.id);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
      throw e;
    }
  }

  // QCMS
  async getQCMS(courseId: string): Promise<QCM[]> {
    if (!db) return [];
    const path = COLLECTIONS.QCMS;
    try {
      let q;
      if (!courseId || courseId === 'none') {
        q = query(collection(db, path), where('courseId', '==', null));
      } else {
        q = query(collection(db, path), where('courseId', '==', courseId));
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...(doc.data() as object),
        id: doc.id
      })) as QCM[];
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
      return [];
    }
  }

  async deleteQCM(id: string): Promise<void> {
    if (!id || !db) return;
    const path = `${COLLECTIONS.QCMS}/${id}`;
    try {
      const qcm = await this.getDocById<QCM>(COLLECTIONS.QCMS, id);
      if (!qcm) return;

      // Delete QCM document
      await deleteDoc(doc(db, COLLECTIONS.QCMS, id));
      
      // Delete associated ratings (client-side cleanup)
      const ratingsSnap = await getDocs(query(collection(db, COLLECTIONS.RATINGS), where('qcmId', '==', id)));
      const batch = writeBatch(db);
      ratingsSnap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      // Decrement course count
      if (qcm.courseId) {
        const course = await this.getCourse(qcm.courseId);
        if (course) {
          await this.updateCourse(qcm.courseId, { qcmCount: Math.max(0, (course.qcmCount || 1) - 1) });
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  }

  async addQCM(qcm: Omit<QCM, 'id' | 'createdAt'>): Promise<QCM> {
    if (!db) throw new Error("Database not initialized");
    const path = COLLECTIONS.QCMS;
    try {
      const newQcmData = {
        ...qcm,
        createdAt: Timestamp.now()
      };
      const docRef = await addDoc(collection(db, path), newQcmData);
      
      // Update course count
      if (qcm.courseId) {
        const course = await this.getCourse(qcm.courseId);
        if (course) {
          await this.updateCourse(qcm.courseId, { qcmCount: (course.qcmCount || 0) + 1 });
        }
      }

      return { ...newQcmData, id: docRef.id } as QCM;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
      throw e;
    }
  }

  async addQCMS(qcmsList: Omit<QCM, 'id' | 'createdAt'>[]): Promise<void> {
    if (!db) throw new Error("Database not initialized");
    const path = COLLECTIONS.QCMS;
    try {
      const batchSize = 100; // Firestore limit is 500, but let's be safe
      for (let i = 0; i < qcmsList.length; i += batchSize) {
        const chunk = qcmsList.slice(i, i + batchSize);
        const batch = writeBatch(db);
        
        chunk.forEach(qcm => {
          const docRef = doc(collection(db, path));
          batch.set(docRef, {
            ...qcm,
            createdAt: Timestamp.now()
          });
        });
        
        await batch.commit();
      }

      // Update course count if a course was selected
      const sample = qcmsList[0];
      if (sample?.courseId) {
        const course = await this.getCourse(sample.courseId);
        if (course) {
          await this.updateCourse(sample.courseId, { 
            qcmCount: (course.qcmCount || 0) + qcmsList.length 
          });
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }

  // Ratings
  async getRatings(userId: string, courseId: string): Promise<UserRating[]> {
    if (!db) return [];
    const path = COLLECTIONS.RATINGS;
    try {
      let q;
      if (courseId === 'all') {
        q = query(collection(db, path), where('userId', '==', userId));
      } else {
        q = query(collection(db, path), where('userId', '==', userId), where('courseId', '==', courseId));
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...(doc.data() as object),
        id: doc.id
      })) as UserRating[];
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
      return [];
    }
  }

  async rateQCM(userId: string, courseId: string, qcmId: string, rating: 1 | 2 | 3 | null): Promise<UserRating | null> {
    if (rating === null) {
      await this.removeRating(userId, qcmId);
      return null;
    }
    return this.saveRating({
      userId,
      courseId,
      qcmId,
      rating
    });
  }

  async removeRating(userId: string, qcmId: string): Promise<void> {
    if (!db) return;
    const path = COLLECTIONS.RATINGS;
    try {
      const q = query(collection(db, path), where('userId', '==', userId), where('qcmId', '==', qcmId));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  }

  async saveRating(rating: Omit<UserRating, 'id' | 'lastUpdated'>): Promise<UserRating> {
    if (!db) throw new Error("Database not initialized");
    const path = COLLECTIONS.RATINGS;
    try {
      const q = query(collection(db, path), where('userId', '==', rating.userId), where('qcmId', '==', rating.qcmId));
      const snapshot = await getDocs(q);
      
      const ratingData = {
        ...rating,
        lastUpdated: Timestamp.now()
      };

      if (!snapshot.empty) {
        const docRef = snapshot.docs[0].ref;
        await updateDoc(docRef, ratingData);
        return { ...ratingData, id: docRef.id } as UserRating;
      } else {
        const docRef = await addDoc(collection(db, path), ratingData);
        return { ...ratingData, id: docRef.id } as UserRating;
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
      throw e;
    }
  }

  async deleteAttachment(courseId: string, attachmentIndex: number): Promise<Course> {
    if (!db) throw new Error("Database not initialized");
    const path = `${COLLECTIONS.COURSES}/${courseId}`;
    try {
      const course = await this.getCourse(courseId);
      if (!course) throw new Error('Course not found');
      
      const attachments = [...(course.attachments || [])];
      const removed = attachments.splice(attachmentIndex, 1)[0];
      
      // Cleanup from storage
      if (removed && removed.url.includes('firebasestorage')) {
        await this.deleteFile(removed.url);
      }
      
      await updateDoc(doc(db, COLLECTIONS.COURSES, courseId), { attachments });
      return { ...course, attachments };
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
      throw e;
    }
  }

  async clearCourseQCMS(courseId: string): Promise<void> {
    if (!courseId || !db) return;
    const path = `${COLLECTIONS.QCMS} for course ${courseId}`;
    try {
      // client-side batch delete
      const qcms = await this.getQCMS(courseId);
      const batch = writeBatch(db);
      qcms.forEach(q => batch.delete(doc(db, COLLECTIONS.QCMS, q.id)));
      
      // Also delete relevant ratings
      const ratingsSnap = await getDocs(query(collection(db, COLLECTIONS.RATINGS), where('courseId', '==', courseId)));
      ratingsSnap.docs.forEach(doc => batch.delete(doc.ref));
      
      await batch.commit();
      
      // Update course count
      await this.updateCourse(courseId, { qcmCount: 0 });
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  }

  async openFile(url: string): Promise<void> {
    if (!url) return;
    window.open(url, '_blank');
  }

  private async getDocById<T>(colName: string, id: string): Promise<T | null> {
    if (!db) return null;
    const docSnap = await getDoc(doc(db, colName, id));
    if (docSnap.exists()) return { ...docSnap.data(), id: docSnap.id } as T;
    return null;
  }
}

export const storageService = new StorageService();
