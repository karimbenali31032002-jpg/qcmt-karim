import { useState, useEffect } from 'react';
import { storageService } from '@/src/lib/storageService';
import { handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { Course, QCM, UserRating } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  ChevronLeft, 
  Plus, 
  Play, 
  Trash2, 
  FileText, 
  Download, 
  X,
  FilePlus,
  History,
  Settings,
  ChevronRight,
  Star
} from 'lucide-react';
import { auth } from '@/src/lib/firebase';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface CourseViewProps {
  course: Course;
  onStartSession: (qcms?: QCM[]) => void;
  onBack: () => void;
  onImportQcm: () => void;
}

export function CourseView({ course, onStartSession, onBack, onImportQcm }: CourseViewProps) {
  const [currentCourse, setCurrentCourse] = useState<Course>(course);
  const [qcms, setQcms] = useState<QCM[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const qData = await storageService.getQCMS(currentCourse.id);
      setQcms(qData);
      
      const rData = await storageService.getRatings(auth.currentUser?.uid || 'mock', currentCourse.id);
      const rMap: Record<string, number> = {};
      rData.forEach(r => rMap[r.qcmId] = r.rating);
      setRatings(rMap);
      
      setLoading(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `course data for ${currentCourse.id}`);
    }
  };

  const handleStartFilteredSession = (level: number) => {
    const filtered = qcms.filter(q => ratings[q.id] === level);
    if (filtered.length === 0) {
      toast.info("Aucun QCM trouvé dans ce niveau de priorité.");
      return;
    }
    onStartSession(filtered);
  };

  useEffect(() => {
    setCurrentCourse(course);
  }, [course]);

  useEffect(() => {
    fetchData();
  }, [currentCourse.id]);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleClearQCMS = async () => {
    if (deleteConfirm !== 'clear') {
      setDeleteConfirm('clear');
      toast.info("Cliquez à nouveau pour CONFIRMER la suppression de TOUS les QCM.");
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }
    
    try {
      await storageService.clearCourseQCMS(currentCourse.id);
      toast.success("Tous les QCM ont été supprimés.");
      setQcms([]);
      setRatings({});
      setDeleteConfirm(null);
      setCurrentCourse({ ...currentCourse, qcmCount: 0 });
    } catch (e) {
      toast.error("Erreur lors de la suppression.");
    }
  };

  const handleDeleteCourse = async () => {
    if (deleteConfirm !== 'delete') {
      setDeleteConfirm('delete');
      toast.warning("Cliquez à nouveau pour CONFIRMER la suppression du MODULE.");
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }

    try {
      await storageService.deleteCourse(currentCourse.id);
      toast.success("Module supprimé.");
      onBack();
    } catch (e) {
      toast.error("Erreur lors de la suppression.");
    }
  };

  const handleDeleteAttachment = async (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (deleteConfirm !== `file-${index}`) {
      setDeleteConfirm(`file-${index}`);
      toast.info("Confirmer la suppression du PDF ?");
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }

    try {
      const updated = await storageService.deleteAttachment(currentCourse.id, index);
      setCurrentCourse(updated);
      toast.success("Document supprimé.");
      setDeleteConfirm(null);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la suppression.");
    }
  };

  const ratedCount = Object.keys(ratings).length;
  const progress = qcms.length > 0 ? (ratedCount / qcms.length) * 100 : 0;

  const countByRating = (r: 1 | 2 | 3) => {
    return Object.values(ratings).filter(val => val === r).length;
  };

  const [filter, setFilter] = useState<'all' | 'unrated' | '1' | '2' | '3'>('all');

  const filteredQcms = qcms.filter(q => {
    if (filter === 'all') return true;
    if (filter === 'unrated') return !ratings[q.id];
    return ratings[q.id] === parseInt(filter);
  });

  return (
    <div className="space-y-12 py-10">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack} 
            className="rounded-full h-12 w-12 text-white/40 hover:text-white hover:bg-white/5 border border-white/5"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-4xl font-serif italic text-white leading-tight">{currentCourse.title}</h1>
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/20">Synthèse du module #{currentCourse.id.slice(0, 4)}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={onImportQcm}
            className="bg-amber-600/10 hover:bg-amber-600/20 text-amber-500 border border-amber-600/20 rounded-full h-12 px-6 gap-2 text-xs font-bold uppercase tracking-widest"
          >
            <FilePlus className="w-4 h-4" />
            Ajouter QCM (PDF)
          </Button>
          <Button 
            variant="outline" 
            onClick={handleClearQCMS}
            className="rounded-full border-red-500/20 text-red-500/60 hover:text-red-500 hover:bg-red-500/5 transition-all text-[10px] font-bold uppercase tracking-widest px-4 h-12"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Vider
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleDeleteCourse}
            className="rounded-full h-12 w-12 text-red-500/20 hover:text-red-500 hover:bg-red-500/5 border border-red-500/10"
            title="Supprimer le module"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <Card className="rounded-[3rem] border-white/5 bg-[#0F0F0F] overflow-hidden shadow-2xl">
            <CardHeader className="bg-white/[0.02] p-10 pb-6 border-b border-white/5">
              <CardTitle className="font-serif italic text-2xl text-white/80">Statut de Stratification</CardTitle>
              <CardDescription className="text-white/30 uppercase tracking-widest text-[10px] font-bold">Analyse de la progression par niveau de priorité</CardDescription>
            </CardHeader>
            <CardContent className="p-10 space-y-12">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-serif italic text-amber-500/70">Progression Globale</span>
                  <span className="text-3xl font-mono text-white">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="text-xs text-white/20 text-center uppercase tracking-widest font-bold">
                  {ratedCount} sur {qcms.length} QCM stratifiés
                </p>
              </div>

              <div className="grid grid-cols-3 gap-6">
                {[
                  { r: 1, label: 'Standard', color: 'bg-blue-500' },
                  { r: 2, label: 'Essentiel', color: 'bg-amber-500' },
                  { r: 3, label: 'Critique', color: 'bg-red-500' }
                ].map((item) => (
                  <div 
                    key={item.r} 
                    onClick={() => handleStartFilteredSession(item.r)}
                    className="flex flex-col items-center gap-4 p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 group hover:border-white/10 hover:bg-white/[0.04] transition-all cursor-pointer relative"
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center font-mono text-xl font-bold text-black shadow-lg mb-1",
                      item.color
                    )}>
                      {item.r}
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold mb-1">{item.label}</p>
                      <p className="text-3xl font-mono font-bold text-white group-hover:text-amber-500 transition-colors uppercase">{countByRating(item.r as 1|2|3)}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/10 absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>

              <Button 
                onClick={() => onStartSession(qcms)}
                className="w-full bg-amber-600 hover:bg-amber-500 text-black h-16 rounded-[2rem] text-xl font-bold gap-3 shadow-2xl shadow-amber-600/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="w-6 h-6 fill-current" />
                Lancer la session
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="rounded-[2.5rem] border-white/5 bg-[#0F0F0F] shadow-xl overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-lg font-serif italic text-white/80">Informations</CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-4">
              <div className="space-y-3">
                <Label className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-bold">Documents de Support</Label>
                {currentCourse.attachments && currentCourse.attachments.length > 0 ? (
                  <div className="space-y-2">
                    {currentCourse.attachments.map((attachment, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/[0.07] transition-all cursor-pointer group"
                        onClick={() => storageService.openFile(attachment.url)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                          <FileText className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-xs text-white/70 truncate group-hover:text-white transition-colors">{attachment.name}</span>
                          <span className="text-[9px] text-white/20 uppercase font-mono tracking-tighter">PDF SOURCE</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="w-8 h-8 rounded-lg text-white/10 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          onClick={(e) => handleDeleteAttachment(e, index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-4 text-white/10 py-2">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                      <FileText className="w-5 h-5 opacity-20" />
                    </div>
                    <span className="text-xs italic">Aucun PDF associé</span>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-white/5 space-y-4">
                <div className="flex items-center gap-4 text-white/50">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                    <History className="w-5 h-5 text-white/20" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/20">Dernière Strat</span>
                    <span className="text-sm">--</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-6 border-t border-white/5 space-y-3">
                <Label className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-bold">Filtres de ciblage</Label>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="rounded-lg border-white/10 text-white/40 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-tighter">Rang 3 Uniquement</Badge>
                  <Badge variant="outline" className="rounded-lg border-white/10 text-white/40 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-tighter">Aléatoire</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button variant="ghost" className="w-full h-14 rounded-2xl text-white/20 hover:text-white hover:bg-white/5 border border-white/5 uppercase tracking-widest text-[10px] font-bold gap-3">
            <Settings className="w-4 h-4" />
            Paramètres du module
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-serif italic text-2xl text-white/80">Banque de QCM Stratifiés</h2>
            <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Sélection et ciblage des révisions</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
              {[
                { id: 'all', label: 'Tous', count: qcms.length },
                { id: 'unrated', label: 'À Classer', count: qcms.length - ratedCount },
                { id: '1', label: 'P1', count: countByRating(1) },
                { id: '2', label: 'P2', count: countByRating(2) },
                { id: '3', label: 'P3', count: countByRating(3) }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as any)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                    filter === f.id 
                      ? "bg-amber-600 text-black shadow-lg" 
                      : "text-white/20 hover:text-white hover:bg-white/5"
                  )}
                >
                  {f.label}
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-md text-[9px]",
                    filter === f.id ? "bg-black/20" : "bg-white/5 text-white/40"
                  )}>{f.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {filteredQcms.map((qcm, idx) => (
            <div 
              key={qcm.id} 
              className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all flex items-start gap-6 group"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 text-[10px] font-mono text-white/20 group-hover:text-amber-500 transition-colors">
                #{idx + 1}
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-white/80 font-medium leading-relaxed">{qcm.question}</p>
                {qcm.context && (
                  <p className="text-[10px] text-white/20 italic font-serif truncate max-w-xl">
                    Cas: {qcm.context.slice(0, 100)}...
                  </p>
                )}
                <div className="flex items-center gap-2 pt-3">
                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 gap-1">
                    {[
                      { v: 1, color: 'bg-blue-500', hover: 'hover:bg-blue-500/20' },
                      { v: 2, color: 'bg-amber-500', hover: 'hover:bg-amber-500/20' },
                      { v: 3, color: 'bg-red-500', hover: 'hover:bg-red-500/20' }
                    ].map(btn => (
                      <button
                        key={btn.v}
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const newRating = await storageService.rateQCM(auth.currentUser?.uid || 'mock', currentCourse.id, qcm.id, btn.v as 1|2|3);
                            setRatings(prev => ({ ...prev, [qcm.id]: newRating?.rating || 0 }));
                            toast.success(`Classé en Niveau ${btn.v}`);
                          } catch (err) {
                            toast.error("Erreur de classement");
                          }
                        }}
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-mono font-bold transition-all",
                          ratings[qcm.id] === btn.v 
                            ? `${btn.color} text-black shadow-lg scale-110 z-10` 
                            : `text-white/20 ${btn.hover} hover:text-white`
                        )}
                      >
                        {btn.v}
                      </button>
                    ))}

                    {ratings[qcm.id] && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await storageService.rateQCM(auth.currentUser?.uid || 'mock', currentCourse.id, qcm.id, null);
                            setRatings(prev => {
                              const next = { ...prev };
                              delete next[qcm.id];
                              return next;
                            });
                            toast.info("Classement retiré");
                          } catch (err) {
                            toast.error("Erreur");
                          }
                        }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/10 hover:text-white hover:bg-white/10 transition-all ml-1"
                        title="Retirer le classement"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {qcm.sourcePdfName && (
                    <span className="text-[9px] text-white/20 uppercase tracking-widest font-bold flex items-center gap-1 ml-2">
                      <FileText className="w-3 h-3" />
                      {qcm.sourcePdfName}
                    </span>
                  )}
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="opacity-0 group-hover:opacity-100 transition-all rounded-full h-10 w-10 text-white/10 hover:text-red-500 hover:bg-red-500/5"
                onClick={async () => {
                  try {
                    await storageService.deleteQCM(qcm.id);
                    setQcms(prev => prev.filter(q => q.id !== qcm.id));
                    toast.success("QCM supprimé.");
                  } catch (e) {
                    toast.error("Erreur de suppression.");
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {qcms.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-center gap-4 opacity-20 italic">
              <FileText className="w-12 h-12" />
              <p>Aucun QCM dans ce module</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
