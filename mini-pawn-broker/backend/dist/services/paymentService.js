"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.receivePayment = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const client_2 = require("@prisma/client");
const loanService_1 = require("./loanService");
const receivePayment = (loanId, data) => __awaiter(void 0, void 0, void 0, function* () {
    const { amount, paymentMode, remarks } = data;
    return yield client_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        // 1. Get loan with accrued interest using the service function (we pass tx? actually getLoanById uses prisma, we shouldn't mix, but for calculation we can re-implement or fetch within tx)
        // To ensure consistency, we should fetch within the transaction.
        const loan = yield tx.loan.findUnique({
            where: { id: loanId },
            include: { transactions: { orderBy: { transactionDate: 'asc' } } }
        });
        if (!loan)
            throw new Error('Loan not found');
        if (loan.status === client_2.LoanStatus.CLOSED)
            throw new Error('Cannot make payment on a closed loan');
        // Calculate accrued interest and outstanding principal (logic duplicated for transaction safety)
        const today = new Date();
        const loanDate = new Date(loan.loanDate);
        const msPerDay = 1000 * 60 * 60 * 24;
        let accruedInterest = 0;
        let currentPrincipal = loan.loanAmount;
        let currentDate = loanDate;
        for (const t of loan.transactions) {
            if (t.transactionType === client_2.TransactionType.PAYMENT) {
                const daysDiff = Math.max(0, Math.floor((t.transactionDate.getTime() - currentDate.getTime()) / msPerDay));
                if (daysDiff > 0) {
                    const dailyInterest = (currentPrincipal * loan.interestRate / 100) / 30;
                    accruedInterest += dailyInterest * daysDiff;
                }
                accruedInterest -= t.interestComponent;
                if (accruedInterest < 0)
                    accruedInterest = 0;
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
        if (accruedInterest < 0)
            accruedInterest = 0;
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
        }
        else {
            interestPortion = accruedInterest;
            principalPortion = amount - accruedInterest;
        }
        // 3. Create Loan Transaction
        const transaction = yield tx.loanTransaction.create({
            data: {
                loanId: loan.id,
                transactionType: client_2.TransactionType.PAYMENT,
                amount: amount,
                principalComponent: principalPortion,
                interestComponent: interestPortion,
                transactionDate: today,
                remarks: remarks || 'Loan Payment'
            }
        });
        // 4. Update Loan Status if fully paid
        if (currentPrincipal - principalPortion <= 0) {
            yield tx.loan.update({
                where: { id: loan.id },
                data: { status: client_2.LoanStatus.CLOSED }
            });
        }
        // 5. Journal Entries
        const voucherNo = yield (0, loanService_1.generateVoucherNumber)(); // Note: inside tx, this might have race conditions in high concurrency, but fine for mini app.
        const accountType = paymentMode === 'CASH' ? 'Cash A/c' : 'Bank A/c';
        // Debit Cash/Bank for total amount
        yield tx.journalEntry.create({
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
            yield tx.journalEntry.create({
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
            yield tx.journalEntry.create({
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
    }));
});
exports.receivePayment = receivePayment;
