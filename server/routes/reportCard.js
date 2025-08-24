const express = require('express');
const router = express.Router();
const Result = require('../models/Result');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Color Palette
const COLORS = {
  primary: '#4B5320',        // Olive green for headers and titles
  secondary: '#D4A017',      // Gold for borders and accents
  textPrimary: '#1F2937',    // Dark gray for text
  textSecondary: '#6B7280',  // Medium gray for labels
  textWhite: '#FFFFFF',      // White for headers
  excellent: '#059669',      // Green for A-B
  good: '#0891B2',          // Cyan for C
  average: '#D97706',       // Orange for D
  poor: '#DC2626',          // Red for E-F
  border: '#D4A017',        // Gold for lines
  background: '#FFFFFF'      // White background
};

// Typography
const TYPOGRAPHY = {
  fonts: {
    heading: 'Times-Bold',
    body: 'Times-Roman'
  },
  sizes: {
    title: 16,
    subtitle: 12,
    heading: 10,
    body: 8,
    small: 7
  }
};

// Layout Constants
const LAYOUT = {
  margin: 40,
  sectionGap: 15,
  tableRowHeight: 22,
  headerHeight: 100,
  footerHeight: 20
};

// Utility Functions
const getGradeInfo = (percentage) => {
  if (percentage >= 90) return { grade: 'A+', remark: 'Outstanding', color: COLORS.excellent };
  if (percentage >= 80) return { grade: 'A', remark: 'Excellent', color: COLORS.excellent };
  if (percentage >= 70) return { grade: 'B', remark: 'Very Good', color: COLORS.excellent };
  if (percentage >= 60) return { grade: 'C', remark: 'Good', color: COLORS.good };
  if (percentage >= 50) return { grade: 'D', remark: 'Pass', color: COLORS.average };
  if (percentage >= 40) return { grade: 'E', remark: 'Below Average', color: COLORS.poor };
  return { grade: 'F', remark: 'Needs Improvement', color: COLORS.poor };
};

const addWatermark = (doc) => {
  const watermarkImage = path.join(__dirname, '../../public/images/sanniville-logo.png');
  
  if (fs.existsSync(watermarkImage)) {
    doc.save()
       .opacity(0.08)
       .image(watermarkImage, doc.page.width / 2 - 150, doc.page.height / 2 - 150, { width: 300, height: 300 })
       .restore();
  } else {
    console.warn('ReportCard - Watermark image not found:', watermarkImage);
    doc.save()
       .opacity(0.05)
       .font(TYPOGRAPHY.fonts.heading)
       .fontSize(40)
       .fillColor(COLORS.primary)
       .rotate(45)
       .text('SANNIVILLE ACADEMY', doc.page.width / 2 - 150, doc.page.height / 2 - 50, { align: 'center', width: 300 })
       .restore();
  }
};

const addHeader = (doc, session) => {
  const logoSize = 50;
  const watermarkImage = path.join(__dirname, '../../public/images/sanniville-logo.png');
  
  doc.rect(0, 0, doc.page.width, LAYOUT.headerHeight)
     .fill(COLORS.primary);
  
  const logoX = LAYOUT.margin;
  const logoY = 15;
  
  if (fs.existsSync(watermarkImage)) {
    doc.image(watermarkImage, logoX, logoY, { width: logoSize, height: logoSize });
  } else {
    console.warn('ReportCard - Header logo not found:', watermarkImage);
    doc.rect(logoX, logoY, logoSize, logoSize)
       .fillAndStroke(COLORS.background, COLORS.secondary)
       .lineWidth(1);
    doc.font(TYPOGRAPHY.fonts.heading)
       .fontSize(12)
       .fillColor(COLORS.secondary)
       .text('SA', logoX + 10, logoY + 18);
  }
  
  doc.font(TYPOGRAPHY.fonts.heading)
     .fontSize(TYPOGRAPHY.sizes.title)
     .fillColor(COLORS.textWhite)
     .text('SANNIVILLE ACADEMY', logoX + logoSize + 15, logoY)
     .fontSize(TYPOGRAPHY.sizes.body)
     .text('123 Education Boulevard, Sanniville City', logoX + logoSize + 15, logoY + 20)
     .text('info@sanniville.edu | (123) 456-7890', logoX + logoSize + 15, logoY + 30);
  
  doc.font(TYPOGRAPHY.fonts.heading)
     .fontSize(TYPOGRAPHY.sizes.subtitle)
     .fillColor(COLORS.textWhite)
     .text('TERM REPORT CARD', LAYOUT.margin, logoY + 50, { width: doc.page.width - (LAYOUT.margin * 2), align: 'center' })
     .font(TYPOGRAPHY.fonts.body)
     .fontSize(TYPOGRAPHY.sizes.small)
     .text(`Session: ${session} | Second Term`, LAYOUT.margin, logoY + 75, { width: doc.page.width - (LAYOUT.margin * 2), align: 'center' });
  
  return LAYOUT.headerHeight + LAYOUT.sectionGap;
};

