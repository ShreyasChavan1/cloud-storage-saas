import { Plan } from '@prisma/client'

export interface PlanDTO {
  id: string
  name: string
  storageLimitGb: number
  price: string
}

export function toPlanDTO(plan: Plan): PlanDTO {
  return {
    id: plan.id,
    name: plan.name,
    storageLimitGb: plan.storageLimit,
    price: plan.price.toString(),
  }
}
