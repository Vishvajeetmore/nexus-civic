import { z } from 'zod';

import { GRIEVANCE_CATEGORIES } from '../config/departments';

export const createGrievanceSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.string().refine((category) => GRIEVANCE_CATEGORIES.includes(category), {
    message: 'Unsupported grievance category',
  }),
  district: z.string().trim().min(2),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    accuracy: z.number().optional(),
    address: z.string().optional(),
  }),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

export const updateGrievanceStatusSchema = z.object({
  status: z.enum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
  note: z.string().max(500).optional(),
});

export type CreateGrievancePayload = z.infer<typeof createGrievanceSchema>;
export type UpdateGrievanceStatusPayload = z.infer<typeof updateGrievanceStatusSchema>;
