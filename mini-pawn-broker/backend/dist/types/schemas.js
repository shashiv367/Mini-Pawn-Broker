"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentSchema = exports.createLoanSchema = void 0;
const zod_1 = require("zod");
exports.createLoanSchema = zod_1.z.object({
    customerName: zod_1.z.string().min(1, 'Customer name is required'),
    loanDate: zod_1.z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
    loanAmount: zod_1.z.number().positive('Loan amount must be positive'),
    interestRate: zod_1.z.number().min(0, 'Interest rate cannot be negative'),
    itemName: zod_1.z.string().min(1, 'Item name is required'),
    grossWeight: zod_1.z.number().min(0, 'Gross weight cannot be negative'),
    stoneWeight: zod_1.z.number().min(0, 'Stone weight cannot be negative'),
    estimatedValue: zod_1.z.number().positive('Estimated value must be positive'),
    paymentMode: zod_1.z.enum(['CASH', 'BANK']),
}).refine((data) => data.grossWeight >= data.stoneWeight, {
    message: 'Gross weight cannot be smaller than stone weight',
    path: ['grossWeight']
}).refine((data) => data.loanAmount <= data.estimatedValue, {
    message: 'Loan amount cannot exceed estimated item value',
    path: ['loanAmount']
});
exports.createPaymentSchema = zod_1.z.object({
    amount: zod_1.z.number().positive('Payment amount must be positive'),
    paymentMode: zod_1.z.enum(['CASH', 'BANK']),
    remarks: zod_1.z.string().optional()
});
