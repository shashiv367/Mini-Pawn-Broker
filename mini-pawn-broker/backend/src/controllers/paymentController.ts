import { Request, Response } from 'express';
import { receivePayment } from '../services/paymentService';
import { createPaymentSchema } from '../types/schemas';

export const receivePaymentController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { loanId } = req.params;
    const validatedData = createPaymentSchema.parse(req.body);
    const transaction = await receivePayment(loanId as string, validatedData);
    res.status(201).json(transaction);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ errors: error.errors });
    } else if (error.message.includes('not found')) {
      res.status(404).json({ message: error.message });
    } else if (error.message.includes('exceeds') || error.message.includes('closed') || error.message.includes('zero')) {
      res.status(400).json({ message: error.message });
    } else {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
};
