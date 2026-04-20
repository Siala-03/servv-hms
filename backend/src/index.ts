import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import guestsRouter      from './routes/guests';
import roomsRouter       from './routes/rooms';
import ratePlansRouter   from './routes/ratePlans';
import reservationsRouter from './routes/reservations';
import foliosRouter      from './routes/folios';
import staffRouter       from './routes/staff';
import housekeepingRouter from './routes/housekeeping';
import ordersRouter      from './routes/orders';
import channelsRouter    from './routes/channels';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/guests',       guestsRouter);
app.use('/api/rooms',        roomsRouter);
app.use('/api/rate-plans',   ratePlansRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/folios',       foliosRouter);
app.use('/api/staff',        staffRouter);
app.use('/api/housekeeping', housekeepingRouter);
app.use('/api/orders',       ordersRouter);
app.use('/api/channels',     channelsRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`SERVV HMS API running on http://localhost:${PORT}`);
});
