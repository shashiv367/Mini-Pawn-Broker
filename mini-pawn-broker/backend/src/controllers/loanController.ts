import { Request, Response } from 'express';
import { createLoan, getLoans, getLoanById } from '../services/loanService';
import { createLoanSchema } from '../types/schemas';

export const createLoanController = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = createLoanSchema.parse(req.body);
    const loan = await createLoan(validatedData);
    res.status(201).json(loan);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ errors: error.errors });
    } else {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
};

export const getLoansController = async (req: Request, res: Response): Promise<void> => {
  try {
    const loans = await getLoans();
    res.status(200).json(loans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getLoanByIdController = async (req: Request, res: Response): Promise<void> => {
  try {
    const loan = await getLoanById(req.params.id as string);
    if (!loan) {
      res.status(404).json({ message: 'Loan not found' });
      return;
    }
    res.status(200).json(loan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
