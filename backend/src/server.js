import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { UPLOAD_DIR } from './middleware/upload.js';
import authRoutes from './routes/auth.js';
import memberRoutes from './routes/members.js';
import savingsRoutes from './routes/savings.js';
import loanProductRoutes from './routes/loanProducts.js';
import loanRoutes from './routes/loans.js';
import dashboardRoutes from './routes/dashboard.js';
import reportRoutes from './routes/reports.js';
import auditRoutes from './routes/audit.js';
import notificationRoutes from './routes/notifications.js';
import dividendRoutes from './routes/dividends.js';
import { scheduleOverdueJob, runOverdueCheck } from './lib/overdueJob.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Dev-only static file serving for uploaded KYC docs/photos.
// In production, swap the upload middleware for Cloudinary/Supabase Storage instead of serving local disk.
app.use('/uploads', express.static(UPLOAD_DIR));

app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/loan-products', loanProductRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dividends', dividendRoutes);

// Manual trigger for demo purposes; the real job runs daily via node-cron.
app.post('/api/jobs/run-overdue-check', async (req, res) => {
  const result = await runOverdueCheck();
  res.json(result);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Coop backend listening on http://localhost:${port}`);
  scheduleOverdueJob();
});
