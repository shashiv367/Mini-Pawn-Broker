import { z } from 'zod';

export const createLoanSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  loanDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
  loanAmount: z.number().positive('Loan amount must be positive'),
  interestRate: z.number().min(0, 'Interest rate cannot be negative'),
  itemName: z.string().min(1, 'Item name is required'),
  grossWeight: z.number().min(0, 'Gross weight cannot be negative'),
  stoneWeight: z.number().min(0, 'Stone weight cannot be negative'),
  estimatedValue: z.number().positive('Estimated value must be positive'),
  paymentMode: z.enum(['CASH', 'BANK']),
}).refine((data) => data.grossWeight >= data.stoneWeight, {
  message: 'Gross weight cannot be smaller than stone weight',
  path: ['grossWeight']
}).refine((data) => data.loanAmount <= data.estimatedValue, {
  message: 'Loan amount cannot exceed estimated item value',
  path: ['loanAmount']
});

export const createPaymentSchema = z.object({
  amount: z.number().positive('Payment amount must be positive'),
  paymentMode: z.enum(['CASH', 'BANK']),
  remarks: z.string().optional()
});
