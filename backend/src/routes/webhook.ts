import { Router, Request, Response } from 'express';
import { handleIncoming } from '../services/whatsappBot';

const router = Router();

const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN ?? 'servv_wh_token';

// ── GET /api/webhook — Meta verification handshake ────────────────────────────
router.get('/', (req: Request, res: Response) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Webhook] WhatsApp webhook verified ✓');
    res.status(200).send(challenge);
  } else {
    console.warn('[Webhook] Verification failed — check WEBHOOK_VERIFY_TOKEN');
    res.sendStatus(403);
  }
});

// ── POST /api/webhook — incoming messages ─────────────────────────────────────
router.post('/', (req: Request, res: Response) => {
  // Respond 200 immediately so Meta doesn't retry
  res.sendStatus(200);
  processPayload(req.body).catch((err) => console.error('[Webhook] Error:', err));
});

async function processPayload(payload: any): Promise<void> {
  if (payload?.object !== 'whatsapp_business_account') return;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue;

      for (const msg of change.value?.messages ?? []) {
        // Only handle plain text messages (ignore reactions, images, etc.)
        if (msg.type !== 'text') continue;

        const from: string = msg.from;
        const body: string = msg.text?.body ?? '';
        if (!from || !body.trim()) continue;

        console.log(`[Webhook] ← ${from}: ${body.slice(0, 80)}`);
        await handleIncoming(from, body);
      }
    }
  }
}

export default router;
