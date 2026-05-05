
import { Course, QCM, UserRating } from '@/src/types';

const STORAGE_KEYS = {
  COURSES: 'medstratify_courses',
  QCMS: 'medstratify_qcms',
  RATINGS: 'medstratify_ratings'
};

class StorageService {
  private getStore<T>(key: string): T[] {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private saveStore<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // Files/Uploads (Local Mock)
  async uploadFile(_file: File): Promise<string> {
    // Local version doesn't support real file uploads to a server.
    // In a real local app, we could use base64, but that's memory heavy.
    // For now, we'll return a placeholder or an object URL if really needed.
    return 'https://images.unsplash.com/photo-1576091160550-217359f4ecf8?q=80&w=2070&auto=format&fit=crop';
  }

  async deleteFile(_url: string): Promise<void> {
    // No-op for mock
  }

  // Courses
  async getCourses(): Promise<Course[]> {
    return this.getStore<Course>(STORAGE_KEYS.COURSES);
  }

  async getCourse(id: string): Promise<Course | undefined> {
    const courses = await this.getCourses();
    return courses.find(c => c.id === id);
  }

  async addCourse(course: Omit<Course, 'id' | 'createdAt'>): Promise<Course> {
    const courses = this.getStore<Course>(STORAGE_KEYS.COURSES);
    const newCourse: Course = {
      ...course,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString() as any,
      qcmCount: course.qcmCount || 0
    };
    courses.push(newCourse);
    this.saveStore(STORAGE_KEYS.COURSES, courses);
    return newCourse;
  }

  async updateCourse(id: string, updates: Partial<Course>): Promise<Course> {
    const courses = this.getStore<Course>(STORAGE_KEYS.COURSES);
    const index = courses.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Course not found');
    
    courses[index] = { ...courses[index], ...updates };
    this.saveStore(STORAGE_KEYS.COURSES, courses);
    return courses[index];
  }

  async deleteCourse(id: string): Promise<void> {
    const courses = this.getStore<Course>(STORAGE_KEYS.COURSES);
    const filtered = courses.filter(c => c.id !== id);
    this.saveStore(STORAGE_KEYS.COURSES, filtered);

    // Cleanup QCMs
    const qcms = this.getStore<QCM>(STORAGE_KEYS.QCMS);
    this.saveStore(STORAGE_KEYS.QCMS, qcms.filter(q => q.courseId !== id));

    // Cleanup Ratings
    const ratings = this.getStore<UserRating>(STORAGE_KEYS.RATINGS);
    this.saveStore(STORAGE_KEYS.RATINGS, ratings.filter(r => r.courseId !== id));
  }

  // QCMS
  async getQCMS(courseId: string): Promise<QCM[]> {
    const qcms = this.getStore<QCM>(STORAGE_KEYS.QCMS);
    if (!courseId || courseId === 'none') {
      return qcms.filter(q => !q.courseId);
    }
    return qcms.filter(q => q.courseId === courseId);
  }

  async deleteQCM(id: string): Promise<void> {
    const qcms = this.getStore<QCM>(STORAGE_KEYS.QCMS);
    const qcmToDelete = qcms.find(q => q.id === id);
    if (!qcmToDelete) return;

    this.saveStore(STORAGE_KEYS.QCMS, qcms.filter(q => q.id !== id));

    // Cleanup ratings
    const ratings = this.getStore<UserRating>(STORAGE_KEYS.RATINGS);
    this.saveStore(STORAGE_KEYS.RATINGS, ratings.filter(r => r.qcmId !== id));

    // Decrement count
    if (qcmToDelete.courseId) {
      const course = await this.getCourse(qcmToDelete.courseId);
      if (course) {
        await this.updateCourse(qcmToDelete.courseId, { 
          qcmCount: Math.max(0, (course.qcmCount || 1) - 1) 
        });
      }
    }
  }

  async addQCM(qcm: Omit<QCM, 'id' | 'createdAt'>): Promise<QCM> {
    const qcms = this.getStore<QCM>(STORAGE_KEYS.QCMS);
    const newQcm: QCM = {
      ...qcm,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString() as any
    };
    qcms.push(newQcm);
    this.saveStore(STORAGE_KEYS.QCMS, qcms);

    if (qcm.courseId) {
      const course = await this.getCourse(qcm.courseId);
      if (course) {
        await this.updateCourse(qcm.courseId, { 
          qcmCount: (course.qcmCount || 0) + 1 
        });
      }
    }

    return newQcm;
  }

  async addQCMS(qcmsList: Omit<QCM, 'id' | 'createdAt'>[]): Promise<void> {
    const qcms = this.getStore<QCM>(STORAGE_KEYS.QCMS);
    const newQcms = qcmsList.map(q => ({
      ...q,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString() as any
    }));
    
    this.saveStore(STORAGE_KEYS.QCMS, [...qcms, ...newQcms]);

    if (qcmsList[0]?.courseId) {
      const courseId = qcmsList[0].courseId;
      const course = await this.getCourse(courseId);
      if (course) {
        await this.updateCourse(courseId, { 
          qcmCount: (course.qcmCount || 0) + qcmsList.length 
        });
      }
    }
  }

  // Ratings
  async getRatings(userId: string, courseId: string): Promise<UserRating[]> {
    const ratings = this.getStore<UserRating>(STORAGE_KEYS.RATINGS);
    if (courseId === 'all') {
      return ratings.filter(r => r.userId === userId);
    }
    return ratings.filter(r => r.userId === userId && r.courseId === courseId);
  }

  async rateQCM(userId: string, courseId: string, qcmId: string, rating: 1 | 2 | 3 | null): Promise<UserRating | null> {
    if (rating === null) {
      await this.removeRating(userId, qcmId);
      return null;
    }
    return this.saveRating({ userId, courseId, qcmId, rating });
  }

  async removeRating(userId: string, qcmId: string): Promise<void> {
    const ratings = this.getStore<UserRating>(STORAGE_KEYS.RATINGS);
    this.saveStore(STORAGE_KEYS.RATINGS, ratings.filter(r => r.userId === userId && r.qcmId !== qcmId));
  }

  async saveRating(rating: Omit<UserRating, 'id' | 'lastUpdated'>): Promise<UserRating> {
    const ratings = this.getStore<UserRating>(STORAGE_KEYS.RATINGS);
    const existingIndex = ratings.findIndex(r => r.userId === rating.userId && r.qcmId === rating.qcmId);
    
    const ratingWithMetadata: UserRating = {
      ...(existingIndex >= 0 ? ratings[existingIndex] : {}),
      ...rating,
      id: existingIndex >= 0 ? ratings[existingIndex].id : Math.random().toString(36).substr(2, 9),
      lastUpdated: new Date().toISOString() as any
    };

    if (existingIndex >= 0) {
      ratings[existingIndex] = ratingWithMetadata;
    } else {
      ratings.push(ratingWithMetadata);
    }

    this.saveStore(STORAGE_KEYS.RATINGS, ratings);
    return ratingWithMetadata;
  }

  async deleteAttachment(courseId: string, attachmentIndex: number): Promise<Course> {
    const course = await this.getCourse(courseId);
    if (!course) throw new Error('Course not found');
    
    const attachments = [...(course.attachments || [])];
    attachments.splice(attachmentIndex, 1);
    
    return this.updateCourse(courseId, { attachments });
  }

  async clearCourseQCMS(courseId: string): Promise<void> {
    const qcms = this.getStore<QCM>(STORAGE_KEYS.QCMS);
    this.saveStore(STORAGE_KEYS.QCMS, qcms.filter(q => q.courseId !== courseId));
    
    const ratings = this.getStore<UserRating>(STORAGE_KEYS.RATINGS);
    this.saveStore(STORAGE_KEYS.RATINGS, ratings.filter(r => r.courseId !== courseId));
    
    await this.updateCourse(courseId, { qcmCount: 0 });
  }

  async openFile(url: string): Promise<void> {
    if (!url) return;
    window.open(url, '_blank');
  }
}

export const storageService = new StorageService();
