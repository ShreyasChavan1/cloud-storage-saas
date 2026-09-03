import { Router } from 'express'
import { webhookController } from '../controllers/webhook.controller'

const router = Router()

// No requireAuth — Razorpay itself is the caller, authenticated instead by
// the HMAC signature over the raw request body (verified inside
// webhookService.handleRazorpayWebhook via RAZORPAY_WEBHOOK_SECRET). Must
// receive the UNPARSED body — see app.ts, which mounts this router with
// express.raw() ahead of the app-wide express.json() specifically so the
// exact bytes Razorpay signed are still available here, byte-for-byte.
router.post('/razorpay', webhookController.handleRazorpayWebhook)

export default router
