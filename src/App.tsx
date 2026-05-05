/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { auth, signInWithGoogle, checkIsAdmin, isFirebaseConfigured } from '@/src/lib/firebase';
import { ViewState, Course, QCM } from '@/src/types';
import { Layout } from '@/src/components/Layout';
import { Dashboard } from '@/src/components/Dashboard';
import { CourseView } from '@/src/components/CourseView';
import { SessionView } from '@/src/components/SessionView';
import { ImportView } from '@/src/components/ImportView';
import { StatsView } from '@/src/components/StatsView';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { PlusCircle, BookOpen, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewState>('dashboard');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [adhocQcms, setAdhocQcms] = useState<QCM[] | null>(null);
  const [importCourseId, setImportCourseId] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = auth.onAuthStateChanged((u: any) => {
      setUser(u);
      setIsAdmin(checkIsAdmin(u));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        toast.error("Le pop-up de connexion a été bloqué par votre navigateur.", {
          description: "Veuillez autoriser les pop-ups pour medstratify.run.app"
        });
      } else if (error.code === 'auth/unauthorized-domain') {
        toast.error("Domaine non autorisé dans la console Firebase.", {
          description: "Veuillez ajouter ce domaine aux Domaines Autorisés de l'Authentification Firebase."
        });
      } else {
        toast.error("Erreur de connexion", {
          description: error.message || "Une erreur inconnue est survenue."
        });
      }
    }
  };

  const handleImportComplete = (qcms?: QCM[]) => {
    if (qcms && qcms.length > 0) {
      setAdhocQcms(qcms);
      setSelectedCourse(null);
      setView('session');
    } else {
      setView('dashboard');
    }
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A] p-6 font-sans text-white">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full bg-[#0F0F0F] p-8 md:p-12 rounded-[2.5rem] border border-amber-500/20 shadow-2xl"
        >
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-amber-500/20">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-serif italic text-white mb-4">Configuration Firebase Nécessaire</h1>
              <p className="text-white/60 text-sm mb-8 leading-relaxed">
                Pour utiliser MedStratify en local ou sur votre propre domaine, vous devez lier votre propre projet Firebase. C'est gratuit et prend 5 minutes.
              </p>

              <div className="space-y-6">
                <section>
                  <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-amber-500 mb-4 px-1">1. Console Firebase</h2>
                  <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-3">
                    <p className="text-xs text-white/50 leading-relaxed">
                      Allez sur la <a href="https://console.firebase.google.com/" target="_blank" className="text-amber-500 hover:underline font-bold">Console Firebase</a> et cliquez sur <b>"Ajouter un projet"</b>.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-amber-500 mb-4 px-1">2. Créer une App Web</h2>
                  <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-3">
                    <p className="text-xs text-white/50 leading-relaxed">
                      Dans votre projet, cliquez sur l'icône <b>Code (&lt;/&gt;)</b> pour ajouter une application Web. Donnez lui un nom et cliquez sur "Enregistrer".
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-amber-500 mb-4 px-1">3. Copier la Config</h2>
                  <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-3">
                    <p className="text-xs text-white/50 leading-relaxed">
                      Copiez l'objet <code className="text-amber-200/70">firebaseConfig</code> qui s'affiche.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-amber-500 mb-4 px-1">4. Coller dans ce projet</h2>
                  <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-3">
                    <p className="text-xs text-white/50 leading-relaxed">
                      Ouvrez le fichier <code className="bg-white/5 px-2 py-0.5 rounded text-white/80">firebase-applet-config.json</code> ici et remplacez les valeurs par les vôtres.
                    </p>
                  </div>
                </section>
              </div>

              <div className="mt-12 flex items-center justify-between border-t border-white/5 pt-8">
                <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold">
                  MedStratify Setup Guide
                </p>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="ghost" 
                  className="text-xs text-white/40 hover:text-white"
                >
                  J'ai fait les changements, rafraîchir
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Chargement de MedStratify...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A] p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-[#0F0F0F] p-10 rounded-[3rem] shadow-2xl border border-white/5 text-center relative overflow-hidden"
        >
          {/* Decorative element */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl"></div>
          
          <div className="w-24 h-24 bg-white/[0.02] border border-white/10 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
            <BookOpen className="w-10 h-10 text-amber-500" />
          </div>
          
          <div className="space-y-2 mb-10">
            <h1 className="text-4xl font-serif italic text-amber-500 tracking-tight">MedStratify</h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-bold">ResidPrep Elite Edition</p>
          </div>

          <p className="text-white/50 text-sm mb-10 leading-relaxed font-serif italic text-lg">
            "La réussite au résidanat commence par une stratification intelligente de l'essentiel."
          </p>

          <Button 
            onClick={handleSignIn}
            className="w-full bg-amber-600 hover:bg-amber-500 text-black h-14 text-lg font-bold rounded-2xl transition-all shadow-xl shadow-amber-600/10 active:scale-[0.98] flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Accéder à l'Espace Candidat
          </Button>

          <div className="mt-8 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 flex items-start gap-3 text-left">
            <AlertTriangle className="w-4 h-4 text-amber-500/60 mt-0.5 shrink-0" />
            <p className="text-[10px] text-white/40 leading-relaxed uppercase tracking-wider font-bold">
              Si la fenêtre de connexion ne s'ouvre pas, vérifiez que votre navigateur n'a pas bloqué le pop-up.
            </p>
          </div>

          <p className="mt-8 text-[9px] text-white/20 uppercase tracking-widest font-bold">
            Protection des données de révision sécurisée
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <Layout user={user} setView={setView} currentView={view}>
      <Toaster />
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
          className="container mx-auto px-4 py-8 max-w-6xl"
        >
          {view === 'dashboard' && (
            <Dashboard 
              onSelectCourse={(course) => {
                setSelectedCourse(course);
                setView('course');
              }} 
              onImportQcm={(courseId) => {
                setImportCourseId(courseId);
                setView('import');
              }}
            />
          )}
          {view === 'course' && selectedCourse && (
            <CourseView 
              course={selectedCourse} 
              onStartSession={(filteredQcms) => {
                if (filteredQcms) setAdhocQcms(filteredQcms);
                setView('session');
              }}
              onBack={() => setView('dashboard')}
              onImportQcm={() => {
                setImportCourseId(selectedCourse.id);
                setView('import');
              }}
            />
          )}
          {view === 'session' && (selectedCourse || adhocQcms) && (
            <SessionView 
              course={selectedCourse} 
              initialQcms={adhocQcms || undefined}
              onFinish={() => {
                setAdhocQcms(null);
                if (selectedCourse) setView('course');
                else setView('dashboard');
              }}
            />
          )}
          {view === 'import' && (
            <ImportView 
              onComplete={(qcms) => {
                handleImportComplete(qcms);
                setImportCourseId(null);
              }} 
              initialCourseId={importCourseId || undefined}
            />
          )}
          {view === 'stats' && (
            <StatsView />
          )}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}
