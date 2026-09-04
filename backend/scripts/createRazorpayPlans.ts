import 'dotenv/config'

const keyId = process.env.RAZORPAY_KEY_ID
const keySecret = process.env.RAZORPAY_KEY_SECRET
const currency = process.env.RAZORPAY_CURRENCY ?? 'INR'

if (!keyId || !keySecret) throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required')

const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')

async function createPlan(name: string, amount: number) {
  const res = await fetch('https://api.razorpay.com/v1/plans', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      period: 'monthly',
      interval: 1,
      item: { name: `Nimbus ${name} Monthly`, amount, currency, description: `${name} monthly cloud storage` },
      notes: { product: 'Nimbus', plan: name },
    }),
  })
  if (!res.ok) throw new Error(`Failed to create ${name} plan: HTTP ${res.status} ${await res.text()}`)
  const body = await res.json() as { id: string }
  console.log(`${name}: ${body.id}`)
}

async function main() {
  await createPlan('Basic', 999)
  await createPlan('Pro', 2499)
  console.log('Copy the printed IDs into RAZORPAY_PLAN_BASIC_ID and RAZORPAY_PLAN_PRO_ID.')
}

main().catch((err) => { console.error(err); process.exit(1) })
