import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import guestsRouter       from './routes/guests';
import roomsRouter        from './routes/rooms';
import ratePlansRouter    from './routes/ratePlans';
import reservationsRouter from './routes/reservations';
import foliosRouter       from './routes/folios';
import staffRouter        from './routes/staff';
import housekeepingRouter from './routes/housekeeping';
import ordersRouter       from './routes/orders';
import channelsRouter     from './routes/channels';
import whatsappRouter     from './routes/whatsapp';
import webhookRouter      from './routes/webhook';
import publicRouter       from './routes/public';
import authRouter         from './routes/auth';
import adminRouter        from './routes/admin';

import { authenticate, AuthRequest } from './middleware/authenticate';
import { errorHandler, notFound }    from './middleware/errorHandler';

const app        = express();
const PORT       = Number(process.env.PORT ?? 4000);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

// ── Public paths (no auth required) ──────────────────────────────────────────
const PUBLIC_PREFIXES = [
  '/api/auth',
  '/api/admin/setup',
  '/api/public',
  '/api/webhook',
  '/health',
];

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Global auth guard ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (PUBLIC_PREFIXES.some((p) => req.originalUrl.startsWith(p)) || req.method === 'OPTIONS') {
    return next();
  }
  return authenticate(req as AuthRequest, res, next);
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',         authRouter);
app.use('/api/admin',        adminRouter);
app.use('/api/guests',       guestsRouter);
app.use('/api/rooms',        roomsRouter);
app.use('/api/rate-plans',   ratePlansRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/folios',       foliosRouter);
app.use('/api/staff',        staffRouter);
app.use('/api/housekeeping', housekeepingRouter);
app.use('/api/orders',       ordersRouter);
app.use('/api/channels',     channelsRouter);
app.use('/api/whatsapp',     whatsappRouter);
app.use('/api/webhook',      webhookRouter);
app.use('/api/public',       publicRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`SERVV HMS API running on http://localhost:${PORT}`);
});
