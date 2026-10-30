import { Router } from 'express';
import { db } from '../db/sqliteDb.js';

export const analyticsRouter = Router();

// GET inventory overview metrics
analyticsRouter.get('/analytics', (req, res) => {
  try {
    const analytics = db.getAnalytics();
    res.json({ success: true, data: analytics });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET restock recommendations
analyticsRouter.get('/recommendations', (req, res) => {
  try {
    const recommendations = db.getRestockRecommendations();
    res.json({ success: true, count: recommendations.length, data: recommendations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET audit logs
analyticsRouter.get('/audit-logs', (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const logs = db.getAuditLogs(limit);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST reset demo data
analyticsRouter.post('/reset-demo', (req, res) => {
  try {
    db.resetToDemo();
    const analytics = db.getAnalytics();
    res.json({
      success: true,
      message: 'Successfully reset database to clean enterprise seed data',
      data: analytics,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