const addStudentInfo = (doc, y, student, reportData, position, classSize, attendance) => {
  doc.font(TYPOGRAPHY.fonts.heading)
     .fontSize(TYPOGRAPHY.sizes.heading)
     .fillColor(COLORS.primary)
     .text('Student Details', LAYOUT.margin, y);
  
  doc.moveTo(LAYOUT.margin, y + 15)
     .lineTo(doc.page.width - LAYOUT.margin, y + 15)
     .stroke(COLORS.secondary);
  
  const contentY = y + 25;
  const col1 = LAYOUT.margin;
  const col2 = col1 + 180;
  
  const photoX = doc.page.width - LAYOUT.margin - 50;
  const photoY = contentY;
  doc.rect(photoX, photoY, 50, 50)
     .stroke(COLORS.secondary)
     .lineWidth(1);
  doc.font(TYPOGRAPHY.fonts.body)
     .fontSize(TYPOGRAPHY.sizes.small)
     .fillColor(COLORS.textSecondary)
     .text('Student Photo', photoX + 5, photoY + 20, { width: 40, align: 'center' });
  
  const info = [
    { label: 'Name:', value: `${student.name || ''} ${student.surname || ''}`.trim() || 'N/A' },
    { label: 'Class:', value: student.class || 'N/A' },
    { label: 'Subjects:', value: `${reportData.numSubjects || 0}` },
    { label: 'Position:', value: `${position} of ${classSize}` },
    { label: 'Attendance:', value: `${attendance.present || 0}/${attendance.totalDays || 0}` }
  ];
  
  info.forEach((item, index) => {
    const itemY = contentY + (index * 12);
    doc.font(TYPOGRAPHY.fonts.body)
       .fontSize(TYPOGRAPHY.sizes.body)
       .fillColor(COLORS.textSecondary)
       .text(item.label, col1, itemY, { width: 70 });
    doc.fillColor(COLORS.textPrimary)
       .text(item.value, col2, itemY, { width: 200 });
  });
  
  return contentY + Math.max(50, (info.length * 12)) + LAYOUT.sectionGap;
};

