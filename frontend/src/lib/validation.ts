import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const receiptEditSchema = z.object({
  store_name: z.string().min(1, 'Store name is required'),
  store_address: z.string().optional(),
  store_phone: z.string().optional(),
  purchase_date: z.string().min(1, 'Purchase date is required'),
  receipt_number: z.string().optional(),
  subtotal: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  total_amount: z.number().min(0, 'Amount must be positive'),
  payment_mode: z.enum(['cash', 'upi', 'card', 'net_banking', 'wallet', 'other']),
  category: z.string().min(1, 'Category is required'),
  notes: z.string().optional(),
});

export const itemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  price: z.number().min(0, 'Price must be positive'),
  serial_number: z.string().optional(),
  brand_warranty_months: z.number().int().min(0).optional(),
  extended_warranty_months: z.number().int().min(0).optional(),
});

export const folderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(50),
  emoji: z.string().min(1).max(4),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type ReceiptEditFormData = z.infer<typeof receiptEditSchema>;
export type ItemFormData = z.infer<typeof itemSchema>;
export type FolderFormData = z.infer<typeof folderSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
