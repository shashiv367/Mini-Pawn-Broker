import { Router } from 'express';
import { createLoanController, getLoansController, getLoanByIdController } from '../controllers/loanController';
import { receivePaymentController } from '../controllers/paymentController';
import { getDaybookController } from '../controllers/daybookController';
import { getDashboardController } from '../controllers/dashboardController';

const router = Router();

router.post('/loans', createLoanController);
router.get('/loans', getLoansController);
router.get('/loans/:id', getLoanByIdController);

router.post('/payments/:loanId', receivePaymentController);

router.get('/daybook', getDaybookController);

router.get('/dashboard', getDashboardController);

export default router;
