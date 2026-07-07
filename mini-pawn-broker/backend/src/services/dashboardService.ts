import prisma from '../prisma/client';
import { TransactionType, LoanStatus } from '@prisma/client';

export const getDashboardMetrics = async () => {
  const totalLoans = await prisma.loan.count();
  const activeLoans = await prisma.loan.count({ where: { status: LoanStatus.ACTIVE } });
  
  const allLoans = await prisma.loan.findMany({
    include: { transactions: true }
  });

  let outstandingPrincipal = 0;
  let interestEarned = 0;

  for (const loan of allLoans) {
    let principalPaid = 0;
    for (const t of loan.transactions) {
      if (t.transactionType === TransactionType.PAYMENT) {
        principalPaid += t.principalComponent;
        interestEarned += t.interestComponent;
      }
    }
    outstandingPrincipal += (loan.loanAmount - principalPaid);
  }

  // Today's collections
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todaysTransactions = await prisma.loanTransaction.findMany({
    where: {
      transactionType: TransactionType.PAYMENT,
      transactionDate: {
        gte: today
      }
    }
  });

  const todaysCollections = todaysTransactions.reduce((acc, curr) => acc + curr.amount, 0);

  return {
    totalLoans,
    activeLoans,
    outstandingPrincipal,
    interestEarned,
    todaysCollections
  };
};