const addPerformanceTable = (doc, y, reportData) => {
  const colWidths = [170, 50, 50, 50, 50, 40, 100];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const tableY = y + 20;
  
  doc.font(TYPOGRAPHY.fonts.heading)
     .fontSize(TYPOGRAPHY.sizes.heading)
     .fillColor(COLORS.primary)
     .text('Academic Results', LAYOUT.margin, y);
  
  doc.moveTo(LAYOUT.margin, y + 15)
     .lineTo(doc.page.width - LAYOUT.margin, y + 15)
     .stroke(COLORS.secondary);
  
  const tableX = LAYOUT.margin;
  let currentY = tableY;
  
  doc.rect(tableX, currentY, tableWidth, LAYOUT.tableRowHeight)
     .fill(COLORS.primary);
  
  const headers = ['Subject', 'CA1 (20)', 'CA2 (20)', 'Exam (60)', 'Total (100)', 'Grade', 'Remark'];
  let currentX = tableX;
  
  doc.font(TYPOGRAPHY.fonts.heading)
     .fontSize(TYPOGRAPHY.sizes.small)
     .fillColor(COLORS.textWhite);
  
  headers.forEach((header, i) => {
    doc.text(header, currentX + 5, currentY + 7, { width: colWidths[i] - 10, align: i === 0 || i === 6 ? 'left' : 'center' });
    currentX += colWidths[i];
  });
  
  currentY += LAYOUT.tableRowHeight;
  
  Object.keys(reportData.subjects).forEach((subject, index) => {
    const sub = reportData.subjects[subject];
    const total = sub.firstCA + sub.secondCA + sub.exam;
    const gradeInfo = getGradeInfo(total);
    
    if (index % 2 === 1) {
      doc.rect(tableX, currentY, tableWidth, LAYOUT.tableRowHeight)
         .fillOpacity(0.05)
         .fill(COLORS.secondary)
         .fillOpacity(1);
    }
    
    doc.rect(tableX, currentY, tableWidth, LAYOUT.tableRowHeight)
       .stroke(COLORS.border)
       .lineWidth(1);
    
    const rowData = [
      { text: subject, align: 'left', color: COLORS.textPrimary },
      { text: `${sub.firstCA || 0}`, align: 'center', color: COLORS.textPrimary },
      { text: `${sub.secondCA || 0}`, align: 'center', color: COLORS.textPrimary },
      { text: `${sub.exam || 0}`, align: 'center', color: COLORS.textPrimary },
      { text: `${total}`, align: 'center', color: COLORS.textPrimary },
      { text: gradeInfo.grade, align: 'center', color: gradeInfo.color },
      { text: gradeInfo.remark, align: 'left', color: gradeInfo.color }
    ];
    
    currentX = tableX;
    rowData.forEach((data, i) => {
      doc.font(TYPOGRAPHY.fonts.body)
         .fontSize(TYPOGRAPHY.sizes.small)
         .fillColor(data.color)
         .text(data.text, currentX + 5, currentY + 7, { width: colWidths[i] - 10, align: data.align });
      currentX += colWidths[i];
    });
    
    currentY += LAYOUT.tableRowHeight;
  });
  
  return currentY + LAYOUT.sectionGap;
};

const addSummary = (doc, y, reportData, average, results) => {
  doc.font(TYPOGRAPHY.fonts.heading)
     .fontSize(TYPOGRAPHY.sizes.heading)
     .fillColor(COLORS.primary)
     .text('Performance Summary', LAYOUT.margin, y);
  
  doc.moveTo(LAYOUT.margin, y + 15)
     .lineTo(doc.page.width - LAYOUT.margin, y + 15)
     .stroke(COLORS.secondary);
  
  const contentY = y + 25;
  const col1 = LAYOUT.margin;
  const col2 = col1 + 180;
  
  const averageNum = parseFloat(average);
  const gradeInfo = getGradeInfo(averageNum);
  const promotion = averageNum >= 50 ? 'Promoted to Next Class' : 'Repeat Class';
  
  const summary = [
    { label: 'Total Score:', value: `${reportData.totalScore}/${reportData.totalPossible}`, color: COLORS.textPrimary },
    { label: 'Average:', value: `${average}% (${gradeInfo.grade})`, color: gradeInfo.color },
    { label: 'Status:', value: promotion, color: averageNum >= 50 ? COLORS.excellent : COLORS.poor }
  ];
  
  summary.forEach((item, index) => {
    const itemY = contentY + (index * 12);
    doc.font(TYPOGRAPHY.fonts.body)
       .fontSize(TYPOGRAPHY.sizes.body)
       .fillColor(COLORS.textSecondary)
       .text(item.label, col1, itemY, { width: 70 });
    doc.fillColor(item.color)
       .text(item.value, col2, itemY, { width: 200 });
  });
  
  const commentY = contentY + (summary.length * 12) + 10;
  const teacherComment = results[0]?.remarks || 'Good effort. Focus on weaker subjects to improve.';
  const principalComment = averageNum >= 80 ? 'Excellent performance. Keep it up!' :
                          averageNum >= 60 ? 'Good progress. Aim higher.' :
                          averageNum >= 50 ? 'Pass. More effort needed.' :
                          'Needs improvement in all areas.';
  
  doc.font(TYPOGRAPHY.fonts.body)
     .fontSize(TYPOGRAPHY.sizes.small)
     .fillColor(COLORS.textSecondary)
     .text('Teacher\'s Comment:', col1, commentY)
     .fillColor(COLORS.textPrimary)
     .text(teacherComment, col2, commentY, { width: 320, align: 'justify' });
  
  doc.fillColor(COLORS.textSecondary)
     .text('Principal\'s Remark:', col1, commentY + 25)
     .fillColor(COLORS.textPrimary)
     .text(principalComment, col2, commentY + 25, { width: 320, align: 'justify' });
  
  return commentY + 50 + LAYOUT.sectionGap;
};

