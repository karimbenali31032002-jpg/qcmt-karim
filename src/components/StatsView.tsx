import { useState, useEffect } from 'react';
import { storageService } from '@/src/lib/storageService';
import { handleFirestoreError, OperationType, auth } from '@/src/lib/firebase';
import { Course, QCM, UserRating } from '@/src/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  ChevronRight, 
  BookOpen,
  ArrowRight,
  History
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export function StatsView() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [ratings, setRatings] = useState<UserRating[]>([]);
  const [qcms, setQcms] = useState<Record<string, QCM>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cData = await storageService.getCourses();
        setCourses(cData.filter(c => c.qcmCount > 0));
        
        const rData = await storageService.getRatings(auth.currentUser?.uid || 'mock', 'all'); // Modified storage service to handle 'all'
        setRatings(rData);
        
        // Fetch all QCMs to populate map
        const qMap: Record<string, QCM> = {};
        for(const course of cData) {
          const courseQcms = await storageService.getQCMS(course.id);
          courseQcms.forEach(q => qMap[q.id] = q);
        }
        setQcms(qMap);
        
        setLoading(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'stats');
      }
    };
    fetchData();
  }, []);

  const filteredRatings = ratings.filter(r => {
    const courseMatch = selectedCourseId === 'all' || r.courseId === selectedCourseId;
    const ratingMatch = selectedRating === 'all' || r.rating.toString() === selectedRating;
    return courseMatch && ratingMatch;
  });

  return (
    <div className="space-y-12 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-10">
        <div className="space-y-2">
          <h1 className="text-4xl font-serif italic text-white tracking-tight">Intelligence Stratifiée</h1>
          <p className="text-white/40 text-sm max-w-lg uppercase tracking-widest font-medium">Analyse cognitive de votre progression et priorisation des révisions par rang.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-full border border-white/10 shadow-inner">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
              <span className="text-[10px] font-bold text-red-500/70">{ratings.filter(r => r.rating === 1).length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
              <span className="text-[10px] font-bold text-amber-500/70">{ratings.filter(r => r.rating === 2).length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
              <span className="text-[10px] font-bold text-green-500/70">{ratings.filter(r => r.rating === 3).length}</span>
            </div>
          </div>
        </div>
      </div>

      <Card className="rounded-[3rem] border-white/5 bg-[#0F0F0F] shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-white/5 bg-white/[0.02] flex flex-wrap gap-6 items-center">
          <div className="flex-1 min-w-[240px] group">
             <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger className="rounded-full h-12 bg-white/5 border-white/10 text-white focus:ring-amber-500/50">
                  <SelectValue placeholder="Modules" />
                </SelectTrigger>
                <SelectContent className="bg-[#0F0F0F] border-white/10 text-white">
                  <SelectItem value="all">Tous les modules révisés</SelectItem>
                  {courses.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
          <div className="w-[200px]">
             <Select value={selectedRating} onValueChange={setSelectedRating}>
                <SelectTrigger className="rounded-full h-12 bg-white/5 border-white/10 text-white focus:ring-amber-500/50">
                  <SelectValue placeholder="Niveau" />
                </SelectTrigger>
                <SelectContent className="bg-[#0F0F0F] border-white/10 text-white">
                  <SelectItem value="all">Tous les rangs</SelectItem>
                  <SelectItem value="1">Rang 1 (Banal)</SelectItem>
                  <SelectItem value="2">Rang 2 (Moyen)</SelectItem>
                  <SelectItem value="3">Rang 3 (Crucial)</SelectItem>
                </SelectContent>
              </Select>
          </div>
          <Badge variant="outline" className="ml-auto rounded-full border-amber-500/10 text-amber-500/30 text-[9px] uppercase tracking-widest font-mono px-4 h-12 flex items-center">
            {filteredRatings.length} QCM Filtrés
          </Badge>
        </div>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            {filteredRatings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-40 text-white/10">
                <Search className="w-16 h-16 mb-6 opacity-5" />
                <p className="font-serif italic text-lg opacity-30">Aucun ciblage disponible pour ces filtres</p>
                <p className="text-[10px] uppercase tracking-widest mt-2 opacity-10">Veuillez ajuster les paramètres de sélection</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredRatings.map((rating) => {
                  const qcm = qcms[rating.qcmId];
                  const course = courses.find(c => c.id === rating.courseId);
                  if (!qcm) return null;

                  return (
                    <div key={rating.id} className="p-10 hover:bg-white/[0.02] transition-all group border-l-4 border-transparent hover:border-l-amber-500/30">
                      <div className="flex justify-between items-start gap-12">
                        <div className="space-y-4 flex-1">
                          <div className="flex items-center gap-4">
                             <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] uppercase font-bold tracking-widest text-white/30 group-hover:text-amber-500/50 transition-colors">
                               {course?.title || 'Course Index'}
                             </div>
                             <div className={cn(
                               "w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor]",
                               rating.rating === 1 ? "text-red-500 bg-red-500" :
                               rating.rating === 2 ? "text-amber-500 bg-amber-500" : "text-green-500 bg-green-500"
                             )}></div>
                          </div>
                          <h3 className="text-xl md:text-2xl font-serif italic text-white/80 leading-relaxed group-hover:text-white transition-colors">
                            {qcm.question}
                          </h3>
                        </div>
                        <div className={cn(
                          "w-16 h-16 rounded-[1.5rem] flex flex-col items-center justify-center shrink-0 border transition-all duration-500 group-hover:scale-110",
                          rating.rating === 1 ? "bg-red-500/10 border-red-500/20 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.05)]" :
                          rating.rating === 2 ? "bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.05)]" : 
                          "bg-green-500/10 border-green-500/20 text-green-500 shadow-[0_0_30px_rgba(34,197,94,0.05)]"
                        )}>
                          <span className="text-[9px] uppercase font-bold tracking-tighter opacity-40">RANG</span>
                          <span className="text-2xl font-bold font-mono leading-none">{rating.rating}</span>
                        </div>
                      </div>
                      <div className="mt-8 pt-8 border-t border-white/[0.03] flex items-center justify-between">
                         <div className="flex items-center gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 font-mono">
                            <span className="flex items-center gap-2">
                              <History className="w-3.5 h-3.5 text-white/10" /> 
                              {rating.lastUpdated?.toDate ? rating.lastUpdated.toDate().toLocaleDateString() : 'Récemment'}
                            </span>
                            <span className="flex items-center gap-2">
                              <BookOpen className="w-3.5 h-3.5 text-white/10" /> 
                              {qcm.options.length} OPTIONS DÉTECTÉES
                            </span>
                         </div>
                         <Button variant="ghost" size="sm" className="h-10 rounded-full px-6 gap-2 text-white/40 font-bold hover:text-amber-500 hover:bg-amber-500/10 border border-white/5 transition-all">
                           Cibler <ArrowRight className="w-4 h-4" />
                         </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
