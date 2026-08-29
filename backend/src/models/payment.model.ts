import { Payment } from '@prisma/client'

// `amount` is a Prisma Decimal — serialized as a string (not a JS number)
// so JSON.stringify can never silently lose precision on a currency value,
// the same reasoning Payment.amount itself uses `@db.Decimal` instead of a
// float column for in Postgres.
export interface PaymentDTO {
  id: string
  amount: string
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED'
  provider: string
  providerOrderId: string | null
  providerPaymentId: string | null
  createdAt: string
}

export function toPaymentDTO(payment: Payment): PaymentDTO {
  return {
    id: payment.id,
    amount: payment.amount.toString(),
    status: payment.status,
    provider: payment.provider,
    providerOrderId: payment.providerOrderId,
    providerPaymentId: payment.providerPaymentId,
    createdAt: payment.createdAt.toISOString(),
  }
}
