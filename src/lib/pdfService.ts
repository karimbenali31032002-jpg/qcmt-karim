
import { QCM, UserRating, Course } from '@/src/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function generateStratificationPDF(
  courseTitle: string,
  rating: string,
  qcms: QCM[],
  ratingsMap: Record<string, number>
) {
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleDateString('fr-FR');
  const ratingLabel = rating === 'all' ? 'Tous les Rangs' : (rating === 'session' ? 'Session' : `Rang ${rating}`);

  // Header
  doc.setFontSize(22);
  doc.setTextColor(0, 0, 0);
  doc.text('MedStratify - Stratification Cognitive', 14, 20);
  
  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.text(`Module : ${courseTitle}`, 14, 30);
  doc.text(`Ciblage : ${ratingLabel}`, 14, 38);
  doc.text(`Date : ${timestamp}`, 14, 46);

  let yPos = 60;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;

  qcms.forEach((qcm, index) => {
    // Calculate total height of this QCM block
    let blockHeight = 0;
    
    // Header height (Q1 [Rang X])
    blockHeight += 10;

    // Context height
    let splitContext: string[] = [];
    if (qcm.context) {
      splitContext = doc.splitTextToSize(`CONTEXTE CLINIQUE : ${qcm.context}`, 175);
      blockHeight += (splitContext.length * 5) + 6;
    }

    // Question height
    const splitQuestion = doc.splitTextToSize(qcm.question, 180);
    blockHeight += (splitQuestion.length * 5) + 6;

    // Options height
    qcm.options.forEach(opt => {
      const splitOpt = doc.splitTextToSize(`A. ${opt}`, 170);
      blockHeight += (splitOpt.length * 5);
    });
    blockHeight += 5; // spacing after options

    // Explanation height
    let splitExp: string[] = [];
    if (qcm.explanation) {
      splitExp = doc.splitTextToSize(`Explication: ${qcm.explanation}`, 180);
      blockHeight += (splitExp.length * 4) + 6;
    }

    blockHeight += 10; // extra spacing between questions

    // If block doesn't fit, start new page
    if (yPos + blockHeight > pageHeight - margin) {
      doc.addPage();
      yPos = 20;
    }

    // Now start drawing
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    
    const qRating = ratingsMap[qcm.id] || 0;
    doc.text(`Q${index + 1} [Rang ${qRating}]`, 14, yPos);
    yPos += 7;

    // Context
    if (qcm.context) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      
      const contextHeight = (splitContext.length * 5) + 4;
      
      doc.setDrawColor(245, 158, 11); // amber-500
      doc.setLineWidth(0.5);
      doc.line(12, yPos - 2, 12, yPos + contextHeight - 6);
      
      doc.text(splitContext, 16, yPos);
      yPos += contextHeight;
    }

    // Question
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(splitQuestion, 14, yPos);
    yPos += (splitQuestion.length * 5) + 5;

    // Options
    qcm.options.forEach((opt, optIdx) => {
      const char = String.fromCharCode(65 + optIdx);
      const isCorrect = qcm.answerIndices?.includes(optIdx);
      
      if (isCorrect) {
        doc.setTextColor(0, 128, 0);
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setTextColor(50, 50, 50);
        doc.setFont('helvetica', 'normal');
      }

      const optText = `${char}. ${opt}`;
      const splitOpt = doc.splitTextToSize(optText, 170);
      doc.text(splitOpt, 20, yPos);
      yPos += (splitOpt.length * 5);
    });

    yPos += 5;

    // Explanation
    if (qcm.explanation) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(splitExp, 14, yPos);
      yPos += (splitExp.length * 4) + 5;
    }

    yPos += 10;
  });

  // Filename formatting
  const safeTitle = courseTitle.replace(/[^a-z0-9]/gi, '_');
  let ratingDisplay = rating;
  
  if (rating === 'all') ratingDisplay = 'complet';
  else if (rating === 'session') ratingDisplay = 'session';
  
  // Format final: Nom_Cours_1.pdf ou Nom_Cours_session.pdf
  doc.save(`${safeTitle}_${ratingDisplay}.pdf`);
}