const addSignatures = (doc, y) => {
  doc.font(TYPOGRAPHY.fonts.heading)
     .fontSize(TYPOGRAPHY.sizes.heading)
     .fillColor(COLORS.primary)
     .text('Authentication', LAYOUT.margin, y);
  
  doc.moveTo(LAYOUT.margin, y + 15)
     .lineTo(doc.page.width - LAYOUT.margin, y + 15)
     .stroke(COLORS.secondary);
  
  const dateY = y + 25;
  const col1 = LAYOUT.margin;
  const col2 = col1 + 180;
  
  doc.font(TYPOGRAPHY.fonts.body)
     .fontSize(TYPOGRAPHY.sizes.body)
     .fillColor(COLORS.textPrimary)
     .text(`Date: ${new Date().toLocaleDateString('en-GB')}`, col1, dateY)
     .text('Next Term: January 5, 2026', col2, dateY);
  
  const teacherY = dateY + 20;
  doc.text('Class Teacher:', col1, teacherY)
     .moveTo(col1 + 80, teacherY + 10)
     .lineTo(col1 + 230, teacherY + 10)
     .stroke(COLORS.secondary);
  
  const principalY = teacherY + 20;
  doc.text('Principal:', col1, principalY)
     .moveTo(col1 + 80, principalY + 10)
     .lineTo(col1 + 230, principalY + 10)
     .stroke(COLORS.secondary);
  
  return principalY + 25 + LAYOUT.sectionGap;
};

const addFooter = (doc) => {
  const footerY = doc.page.height - LAYOUT.footerHeight - LAYOUT.margin;
  
  doc.rect(0, footerY, doc.page.width, LAYOUT.footerHeight)
     .fill(COLORS.primary);
  
  doc.font(TYPOGRAPHY.fonts.body)
     .fontSize(TYPOGRAPHY.sizes.small)
     .fillColor(COLORS.textWhite)
     .text(`© ${new Date().getFullYear()} Sanniville Academy | Generated on ${new Date().toLocaleDateString('en-GB')}`, 
           LAYOUT.margin, footerY + 6, { width: doc.page.width - (LAYOUT.margin * 2), align: 'center' });
};

