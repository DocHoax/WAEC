const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Result = require('../models/Result');
const Test = require('../models/Test');
const User = require('../models/User');
const Class = require('../models/Class');
const { auth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// Input validation middleware
const validateAnalyticsParams = (req, res, next) => {
  const { className, subject } = req.params;
  
  if (!className || className.trim().length === 0) {
    return res.status(400).json({ error: 'Class name is required and cannot be empty' });
  }
  
  if (!subject || subject.trim().length === 0) {
    return res.status(400).json({ error: 'Subject is required and cannot be empty' });
  }
  
  // Sanitize inputs
  req.params.className = className.trim();
  req.params.subject = subject.trim();
  
  next();
};

// Cache configuration for analytics
const analyticsCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Clear cache endpoint for admins only
router.delete('/cache', auth, checkPermission('manage_analytics'), async (req, res) => {
  try {
    // BLOCK STUDENT ACCESS
    if (req.user.role === 'student') {
      return res.status(403).json({ 
        error: 'Access denied. Students cannot manage analytics cache.' 
      });
    }

    const cacheSize = analyticsCache.size;
    analyticsCache.clear();
    console.log('Analytics cache cleared', { 
      clearedEntries: cacheSize,
      clearedBy: req.user.username 
    });
    res.json({ 
      message: 'Analytics cache cleared successfully',
      clearedEntries: cacheSize 
    });
  } catch (error) {
    console.error('Error clearing analytics cache:', error);
    res.status(500).json({ error: 'Server error clearing cache' });
  }
});

// Get subject analytics with enhanced metrics - STUDENTS BLOCKED
router.get('/subject/:className/:subject', auth, checkPermission('view_analytics'), validateAnalyticsParams, async (req, res) => {
  try {
    // BLOCK STUDENT ACCESS
    if (req.user.role === 'student') {
      return res.status(403).json({ 
        error: 'Access denied. Students cannot view subject analytics.' 
      });
    }

    const { className, subject } = req.params;
    const { session, term, refresh } = req.query;
    
    // Check cache first (unless refresh is requested)
    const cacheKey = `subject:${className}:${subject}:${session || 'all'}:${term || 'all'}`;
    if (!refresh && analyticsCache.has(cacheKey)) {
      const cached = analyticsCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('Analytics - Serving from cache:', cacheKey);
        return res.json(cached.data);
      }
    }

    console.log('Analytics - Subject analytics request:', { 
      className, 
      subject, 
      session, 
      term,
      user: req.user.username 
    });

    // Build query with session and term filters
    const resultQuery = { class: className, subject };
    if (session) resultQuery.session = session;
    if (term) resultQuery.term = term;

    const results = await Result.find(resultQuery)
      .populate('userId', 'username name surname studentId')
      .populate('testId', 'title type maxScore session term')
      .sort({ score: -1 })
      .lean();

    if (!results.length) {
      return res.status(404).json({ 
        error: 'No results found for the specified criteria',
        className,
        subject,
        session: session || 'all',
        term: term || 'all'
      });
    }

    // Calculate comprehensive statistics
    const scores = results.map(r => r.score || 0).filter(score => score !== null);
    const totalStudents = scores.length;
    const avgScore = totalStudents > 0 ? (scores.reduce((sum, score) => sum + score, 0) / totalStudents).toFixed(2) : 0;
    
    const passingScore = 50; // Configurable passing threshold
    const passCount = scores.filter(score => score >= passingScore).length;
    const passRate = totalStudents > 0 ? ((passCount / totalStudents) * 100).toFixed(2) : 0;
    
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    
    // Score distribution
    const scoreRanges = {
      excellent: scores.filter(s => s >= 90).length,
      good: scores.filter(s => s >= 75 && s < 90).length,
      average: scores.filter(s => s >= 50 && s < 75).length,
      poor: scores.filter(s => s < 50).length
    };

    // Performance by test type
    const testTypePerformance = {};
    results.forEach(result => {
      if (result.testId && result.testId.type) {
        const type = result.testId.type;
        if (!testTypePerformance[type]) {
          testTypePerformance[type] = { total: 0, count: 0, avg: 0 };
        }
        testTypePerformance[type].total += result.score || 0;
        testTypePerformance[type].count += 1;
      }
    });

    // Calculate averages for test types
    Object.keys(testTypePerformance).forEach(type => {
      testTypePerformance[type].avg = 
        (testTypePerformance[type].total / testTypePerformance[type].count).toFixed(2);
    });

    // Top performers
    const topPerformers = results
      .slice(0, 5)
      .map(r => ({
        student: `${r.userId?.name || 'N/A'} ${r.userId?.surname || ''}`.trim(),
        studentId: r.userId?.studentId,
        score: r.score || 0,
        test: r.testId?.title || 'Unknown Test'
      }));

    const response = {
      className,
      subject,
      session: session || 'all',
      term: term || 'all',
      summary: {
        totalStudents,
        averageScore: parseFloat(avgScore),
        passRate: parseFloat(passRate),
        maxScore,
        minScore,
        scoreDistribution: scoreRanges,
        testTypePerformance
      },
      topPerformers,
      scores: results.map(r => ({
        student: `${r.userId?.name || 'N/A'} ${r.userId?.surname || ''}`.trim(),
        studentId: r.userId?.studentId,
        score: r.score || 0,
        test: r.testId?.title || 'Unknown Test',
        testType: r.testId?.type || 'unknown',
        submittedAt: r.submittedAt
      })),
      generatedAt: new Date().toISOString(),
      cache: false
    };

    // Cache the response
    analyticsCache.set(cacheKey, {
      data: { ...response, cache: true },
      timestamp: Date.now()
    });

    res.json(response);
  } catch (error) {
    console.error('Analytics - Subject Error:', { 
      message: error.message, 
      className: req.params.className,
      subject: req.params.subject,
      user: req.user.username 
    });
    res.status(500).json({ 
      error: 'Server error generating subject analytics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get comprehensive analytics dashboard - STUDENTS BLOCKED
router.get('/dashboard', auth, checkPermission('view_analytics'), async (req, res) => {
  try {
    // BLOCK STUDENT ACCESS
    if (req.user.role === 'student') {
      return res.status(403).json({ 
        error: 'Access denied. Students cannot view analytics dashboard.' 
      });
    }

    const { session, term, timeRange = 'current' } = req.query;
    
    console.log('Analytics - Dashboard request:', { 
      user: req.user.username,
      session,
      term,
      timeRange 
    });

    // Build query based on user role and permissions
    const baseQuery = {};
    if (req.user.role === 'teacher' && req.user.subjects) {
      baseQuery.$or = req.user.subjects.map(sub => ({
        subject: sub.subject,
        class: sub.class
      }));
    }

    if (session) baseQuery.session = session;
    if (term) baseQuery.term = term;

    // Fetch aggregated data in parallel for better performance
    const [
      tests,
      studentCount,
      teacherCount,
      classCount,
      allResults
    ] = await Promise.all([
      Test.find(baseQuery).lean(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'teacher' }),
      Class.countDocuments(),
      Result.find(baseQuery).populate('userId', 'name surname').lean()
    ]);

    // Test analytics with enhanced metrics
    const testAnalytics = await Promise.all(
      tests.map(async (test) => {
        const testResults = allResults.filter(r => 
          r.testId && r.testId.toString() === test._id.toString()
        );
        
        const totalStudents = testResults.length;
        const completed = testResults.filter(r => r.submittedAt).length;
        const completionRate = totalStudents > 0 ? 
          ((completed / totalStudents) * 100).toFixed(2) : 0;
        
        const scores = testResults.map(r => r.score || 0);
        const averageScore = scores.length > 0 ? 
          (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0;
        
        const topResult = testResults.sort((a, b) => (b.score || 0) - (a.score || 0))[0];
        
        return {
          testId: test._id,
          testTitle: test.title,
          subject: test.subject,
          class: test.class,
          session: test.session,
          term: test.term,
          averageScore: parseFloat(averageScore),
          completionRate: parseFloat(completionRate),
          totalStudents,
          completedStudents: completed,
          topStudent: topResult ? 
            `${topResult.userId?.name || 'N/A'} ${topResult.userId?.surname || ''}`.trim() : 'N/A',
          topScore: topResult ? topResult.score : 0,
          type: test.type || 'test',
          createdAt: test.createdAt
        };
      })
    );

    // Overall performance metrics
    const overallScores = allResults.map(r => r.score || 0).filter(score => score > 0);
    const overallAvg = overallScores.length > 0 ? 
      (overallScores.reduce((a, b) => a + b, 0) / overallScores.length).toFixed(2) : 0;

    // Subject performance ranking
    const subjectPerformance = {};
    allResults.forEach(result => {
      if (!subjectPerformance[result.subject]) {
        subjectPerformance[result.subject] = { total: 0, count: 0 };
      }
      subjectPerformance[result.subject].total += result.score || 0;
      subjectPerformance[result.subject].count += 1;
    });

    const subjectRanking = Object.entries(subjectPerformance)
      .map(([subject, data]) => ({
        subject,
        averageScore: (data.total / data.count).toFixed(2),
        totalTests: data.count
      }))
      .sort((a, b) => b.averageScore - a.averageScore);

    // Class performance ranking
    const classPerformance = {};
    allResults.forEach(result => {
      if (!classPerformance[result.class]) {
        classPerformance[result.class] = { total: 0, count: 0 };
      }
      classPerformance[result.class].total += result.score || 0;
      classPerformance[result.class].count += 1;
    });

    const classRanking = Object.entries(classPerformance)
      .map(([className, data]) => ({
        className,
        averageScore: (data.total / data.count).toFixed(2),
        totalTests: data.count
      }))
      .sort((a, b) => b.averageScore - a.averageScore);

    const response = {
      analytics: testAnalytics,
      summary: {
        totalStudents: studentCount,
        totalTeachers: teacherCount,
        totalClasses: classCount,
        totalTests: tests.filter(t => t.type !== 'examination').length,
        totalExams: tests.filter(t => t.type === 'examination').length,
        overallAverageScore: parseFloat(overallAvg),
        totalResults: allResults.length
      },
      rankings: {
        bySubject: subjectRanking,
        byClass: classRanking
      },
      timeRange: {
        session: session || 'all',
        term: term || 'all',
        generatedAt: new Date().toISOString()
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Analytics - Dashboard Error:', { 
      message: error.message, 
      user: req.user.username 
    });
    res.status(500).json({ 
      error: 'Server error generating dashboard analytics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get performance trends over time - STUDENTS BLOCKED
router.get('/trends/:subject', auth, checkPermission('view_analytics'), async (req, res) => {
  try {
    // BLOCK STUDENT ACCESS
    if (req.user.role === 'student') {
      return res.status(403).json({ 
        error: 'Access denied. Students cannot view performance trends.' 
      });
    }

    const { subject } = req.params;
    const { className, sessions = 5 } = req.query;

    const trendQuery = { subject };
    if (className) trendQuery.class = className;

    const results = await Result.find(trendQuery)
      .populate('testId', 'session term type')
      .sort({ 'testId.session': 1, 'testId.term': 1 })
      .limit(parseInt(sessions) * 3) // Approximate limit for sessions * terms
      .lean();

    // Group by session and term
    const trends = {};
    results.forEach(result => {
      if (result.testId) {
        const key = `${result.testId.session}-${result.testId.term}`;
        if (!trends[key]) {
          trends[key] = {
            session: result.testId.session,
            term: result.testId.term,
            scores: [],
            average: 0
          };
        }
        trends[key].scores.push(result.score || 0);
      }
    });

    // Calculate averages
    Object.keys(trends).forEach(key => {
      const trend = trends[key];
      trend.average = trend.scores.length > 0 ?
        (trend.scores.reduce((a, b) => a + b, 0) / trend.scores.length).toFixed(2) : 0;
      trend.studentCount = trend.scores.length;
    });

    const trendData = Object.values(trends)
      .sort((a, b) => a.session.localeCompare(b.session) || a.term.localeCompare(b.term));

    res.json({
      subject,
      className: className || 'all',
      trends: trendData,
      analysis: analyzeTrends(trendData)
    });
  } catch (error) {
    console.error('Analytics - Trends Error:', error);
    res.status(500).json({ error: 'Server error generating trends' });
  }
});

// Helper function to analyze performance trends
function analyzeTrends(trendData) {
  if (trendData.length < 2) {
    return { message: 'Insufficient data for trend analysis' };
  }

  const averages = trendData.map(t => parseFloat(t.average));
  const overallTrend = averages[averages.length - 1] - averages[0];
  const trendDirection = overallTrend > 0 ? 'improving' : overallTrend < 0 ? 'declining' : 'stable';

  return {
    trendDirection,
    overallChange: overallTrend.toFixed(2),
    averagePerformance: (averages.reduce((a, b) => a + b, 0) / averages.length).toFixed(2),
    recommendation: getTrendRecommendation(trendDirection, Math.abs(overallTrend))
  };
}

function getTrendRecommendation(direction, magnitude) {
  if (direction === 'improving') {
    return magnitude > 10 ? 
      'Excellent improvement trend. Continue current strategies.' :
      'Moderate improvement. Consider targeted interventions for further gains.';
  } else if (direction === 'declining') {
    return magnitude > 10 ?
      'Significant decline detected. Immediate intervention recommended.' :
      'Slight decline observed. Monitor closely and consider review sessions.';
  }
  return 'Performance is stable. Maintain current teaching strategies.';
}

module.exports = router;