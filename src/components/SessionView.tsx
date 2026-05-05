import { useState, useEffect } from 'react';
import { storageService } from '@/src/lib/storageService';
import { handleFirestoreError, OperationType, auth } from '@/src/lib/firebase';
import { Course, QCM, UserRating } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Info, 
  Flag,
  ArrowRight,
  FileText,
  Trash2,
  Download,
  Trophy
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { generateStratificationPDF } from '@/src/lib/pdfService';

interface SessionViewProps {
  course?: Course | null;
  initialQcms?: QCM[];
  onFinish: () => void;
}

export function SessionView({ course, initialQcms, onFinish }: SessionViewProps) {
  const [qcms, setQcms] = useState<QCM[]>(initialQcms || []);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [loading, setLoading] = useState(!initialQcms);
  const [sessionFinished, setSessionFinished] = useState(false);

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        let qData = initialQcms;
        
        if (!qData && course) {
          // Fetch QCMs if not provided
          qData = await storageService.getQCMS(course.id);
          setQcms(qData);
        }

        if (qData) {
          // Fetch Ratings
          const rData = await storageService.getRatings(
            auth.currentUser?.uid || 'mock', 
            course?.id || 'all'
          );
          const rMap: Record<string, number> = {};
          rData.forEach(r => rMap[r.qcmId] = r.rating);
          setRatings(rMap);
          
          // Find first unrated
          const firstUnrated = qData.findIndex(q => !rMap[q.id]);
          if (firstUnrated !== -1) {
            setCurrentIndex(firstUnrated);
          }
        }
        
        setLoading(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, `session data`);
      }
    };
    fetchSessionData();
  }, [course?.id, initialQcms]);

  const handleRate = async (rating: 1 | 2 | 3) => {
    const qcm = qcms[currentIndex];
    
    try {
      await storageService.saveRating({
        userId: auth.currentUser?.uid || 'mock',
        qcmId: qcm.id,
        courseId: course?.id,
        rating: rating,
      });

      setRatings(prev => ({ ...prev, [qcm.id]: rating }));
      
      if (currentIndex < qcms.length - 1) {
        setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
          setShowAnswer(false);
          setSelectedIndices([]);
        }, 300);
      } else {
        setSessionFinished(true);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'userRatings');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const courseTitle = course?.title || "Session Médicale";
      await generateStratificationPDF(courseTitle, 'session', qcms, ratings);
      toast.success("PDF généré avec succès");
    } catch (e) {
      toast.error("Erreur lors de la génération du PDF");
      console.error(e);
    }
  };

  if (loading) return null;

  if (sessionFinished) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#0F0F0F] border border-white/5 rounded-[3rem] p-12 text-center shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 blur-[100px] -z-10" />
          
          <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-amber-500/20">
            <Trophy className="w-10 h-10 text-amber-500" />
          </div>

          <h1 className="text-4xl font-serif italic text-white mb-4">Session Stratifiée</h1>
          <p className="text-white/40 text-lg max-w-md mx-auto mb-12">
            Bravo ! Vous avez terminé la stratification de {qcms.length} QCM. Vos priorités de révision sont mémorisées.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              onClick={handleDownloadPDF}
              className="bg-amber-500 hover:bg-amber-400 text-black px-10 h-14 rounded-full font-bold shadow-xl shadow-amber-500/20 flex items-center gap-2 group w-full sm:w-auto"
            >
              <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
              Télécharger le PDF
            </Button>
            <Button 
              variant="outline"
              onClick={onFinish}
              className="border-white/10 hover:bg-white/5 text-white px-10 h-14 rounded-full font-bold w-full sm:w-auto"
            >
              Retour au Module
            </Button>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-8 pt-12 border-t border-white/5">
            {[1, 2, 3].map(r => {
              const count = Object.values(ratings).filter(v => v === r).length;
              return (
                <div key={r} className="space-y-1">
                  <div className="text-2xl font-mono font-bold text-white/90">{count}</div>
                  <div className={cn(
                    "text-[10px] uppercase tracking-widest font-bold",
                    r === 1 ? "text-blue-500" : r === 2 ? "text-amber-500" : "text-red-500"
                  )}>Rang {r}</div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    );
  }

  if (qcms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-slate-500">Aucun QCM disponible pour ce cours.</p>
        <Button onClick={onFinish}>Retour</Button>
      </div>
    );
  }

  const currentQCM = qcms[currentIndex];
  const currentRating = ratings[currentQCM.id];
  const progress = ((currentIndex + 1) / qcms.length) * 100;

  const toggleOption = (idx: number) => {
    if (showAnswer) return;
    setSelectedIndices(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const isCorrect = (idx: number) => {
    return currentQCM.answerIndices?.includes(idx) || (idx === (currentQCM as any).answerIndex);
  };

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleClearCourse = async () => {
    if (deleteConfirm !== 'clear') {
      setDeleteConfirm('clear');
      toast.info("Cliquez à nouveau pour CONFIRMER la suppression de TOUTE la session.");
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }
    
    try {
      const cid = course?.id || qcms[0]?.courseId || 'none';
      await storageService.clearCourseQCMS(cid);
      toast.success("Session vidée avec succès.");
      setDeleteConfirm(null);
      onFinish();
    } catch (e) {
      toast.error("Erreur lors de la suppression.");
    }
  };

  const scrollToContext = () => {
    const el = document.getElementById('clinical-context');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a brief highlight effect
      const originalBorder = el.style.borderColor;
      el.style.borderColor = '#f59e0b';
      setTimeout(() => {
        el.style.borderColor = originalBorder;
      }, 2000);
    } else {
      toast.error("Aucun renseignement clinique disponible.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-10">
      <div className="flex items-center justify-between gap-8 sticky top-24 bg-[#0A0A0A]/90 backdrop-blur-md z-30 py-4 border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={onFinish} className="rounded-full text-white/30 hover:text-white hover:bg-white/5">
          <X className="w-6 h-6" />
        </Button>
        <div className="flex-1 max-w-md">
          <div className="flex justify-between text-[10px] uppercase tracking-[0.2em] font-bold text-white/20 mb-2">
            <span className="font-serif italic capitalize tracking-normal text-white/40">Progression Session</span>
            <span>{currentIndex + 1} / {qcms.length}</span>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-amber-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={scrollToContext}
              className={cn(
                "rounded-full border-amber-500/20 bg-amber-500/5 text-amber-500 text-[10px] font-bold uppercase tracking-widest px-4 hover:bg-amber-500/10 h-8",
                !currentQCM.context && "opacity-0 pointer-events-none"
              )}
            >
              Cas
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDownloadPDF}
              className="text-amber-500/60 hover:text-amber-500 hover:bg-amber-500/5 text-[10px] font-bold uppercase tracking-widest px-3 rounded-full h-8 gap-2"
              title="Télécharger le PDF de la session"
            >
              <Download className="w-3.5 h-3.5" />
              PDF
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearCourse}
              className="text-red-500/40 hover:text-red-500 hover:bg-red-500/5 text-[10px] font-bold uppercase tracking-widest px-2 rounded-full h-8"
              title="Supprimer tous les QCM de ce module"
            >
              Vider
            </Button>
           <Button 
            variant="ghost" 
            size="icon" 
            disabled={currentIndex === 0}
            onClick={() => { setCurrentIndex(prev => prev - 1); setShowAnswer(false); setSelectedIndices([]); }}
            className="text-white/30 hover:text-white"
           >
             <ChevronLeft className="w-5 h-5" />
           </Button>
           <Button 
            variant="ghost" 
            size="icon"
            disabled={currentIndex === qcms.length - 1}
            onClick={() => { setCurrentIndex(prev => prev + 1); setShowAnswer(false); setSelectedIndices([]); }}
            className="text-white/30 hover:text-white"
           >
             <ChevronRight className="w-5 h-5" />
           </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col gap-8"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-amber-500 font-mono text-sm tracking-tighter uppercase">Question #{currentIndex + 1}</span>
              {currentRating && (
                <div className={cn(
                  "px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                  currentRating === 1 ? "bg-red-500/10 text-red-500 border-red-500/20" :
                  currentRating === 2 ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                  "bg-green-500/10 text-green-500 border-green-500/20"
                )}>
                  RANG {currentRating}
                </div>
              )}
            </div>
            {currentQCM.context && (
              <div id="clinical-context" className="p-8 bg-amber-500/5 border border-amber-500/20 rounded-[2rem] text-sm italic text-white/50 leading-relaxed font-serif shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/30" />
                <div className="text-[10px] uppercase tracking-[0.3em] font-extrabold text-amber-500/60 mb-4 flex items-center gap-3">
                  <span className="w-8 h-[1px] bg-amber-500/30" />
                  Renseignement Clinique / Cas
                </div>
                <p className="pl-2">{currentQCM.context}</p>
              </div>
            )}
            <h2 className="text-3xl md:text-4xl font-serif italic text-white/90 leading-tight">
              {currentQCM.question}
            </h2>
          </div>

          <div className="grid gap-4 max-w-3xl">
            {currentQCM.options.map((option, idx) => (
              <button 
                key={idx}
                disabled={showAnswer}
                onClick={() => toggleOption(idx)}
                className={cn(
                  "group w-full text-left p-6 rounded-2xl border transition-all duration-300 flex items-start gap-6",
                  showAnswer 
                    ? isCorrect(idx)
                      ? "bg-green-500/10 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.1)]" 
                      : selectedIndices.includes(idx)
                        ? "bg-red-500/10 border-red-500/50"
                        : "bg-transparent border-white/5 opacity-30"
                    : selectedIndices.includes(idx)
                      ? "bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                      : "bg-white/[0.02] border-white/10 hover:border-amber-500/50 hover:bg-white/[0.05]"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-mono text-sm transition-colors",
                  showAnswer && isCorrect(idx) ? "bg-green-500 text-black font-bold" :
                  showAnswer && selectedIndices.includes(idx) && !isCorrect(idx) ? "bg-red-500 text-white font-bold" :
                  selectedIndices.includes(idx) ? "bg-amber-500 text-black font-bold" :
                  "bg-white/5 text-white/40 group-hover:text-amber-500 group-hover:bg-amber-500/10"
                )}>
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className={cn(
                  "text-lg pt-1.5",
                  showAnswer && isCorrect(idx) ? "text-green-100 font-medium" : 
                  showAnswer && selectedIndices.includes(idx) && !isCorrect(idx) ? "text-red-100" :
                  selectedIndices.includes(idx) ? "text-amber-500" :
                  "text-white/70"
                )}>
                  {option}
                </span>
                {showAnswer && isCorrect(idx) && (
                  <Check className="w-5 h-5 text-green-500 ml-auto mt-2 shrink-0" />
                )}
                {showAnswer && selectedIndices.includes(idx) && !isCorrect(idx) && (
                  <X className="w-5 h-5 text-red-500 ml-auto mt-2 shrink-0" />
                )}
              </button>
            ))}
          </div>

          {!showAnswer && selectedIndices.length > 0 && (
            <div className="flex justify-center py-4">
              <Button 
                onClick={() => setShowAnswer(true)}
                className="bg-amber-600 hover:bg-amber-500 text-black px-12 h-12 rounded-full font-bold shadow-xl shadow-amber-600/20 active:scale-95 transition-all"
              >
                Valider ma réponse
              </Button>
            </div>
          )}

          {showAnswer && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-10"
            >
              {currentQCM.explanation && (
                <div className="p-8 bg-blue-500/5 rounded-3xl border border-blue-500/10 flex gap-6 text-blue-200/70 text-lg italic font-serif">
                  <Info className="w-6 h-6 text-blue-500 shrink-0 mt-1" />
                  <p>{currentQCM.explanation}</p>
                </div>
              )}

              <div className="border-t border-white/5 pt-12 pb-20 flex flex-col items-center gap-10">
                <div className="text-center space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-bold">Évaluation de l'importance</p>
                  <p className="text-xs text-amber-500/50 font-serif italic">Déterminez la priorité de révision pour ce QCM</p>
                </div>

                <div className="flex gap-6 justify-center">
                  {[
                    { val: 1, label: 'Standard', color: 'blue' },
                    { val: 2, label: 'Essentiel', color: 'amber' },
                    { val: 3, label: 'Critique', color: 'red' }
                  ].map((r) => (
                    <button
                      key={r.val}
                      onClick={() => handleRate(r.val as 1|2|3)}
                      className={cn(
                        "w-24 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 active:scale-95 border",
                        r.val === 1 ? "bg-blue-500/5 border-blue-500/20 text-blue-500 hover:bg-blue-500/20" :
                        r.val === 2 ? "bg-amber-500/5 border-amber-500/20 text-amber-500 hover:bg-amber-500/20" :
                        "bg-red-500/5 border-red-500/20 text-red-500 hover:bg-red-500/20",
                        currentRating === r.val && (
                          r.val === 1 ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20" : 
                          r.val === 2 ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20" : 
                          "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20"
                        )
                      )}
                    >
                      <span className="text-2xl font-bold font-mono">{r.val}</span>
                      <span className="text-[9px] font-bold uppercase tracking-tighter opacity-70">{r.label}</span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-4">
                  {qcms[currentIndex].sourcePdfUrl && (
                    <Button 
                      variant="outline" 
                      onClick={() => storageService.openFile(qcms[currentIndex].sourcePdfUrl!)}
                      className="text-amber-500/50 border-amber-500/20 hover:text-amber-500 hover:bg-amber-500/5 rounded-full px-4 text-[10px] uppercase tracking-widest font-bold flex items-center gap-2"
                    >
                      <FileText className="w-3 h-3" />
                      PDF
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    onClick={async () => {
                      if (deleteConfirm !== 'qcm') {
                        setDeleteConfirm('qcm');
                        toast.info("Cliquez à nouveau pour SUPPRIMER ce QCM.");
                        setTimeout(() => setDeleteConfirm(null), 3000);
                        return;
                      }

                      try {
                        await storageService.deleteQCM(qcms[currentIndex].id);
                        toast.success("QCM supprimé de la base.");
                        setDeleteConfirm(null);
                        
                        if (qcms.length > 1) {
                          const newQcms = qcms.filter((_, i) => i !== currentIndex);
                          setQcms(newQcms);
                          setCurrentIndex(prev => Math.min(prev, newQcms.length - 1));
                          setShowAnswer(false);
                          setSelectedIndices([]);
                        } else {
                          onFinish();
                        }
                      } catch (e) {
                        toast.error("Erreur lors de la suppression.");
                      }
                    }}
                    className="text-white/10 hover:text-red-500 hover:bg-red-500/5 rounded-full px-4 text-[10px] uppercase tracking-widest font-bold flex items-center gap-2"
                  >
                    <Trash2 className="w-3 h-3" />
                    Supprimer
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => { if(currentIndex < qcms.length -1) setCurrentIndex(prev => prev + 1); setShowAnswer(false); }}
                    className="text-white/40 hover:text-white rounded-full px-8 text-xs uppercase tracking-widest font-bold"
                  >
                    Ignorer
                  </Button>
                  <Button 
                    onClick={() => { if(currentIndex < qcms.length -1) setCurrentIndex(prev => prev + 1); setShowAnswer(false); }}
                    className="bg-amber-600 hover:bg-amber-500 text-black rounded-full px-10 h-12 font-bold flex items-center gap-2 transition-all shadow-xl shadow-amber-600/10"
                  >
                    Suivant
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
