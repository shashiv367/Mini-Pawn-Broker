import prisma from '../prisma/client';
import { TransactionType, LoanStatus } from '@prisma/client';
import { getLoanById, generateVoucherNumber } from './loanService';

export const receivePayment = async (loanId: string, data: any) => {
  const { amount, paymentMode, remarks } = data;

  return await prisma.$transaction(async (tx) => {
    // Fetch within the transaction for consistency.
    const loan = await tx.loan.findUnique({
      where: { id: loanId },
      include: { transactions: { orderBy: { transactionDate: 'asc' } } }
    });

    if (!loan) throw new Error('Loan not found');
    if (loan.status === LoanStatus.CLOSED) throw new Error('Cannot make payment on a closed loan');

    // Calculate accrued interest and outstanding principal (logic duplicated for transaction safety)
    const today = new Date();
    const loanDate = new Date(loan.loanDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    
    let accruedInterest = 0;
    let currentPrincipal = loan.loanAmount;
    let currentDate = loanDate;

    for (const t of loan.transactions) {
      if (t.transactionType === TransactionType.PAYMENT) {
        const daysDiff = Math.max(0, Math.floor((t.transactionDate.getTime() - currentDate.getTime()) / msPerDay));
        if (daysDiff > 0) {
          const dailyInterest = (currentPrincipal * loan.interestRate / 100) / 30;
          accruedInterest += dailyInterest * daysDiff;
        }
        accruedInterest -= t.interestComponent;
        if (accruedInterest < 0) accruedInterest = 0;
        currentPrincipal -= t.principalComponent;
        currentDate = t.transactionDate;
      }
    }

    const daysDiffToToday = Math.max(0, Math.floor((today.getTime() - currentDate.getTime()) / msPerDay));
    if (daysDiffToToday > 0 && currentPrincipal > 0) {
      const dailyInterest = (currentPrincipal * loan.interestRate / 100) / 30;
      accruedInterest += dailyInterest * daysDiffToToday;
    }

    accruedInterest = Math.round(accruedInterest * 100) / 100;
    if (accruedInterest < 0) accruedInterest = 0;

    const totalPayable = currentPrincipal + accruedInterest;
    
    if (amount > totalPayable) {
      throw new Error(`Payment amount (${amount}) exceeds total payable (${totalPayable})`);
    }
    if (amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    // 2. Allocate payment
    let interestPortion = 0;
    let principalPortion = 0;

    if (amount <= accruedInterest) {
      interestPortion = amount;
    } else {
      interestPortion = accruedInterest;
      principalPortion = amount - accruedInterest;
    }

    // 3. Create Loan Transaction
    const transaction = await tx.loanTransaction.create({
      data: {
        loanId: loan.id,
        transactionType: TransactionType.PAYMENT,
        amount: amount,
        principalComponent: principalPortion,
        interestComponent: interestPortion,
        transactionDate: today,
        remarks: remarks || 'Loan Payment'
      }
    });

    // 4. Update Loan Status if fully paid
    if (currentPrincipal - principalPortion <= 0) {
      await tx.loan.update({
        where: { id: loan.id },
        data: { status: LoanStatus.CLOSED }
      });
    }

    // 5. Journal Entries
    const voucherNo = await generateVoucherNumber();
    const accountType = paymentMode === 'CASH' ? 'Cash A/c' : 'Bank A/c';

    // Debit Cash/Bank for total amount
    await tx.journalEntry.create({
      data: {
        voucherNo,
        date: today,
        account: accountType,
        debit: amount,
        credit: 0,
        referenceType: 'PAYMENT',
        referenceId: transaction.id
      }
    });

    // Credit Interest Income for interest portion
    if (interestPortion > 0) {
      await tx.journalEntry.create({
        data: {
          voucherNo,
          date: today,
          account: 'Interest Income A/c',
          debit: 0,
          credit: interestPortion,
          referenceType: 'PAYMENT',
          referenceId: transaction.id
        }
      });
    }

    // Credit Loan Receivable for principal portion
    if (principalPortion > 0) {
      await tx.journalEntry.create({
        data: {
          voucherNo,
          date: today,
          account: 'Loan Receivable A/c',
          debit: 0,
          credit: principalPortion,
          referenceType: 'PAYMENT',
          referenceId: transaction.id
        }
      });
    }

    return transaction;
  });
};
