import { useState, useEffect } from 'react';
import { storageService } from '@/src/lib/storageService';
import { handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { Course } from '@/src/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  BookOpen, 
  ChevronRight,
  X,
  Loader2,
  Paperclip,
  Trash2,
  FilePlus
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DashboardProps {
  onSelectCourse: (course: Course) => void;
  onImportQcm: (courseId: string) => void;
}

export function Dashboard({ onSelectCourse, onImportQcm }: DashboardProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [supportFiles, setSupportFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const data = await storageService.getCourses();
      setCourses(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'courses');
    }
  };

  const handleAddCourse = async () => {
    if (!newCourseTitle.trim()) return;
    setIsUploading(true);
    try {
      const attachments = [];

      for (const file of supportFiles) {
        const url = await storageService.uploadFile(file);
        attachments.push({
          name: file.name,
          url: url,
          createdAt: new Date().toISOString()
        });
      }

      await storageService.addCourse({
        title: newCourseTitle,
        description: newCourseDesc,
        qcmCount: 0,
        attachments,
      });
      
      loadCourses();
      setNewCourseTitle('');
      setNewCourseDesc('');
      setSupportFiles([]);
      setIsAddOpen(false);
      toast.success("Module initialisé avec succès !");
    } catch (e) {
      console.error(e);
      handleFirestoreError(e, OperationType.CREATE, 'courses');
    } finally {
      setIsUploading(false);
    }
  };

  const [deleteIdConfirm, setDeleteIdConfirm] = useState<string | null>(null);

  const handleDeleteCourse = async (id: string) => {
    if (deleteIdConfirm !== id) {
      setDeleteIdConfirm(id);
      toast.info("Cliquez à nouveau pour CONFIRMER la suppression complète.");
      setTimeout(() => setDeleteIdConfirm(null), 3000);
      return;
    }

    try {
      await storageService.deleteCourse(id);
      toast.success("Module supprimé.");
      setDeleteIdConfirm(null);
      loadCourses();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Erreur lors de la suppression.");
    }
  };

  const filteredCourses = courses.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-10 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-10">
        <div className="space-y-2">
          <h1 className="text-4xl font-serif italic text-white tracking-tight">Répertoire des Cours</h1>
          <p className="text-white/40 text-sm max-w-lg uppercase tracking-widest font-medium">Gestion et stratification des 75 modules du programme de résidanat.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-amber-500 transition-colors" />
            <Input 
              placeholder="Rechercher un module..." 
              className="pl-12 h-12 rounded-full bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:ring-amber-500/50 focus:border-amber-500/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger render={
              <Button className="bg-amber-600 hover:bg-amber-500 text-black font-bold h-12 rounded-full px-8 gap-2 shadow-lg shadow-amber-600/10 transition-all hover:scale-105 active:scale-95">
                <Plus className="w-5 h-5" />
                Nouveau
              </Button>
            } />
            <DialogContent className="bg-[#0F0F0F] border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="font-serif italic text-2xl text-amber-500">Nouveau Module</DialogTitle>
                <DialogDescription className="text-white/40 uppercase tracking-widest text-[10px] font-bold">
                  Initialisation d'une nouvelle fiche de révision
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-6">
                <div className="grid gap-3">
                  <Label htmlFor="title" className="text-xs uppercase tracking-widest text-white/60">Titre du module</Label>
                  <Input 
                    id="title" 
                    value={newCourseTitle} 
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                    placeholder="Ex: Cardiologie - Valvulopathies" 
                    className="bg-white/5 border-white/10 rounded-xl h-12 focus:ring-amber-500/50"
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="desc" className="text-xs uppercase tracking-widest text-white/60">Notes ou Contextualisation</Label>
                  <Input 
                    id="desc" 
                    value={newCourseDesc} 
                    onChange={(e) => setNewCourseDesc(e.target.value)}
                    placeholder="Sources, dates ou détails du support" 
                    className="bg-white/5 border-white/10 rounded-xl h-12 focus:ring-amber-500/50"
                  />
                </div>
                <div className="grid gap-3">
                  <Label className="text-xs uppercase tracking-widest text-white/60">Documents de Support (PDFs)</Label>
                  <div 
                    className={cn(
                      "group cursor-pointer border border-dashed rounded-xl p-6 transition-all flex flex-col items-center justify-center gap-2",
                      supportFiles.length > 0 ? "bg-amber-500/10 border-amber-500/50" : "bg-white/5 border-white/10 hover:border-white/20"
                    )}
                    onClick={() => document.getElementById('support-upload')?.click()}
                  >
                    <input 
                      type="file" 
                      id="support-upload" 
                      className="hidden" 
                      accept="application/pdf"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setSupportFiles(prev => [...prev, ...files]);
                      }}
                    />
                    {supportFiles.length > 0 ? (
                      <div className="flex flex-wrap gap-2 justify-center">
                        {supportFiles.map((f, i) => (
                           <Badge key={i} variant="outline" className="text-[9px] bg-amber-500/20 border-amber-500/30 text-amber-500 flex gap-2 items-center">
                             {f.name.slice(0, 15)}...
                             <X className="w-3 h-3 cursor-pointer" onClick={(e) => {
                               e.stopPropagation();
                               setSupportFiles(prev => prev.filter((_, idx) => idx !== i));
                             }} />
                           </Badge>
                        ))}
                        <Plus className="w-4 h-4 text-amber-500/50" />
                      </div>
                    ) : (
                      <>
                        <Paperclip className="w-6 h-6 text-white/20 group-hover:text-white/40" />
                        <span className="text-[10px] text-white/40 group-hover:text-white/60 font-medium">
                          Joindre un ou plusieurs PDFs
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="text-white/40 hover:text-white hover:bg-white/5">Annuler</Button>
                <Button onClick={handleAddCourse} disabled={!newCourseTitle.trim() || isUploading} className="bg-amber-600 hover:bg-amber-500 text-black font-bold px-8 rounded-full">
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Initialiser"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <div className="text-center py-32 bg-white/5 rounded-[3rem] border border-white/10">
          <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/10">
            <BookOpen className="w-10 h-10 text-white/20" />
          </div>
          <p className="text-white/60 font-serif italic text-xl mb-2">Aucun module répertorié</p>
          <p className="text-xs text-white/20 uppercase tracking-widest">Utilisez le bouton "Nouveau" pour commencer.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCourses.map((course) => (
            <Card 
              key={course.id} 
              className="group relative bg-[#0F0F0F] hover:bg-[#141414] transition-all duration-500 border-white/5 hover:border-amber-500/30 overflow-hidden cursor-pointer rounded-[2.5rem] shadow-2xl shadow-black/50"
              onClick={() => onSelectCourse(course)}
            >
              <div className="absolute top-4 right-4 flex gap-2 z-10">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-amber-500/10 text-white/20 hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-all"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onImportQcm(course.id);
                  }}
                  title="Ajouter un PDF de QCM"
                >
                  <FilePlus className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/10 text-white/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteCourse(course.id);
                  }}
                  title="Supprimer le module"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-2xl font-serif italic text-white/90 group-hover:text-amber-500 transition-colors line-clamp-2 pr-12">{course.title}</CardTitle>
                <CardDescription className="text-white/40 line-clamp-2 min-h-[3rem] text-sm mt-2 leading-relaxed">
                  {course.description || "Aucun détail complémentaire sur ce module."}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <div className="flex flex-col gap-6">
                   <div className="flex items-center gap-6 text-xs font-mono uppercase tracking-tighter text-white/30">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                      <span>{course.qcmCount} QCM</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
                      <span>{course.createdAt?.toDate ? course.createdAt.toDate().toLocaleDateString() : 'Récemment'}</span>
                    </div>
                  </div>
                  <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                    <div className="bg-amber-500/30 h-full rounded-full" style={{ width: '40%' }}></div>
                  </div>
                </div>
              </CardContent>
              <footer className="px-8 py-6 border-t border-white/5 bg-white/[0.02] flex justify-between items-center">
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Ciblage Intelligence</span>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
              </footer>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
