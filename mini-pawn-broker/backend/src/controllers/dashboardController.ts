import { Request, Response } from 'express';
import { getDashboardMetrics } from '../services/dashboardService';

export const getDashboardController = async (req: Request, res: Response): Promise<void> => {
  try {
    const metrics = await getDashboardMetrics();
    res.status(200).json(metrics);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