// Main Route
router.get('/export/report/:studentId/:session', auth, async (req, res) => {
  try {
    console.log('ReportCard - Starting:', { user: req.user.username, studentId: req.params.studentId, session: req.params.session, timestamp: new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' }) });

    const { studentId, session } = req.params;

    if (!mongoose.isValidObjectId(studentId)) {
      console.log('ReportCard - Invalid studentId:', { studentId });
      return res.status(400).json({ error: 'Invalid student ID' });
    }

    const student = await User.findById(studentId);
    if (!student) {
      console.log('ReportCard - Student not found:', { studentId });
      return res.status(404).json({ error: 'Student not found' });
    }

    let query = { userId: studentId, session };
    if (req.user.role === 'teacher') {
      const subjects = req.user.subjects.map(sub => sub.subject);
      const classes = req.user.subjects.map(sub => sub.class);
      query = { ...query, subject: { $in: subjects }, class: { $in: classes } };
    } else if (req.user.role !== 'admin') {
      console.log('ReportCard - Access denied:', { user: req.user.username });
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const results = await Result.find(query)
      .populate('testId', 'title subject class type totalScore')
      .populate('userId', 'name surname class');

    if (!results.length) {
      console.log('ReportCard - No results:', { studentId, session });
      return res.status(404).json({ error: 'No results found' });
    }

    const reportData = results.reduce((acc, result) => {
      const subject = result.subject || result.testId?.subject || 'Unknown Subject';
      const type = result.testId?.type || 'test';
      
      if (!acc.subjects[subject]) {
        acc.subjects[subject] = { firstCA: 0, secondCA: 0, exam: 0, total: 0, totalPossible: 100 };
        acc.numSubjects += 1;
      }
      
      const score = Math.min(result.score || 0, 100);
      if (type === 'test' || type === 'midterm' || type === 'revision') {
        if (!acc.subjects[subject].firstCA) {
          acc.subjects[subject].firstCA = Math.min(score, 20);
        } else if (!acc.subjects[subject].secondCA) {
          acc.subjects[subject].secondCA = Math.min(score, 20);
        }
      } else if (type === 'examination') {
        acc.subjects[subject].exam = Math.min(score, 60);
      }
      
      acc.subjects[subject].total = acc.subjects[subject].firstCA + acc.subjects[subject].secondCA + acc.subjects[subject].exam;
      acc.totalScore += acc.subjects[subject].total;
      acc.totalPossible += 100;
      if (acc.subjects[subject].total >= 50) acc.numPasses += 1;
      else acc.numFailures += 1;
      
      return acc;
    }, {
      student: `${student.name || ''} ${student.surname || ''}`.trim() || 'Unknown Student',
      class: student.class || 'N/A',
      session,
      subjects: {},
      totalScore: 0,
      totalPossible: 0,
      numSubjects: 0,
      numPasses: 0,
      numFailures: 0
    });

    const classResults = await Result.find({ class: reportData.class, session })
      .populate('userId', 'name surname');
    
    const classScores = classResults.reduce((acc, r) => {
      const studentKey = r.userId?._id.toString();
      if (!acc[studentKey]) acc[studentKey] = { totalScore: 0, totalPossible: 0 };
      acc[studentKey].totalScore += r.score || 0;
      acc[studentKey].totalPossible += r.testId?.totalScore || 100;
      return acc;
    }, {});
    
    const students = Object.keys(classScores).map(id => ({
      id,
      average: classScores[id].totalPossible > 0 ? (classScores[id].totalScore / classScores[id].totalPossible) * 100 : 0
    }));
    
    students.sort((a, b) => b.average - a.average);
    const position = students.findIndex(s => s.id === studentId) + 1;
    const classSize = students.length;
    const average = reportData.totalPossible > 0 ? (reportData.totalScore / reportData.totalPossible * 100).toFixed(1) : 0;

    const attendance = { totalDays: 90, present: 85, absent: 5 };

    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: LAYOUT.margin,
      info: {
        Title: `Report Card - ${reportData.student}`,
        Author: 'Sanniville Academy',
        Subject: `Academic Report - ${session}`
      }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report_${studentId}_${session.replace(/\//g, '-')}.pdf`);
    
    doc.pipe(res);

    addWatermark(doc);
    let currentY = addHeader(doc, session);
    currentY = addStudentInfo(doc, currentY, student, reportData, position, classSize, attendance);
    currentY = addPerformanceTable(doc, currentY, reportData);
    currentY = addSummary(doc, currentY, reportData, average, results);
    currentY = addSignatures(doc, currentY);
    addFooter(doc);

    doc.end();
    
    console.log('ReportCard - Generated:', { studentId, session, student: reportData.student, timestamp: new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' }) });
  } catch (error) {
    console.error('ReportCard - Error:', { message: error.message, stack: error.stack, studentId: req.params.studentId, session: req.params.session, timestamp: new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' }) });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate report', details: error.message });
    }
  }
});

module.exports = router;