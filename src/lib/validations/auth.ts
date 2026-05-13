import { z } from 'zod'

export const signInSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Required'),
})

export type SignInData = z.infer<typeof signInSchema>
