import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
  locale: z.enum(['PT_PT', 'PT_BR', 'EN']),
  // Termos + Política e consentimento explícito para dados de saúde (peso), ambos obrigatórios.
  acceptTerms: z.literal(true),
  wellbeingConsent: z.literal(true),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
