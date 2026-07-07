import prisma from '../prisma/client';
import { TransactionType, PaymentMode, LoanStatus } from '@prisma/client';

export const generateLoanNumber = async (): Promise<string> => {
  const count = await prisma.loan.count();
  return `LN${String(count + 1).padStart(6, '0')}`;
};

export const generateVoucherNumber = async (): Promise<string> => {
  const count = await prisma.journalEntry.count({
    where: { voucherNo: { startsWith: 'JV' } }
  });
  // Each transaction creates 2 journal entries (debit + credit), so divide by 2 for voucher count.
  const voucherCount = Math.floor(count / 2) + 1;
  return `JV${String(voucherCount).padStart(6, '0')}`;
};

export const createLoan = async (data: any) => {
  const { customerName, loanDate, ...loanData } = data;
  const netWeight = loanData.grossWeight - loanData.stoneWeight;

  return await prisma.$transaction(async (tx) => {
    // 1. Create or Find Customer
    let customer = await tx.customer.findFirst({ where: { name: customerName } });
    if (!customer) {
      customer = await tx.customer.create({ data: { name: customerName } });
    }

    // 2. Generate numbers
    const loanNumber = await generateLoanNumber();
    const voucherNo = await generateVoucherNumber();

    // 3. Create Loan
    const loan = await tx.loan.create({
      data: {
        ...loanData,
        netWeight,
        loanNumber,
        loanDate: new Date(loanDate),
        customerId: customer.id
      }
    });

    // 4. Create Loan Disbursement Transaction
    await tx.loanTransaction.create({
      data: {
        loanId: loan.id,
        transactionType: TransactionType.LOAN_DISBURSEMENT,
        amount: loan.loanAmount,
        principalComponent: loan.loanAmount,
        interestComponent: 0,
        transactionDate: new Date(loanDate),
        remarks: 'Initial Loan Disbursement'
      }
    });

    // 5. Create Journal Entries (Double Entry Bookkeeping)
    const accountType = loan.paymentMode === PaymentMode.CASH ? 'Cash A/c' : 'Bank A/c';
    
    // Debit Loan Receivable A/c
    await tx.journalEntry.create({
      data: {
        voucherNo,
        date: new Date(loanDate),
        account: 'Loan Receivable A/c',
        debit: loan.loanAmount,
        credit: 0,
        referenceType: 'LOAN',
        referenceId: loan.id
      }
    });

    // Credit Cash/Bank A/c
    await tx.journalEntry.create({
      data: {
        voucherNo,
        date: new Date(loanDate),
        account: accountType,
        debit: 0,
        credit: loan.loanAmount,
        referenceType: 'LOAN',
        referenceId: loan.id
      }
    });

    return loan;
  });
};

export const getLoans = async () => {
  return await prisma.loan.findMany({
    include: { customer: true },
    orderBy: { createdAt: 'desc' }
  });
};

export const getLoanById = async (id: string) => {
  const loan = await prisma.loan.findUnique({
    where: { id },
    include: { customer: true, transactions: { orderBy: { transactionDate: 'desc' } } }
  });

  if (!loan) return null;

  // Period-by-period interest calculation (simple interest, daily accrual).
  const today = new Date();
  const loanDate = new Date(loan.loanDate);
  const msPerDay = 1000 * 60 * 60 * 24;

  let accruedInterest = 0;
  let currentPrincipal = loan.loanAmount;
  let currentDate = loanDate;
  let totalPrincipalPaid = 0;
  let totalInterestPaid = 0;

  // Sort transactions ascending for calculation
  const sortedTx = [...loan.transactions].sort((a, b) => a.transactionDate.getTime() - b.transactionDate.getTime());

  for (const tx of sortedTx) {
    if (tx.transactionType === TransactionType.PAYMENT) {
      const daysDiff = Math.max(0, Math.floor((tx.transactionDate.getTime() - currentDate.getTime()) / msPerDay));

      if (daysDiff > 0) {
        const dailyInterest = (currentPrincipal * loan.interestRate / 100) / 30;
        accruedInterest += dailyInterest * daysDiff;
      }

      accruedInterest -= tx.interestComponent;
      if (accruedInterest < 0) accruedInterest = 0;

      currentPrincipal -= tx.principalComponent;
      totalPrincipalPaid += tx.principalComponent;
      totalInterestPaid += tx.interestComponent;
      currentDate = tx.transactionDate;
    }
  }

  // Calculate interest from last payment/disbursement to today
  const daysDiffToToday = Math.max(0, Math.floor((today.getTime() - currentDate.getTime()) / msPerDay));
  if (daysDiffToToday > 0 && currentPrincipal > 0) {
    const dailyInterest = (currentPrincipal * loan.interestRate / 100) / 30;
    accruedInterest += dailyInterest * daysDiffToToday;
  }

  accruedInterest = Math.round(accruedInterest * 100) / 100;
  if (accruedInterest < 0) accruedInterest = 0;

  const outstandingPrincipal = currentPrincipal;

  return {
    ...loan,
    outstandingPrincipal,
    accruedInterest,
    totalPrincipalPaid,
    totalInterestPaid,
    totalPayable: outstandingPrincipal + accruedInterest
  };
};
