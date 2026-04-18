const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const { allowedOrigin } = require('./config/env');
const { requireAuth } = require('./middleware/requireAuth');

const authRoutes = require('./routes/auth.routes');
const onboardingRoutes = require('./routes/onboarding.routes');
const billingRoutes = require('./routes/billing.routes');
const clientsRoutes = require('./routes/clients.routes');
const campaignsRoutes = require('./routes/campaigns.routes');
const trackingRoutes = require('./routes/tracking.routes');
const leadsRoutes = require('./routes/leads.routes');
const deliverablesRoutes = require('./routes/deliverables.routes');
const messagesRoutes = require('./routes/messages.routes');
const reportsRoutes = require('./routes/reports.routes');

const app = express();

app.use(helmet());
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'subjectmedia-backend-phase1' });
});

app.use('/api/auth', authRoutes);
app.use('/api/track', trackingRoutes);
app.use('/api/billing', billingRoutes);

app.use('/api', requireAuth);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/analytics', trackingRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/deliverables', deliverablesRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/reports', reportsRoutes);

module.exports = app;
