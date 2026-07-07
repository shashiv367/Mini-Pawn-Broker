import { Request, Response } from 'express';
import { getDaybookEntries } from '../services/daybookService';

export const getDaybookController = async (req: Request, res: Response): Promise<void> => {
  try {
    const entries = await getDaybookEntries();
    res.status(200).json(entries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
