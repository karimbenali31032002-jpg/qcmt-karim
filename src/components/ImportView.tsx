import { useState, useEffect, useRef } from 'react';
import { storageService } from '@/src/lib/storageService';
import { Course, QCM } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Sparkles, Upload, CheckCircle2, FileText, X } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface ImportViewProps {
  onComplete: (qcms?: QCM[]) => void;
  initialCourseId?: string;
}

export function ImportView({ onComplete, initialCourseId }: ImportViewProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId || 'none');
  const [rawText, setRawText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importedQcms, setImportedQcms] = useState<QCM[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      const data = await storageService.getCourses();
      setCourses(data);
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    if (initialCourseId) {
      setSelectedCourseId(initialCourseId);
    }
  }, [initialCourseId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      // Auto extraction removed in favor of native Gemini PDF support
      toast.info("PDF chargé. Gemini l'analysera lors de l'importation.");
    } else if (file) {
      toast.error("Veuillez sélectionner un fichier PDF.");
    }
  };

  const handleImport = async () => {
    if (!rawText.trim() && !pdfFile) return;
    setIsProcessing(true);
    setImportedQcms([]);

    try {
      const prompt = `Extraire les QCM du document ou du texte médical fourni et les formater en JSON. 
      IMPORTANT : Analyser chaque question pour identifier s'il y a un "Cas Clinique" ou un "Renseignement" préliminaire.
      
      Règles pour le champ 'context' :
      - Le 'context' est l'énoncé qui décrit la situation clinique (ex: "Un enfant de 6 ans, sans antécédents, hospitalisé pour une fièvre à 39°C...").
      - Si le même 'context' s'applique à plusieurs questions, REPRODUISEZ-LE exactement pour chaque QCM.
      - Ne pas inclure ce texte dans le champ 'question'.
      
      Règles pour le champ 'question' :
      - Il doit contenir uniquement l'interrogation (ex: "Quel examen pratiquez-vous en première intention ?").
      
      Règles pour le champ 'answerIndices' :
      - C'est un tableau d'entiers (ex: [0, 2] pour A et C).
      - Identifiez bien s'il y a plus d'une réponse exacte.
      
      Format attendu:
      {
        "context": "Énoncé clinique complet",
        "question": "Question spécifique",
        "options": ["Choix A", "Choix B", ...],
        "answerIndices": [0],
        "explanation": "Pourquoi cette réponse est correcte"
      }`;

      const contents: any[] = [];
      const parts: any[] = [{ text: prompt }];

      if (pdfFile) {
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(pdfFile);
        });
        
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: "application/pdf"
          }
        });
      }
      
      if (rawText.trim()) {
        parts.push({ text: `Texte supplémentaire : ${rawText}` });
      }

      contents.push({ role: 'user', parts });

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                context: { type: Type.STRING },
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                answerIndices: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                explanation: { type: Type.STRING }
              },
              required: ["question", "options", "answerIndices"]
            }
          }
        }
      });

      const qcmsData = JSON.parse(response.text || '[]');
      
      if (qcmsData.length === 0) {
        toast.error("Aucun QCM n'a pu être extrait. Vérifiez le contenu.");
        setIsProcessing(false);
        return;
      }

      let pdfUrl = '';
      if (pdfFile) {
        try {
          pdfUrl = await storageService.uploadFile(pdfFile);
        } catch (e) {
          console.error("PDF Upload error:", e);
        }
      }

      // Preparation of the QCM objects for batch insertion
      const qcmsToInsert = qcmsData.map((qcm: any) => ({
        ...qcm,
        courseId: selectedCourseId === 'none' ? undefined : selectedCourseId,
        defaultRating: 0,
        sourcePdfUrl: pdfUrl || undefined,
        sourcePdfName: pdfFile?.name
      }));

      // Grouped insertion
      await storageService.addQCMS(qcmsToInsert);
      
      // Upload and attach PDF if available and course selected for the course library
      if (pdfUrl && selectedCourseId !== 'none') {
        try {
          const newAttachment = {
            name: pdfFile?.name || 'Support PDF',
            url: pdfUrl,
            createdAt: new Date().toISOString()
          };
          
          const course = await storageService.getCourse(selectedCourseId);
          if (course) {
            await storageService.updateCourse(selectedCourseId, {
              attachments: [...(course.attachments || []), newAttachment]
            });
          }
        } catch (uploadError) {
          console.error("Course attachment error:", uploadError);
        }
      }

      toast.success(`${qcmsToInsert.length} QCM importés avec succès !`);
      setRawText('');
      setPdfFile(null);
      onComplete(); // Exit after success
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'importation. L'IA n'a pas pu traiter ce format.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-10">
        <div className="space-y-2">
          <h1 className="text-4xl font-serif italic text-white tracking-tight">Acquisition Intelligence</h1>
          <p className="text-white/40 text-sm max-w-lg uppercase tracking-widest font-medium">Extraction structurée de QCM à partir de vos supports docimologiques.</p>
        </div>
        <Button variant="ghost" onClick={() => onComplete()} className="text-white/40 hover:text-white rounded-full border border-white/5">Voir les cours</Button>
      </div>

      <Card className="rounded-[3rem] border-white/5 bg-[#0F0F0F] shadow-2xl overflow-hidden">
        <CardHeader className="bg-white/[0.02] p-10 pb-6 border-b border-white/5">
          <div className="flex items-center gap-3 text-amber-500 mb-2">
            <Sparkles className="w-5 h-5" />
            <CardTitle className="font-serif italic text-2xl text-white/80">Importation Magique (IA)</CardTitle>
          </div>
          <CardDescription className="text-white/30 uppercase tracking-widest text-[10px] font-bold">
            Traitement de texte par Gemini Intelligence
          </CardDescription>
        </CardHeader>
        <CardContent className="p-10 space-y-8">
          <div className="grid gap-8">
            <div className="grid gap-3">
              <Label htmlFor="course" className="text-[10px] uppercase tracking-widest font-bold text-white/30 ml-4">Cours cible (Optionnel)</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger className="rounded-full h-14 bg-white/5 border-white/10 text-white focus:ring-amber-500/50">
                  <SelectValue placeholder="Choisir un module..." />
                </SelectTrigger>
                <SelectContent className="bg-[#0F0F0F] border-white/10 text-white">
                  <SelectItem value="none">Sans cours défini (QCM indépendants)</SelectItem>
                  {courses.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] uppercase tracking-widest font-bold text-white/30 ml-4">Supports Docimologiques</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "relative group cursor-pointer border-2 border-dashed rounded-[2rem] p-8 transition-all flex flex-col items-center justify-center gap-4",
                    pdfFile ? "border-amber-500/50 bg-amber-500/5" : "border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04]"
                  )}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="application/pdf" 
                    onChange={handleFileChange}
                  />
                  {pdfFile ? (
                    <FileText className="w-10 h-10 text-amber-500" />
                  ) : (
                    <Upload className="w-10 h-10 text-white/10 group-hover:text-white/20" />
                  )}
                  <div className="text-center">
                    <p className="text-sm font-bold text-white/80">{pdfFile ? pdfFile.name : "Déposer un PDF"}</p>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Extraction auto du texte</p>
                  </div>
                  {pdfFile && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setPdfFile(null); setRawText(''); }}
                      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10"
                    >
                      <X className="w-4 h-4 text-white/40" />
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  <Textarea 
                    placeholder="Ou collez le texte ici directement..."
                    className="flex-1 min-h-[160px] rounded-[2rem] bg-white/5 border-white/10 p-6 font-mono text-xs resize-none focus:ring-amber-500/50 text-white placeholder:text-white/10"
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <Button 
            className="w-full bg-amber-600 hover:bg-amber-500 text-black h-16 rounded-[2rem] text-xl font-bold gap-3 transition-all shadow-2xl shadow-amber-600/10 active:scale-[0.98] disabled:opacity-20"
            disabled={isProcessing || !rawText.trim() && !pdfFile}
            onClick={handleImport}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Indexation Intelligence...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Analyser et Importer
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {importedQcms.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-500/5 border border-green-500/10 p-10 rounded-[3rem] flex flex-col items-center gap-6 text-center"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-green-500/10 rounded-3xl flex items-center justify-center text-green-500 border border-green-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="font-serif italic text-2xl text-green-400">Acquisition Terminée</h3>
            <p className="text-white/40 text-sm">{importedQcms.length} QCM ont été indexés avec succès.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-500 text-white rounded-full h-14 font-bold"
              onClick={() => onComplete(importedQcms)}
            >
              Lancer la Session Directement
            </Button>
            <Button 
              variant="outline"
              className="flex-1 border-white/10 text-white/50 hover:text-white rounded-full h-14 font-bold"
              onClick={() => onComplete()}
            >
              Plus Tard
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
