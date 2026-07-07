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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLoanById = exports.getLoans = exports.createLoan = exports.generateVoucherNumber = exports.generateLoanNumber = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const client_2 = require("@prisma/client");
const generateLoanNumber = () => __awaiter(void 0, void 0, void 0, function* () {
    const count = yield client_1.default.loan.count();
    return `LN${String(count + 1).padStart(6, '0')}`;
});
exports.generateLoanNumber = generateLoanNumber;
const generateVoucherNumber = () => __awaiter(void 0, void 0, void 0, function* () {
    const count = yield client_1.default.journalEntry.count({
        where: { voucherNo: { startsWith: 'JV' } }
    });
    // Using division by 2 or distinct vouchers isn't strictly necessary if we group by voucher. 
    // Wait, every transaction usually has 1 voucher number covering both debit and credit. 
    // The count of distinct vouchers is what we need. Let's just use total journal entries / 2 since each creates a debit and credit.
    const voucherCount = Math.floor(count / 2) + 1;
    return `JV${String(voucherCount).padStart(6, '0')}`;
});
exports.generateVoucherNumber = generateVoucherNumber;
const createLoan = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const { customerName, loanDate } = data, loanData = __rest(data, ["customerName", "loanDate"]);
    const netWeight = loanData.grossWeight - loanData.stoneWeight;
    return yield client_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        // 1. Create or Find Customer
        let customer = yield tx.customer.findFirst({ where: { name: customerName } });
        if (!customer) {
            customer = yield tx.customer.create({ data: { name: customerName } });
        }
        // 2. Generate numbers
        const loanNumber = yield (0, exports.generateLoanNumber)();
        const voucherNo = yield (0, exports.generateVoucherNumber)();
        // 3. Create Loan
        const loan = yield tx.loan.create({
            data: Object.assign(Object.assign({}, loanData), { netWeight,
                loanNumber, loanDate: new Date(loanDate), customerId: customer.id })
        });
        // 4. Create Loan Disbursement Transaction
        yield tx.loanTransaction.create({
            data: {
                loanId: loan.id,
                transactionType: client_2.TransactionType.LOAN_DISBURSEMENT,
                amount: loan.loanAmount,
                principalComponent: loan.loanAmount,
                interestComponent: 0,
                transactionDate: new Date(loanDate),
                remarks: 'Initial Loan Disbursement'
            }
        });
        // 5. Create Journal Entries (Double Entry Bookkeeping)
        const accountType = loan.paymentMode === client_2.PaymentMode.CASH ? 'Cash A/c' : 'Bank A/c';
        // Debit Loan Receivable A/c
        yield tx.journalEntry.create({
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
        yield tx.journalEntry.create({
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
    }));
});
exports.createLoan = createLoan;
const getLoans = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield client_1.default.loan.findMany({
        include: { customer: true },
        orderBy: { createdAt: 'desc' }
    });
});
exports.getLoans = getLoans;
const getLoanById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const loan = yield client_1.default.loan.findUnique({
        where: { id },
        include: { customer: true, transactions: { orderBy: { transactionDate: 'desc' } } }
    });
    if (!loan)
        return null;
    // Calculate Interest
    const today = new Date();
    const loanDate = new Date(loan.loanDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    // Calculate total outstanding principal
    let outstandingPrincipal = loan.loanAmount;
    let totalInterestPaid = 0;
    let totalPrincipalPaid = 0;
    for (const t of loan.transactions) {
        if (t.transactionType === client_2.TransactionType.PAYMENT) {
            outstandingPrincipal -= t.principalComponent;
            totalInterestPaid += t.interestComponent;
            totalPrincipalPaid += t.principalComponent;
        }
    }
    // Find last payment or disbursement date
    let lastActivityDate = loanDate;
    if (loan.transactions.length > 0) {
        // Find the most recent date we calculated interest up to. 
        // Actually, standard practice is to calculate interest from loan date minus days already paid for.
        // But simple interest formula: total interest = (principal * rate * days)/30. 
        // Since payments reduce principal, we calculate interest for each period between payments.
    }
    // Let's implement exact period-by-period interest calculation.
    let accruedInterest = 0;
    let currentPrincipal = loan.loanAmount;
    let currentDate = loanDate;
    // sort transactions ascending for calculation
    const sortedTx = [...loan.transactions].sort((a, b) => a.transactionDate.getTime() - b.transactionDate.getTime());
    for (const tx of sortedTx) {
        if (tx.transactionType === client_2.TransactionType.PAYMENT) {
            const daysDiff = Math.max(0, Math.floor((tx.transactionDate.getTime() - currentDate.getTime()) / msPerDay));
            if (daysDiff > 0) {
                const dailyInterest = (currentPrincipal * loan.interestRate / 100) / 30;
                accruedInterest += dailyInterest * daysDiff;
            }
            accruedInterest -= tx.interestComponent;
            // ensure we don't drop below 0 if they overpaid somehow, though they shouldn't
            if (accruedInterest < 0)
                accruedInterest = 0;
            currentPrincipal -= tx.principalComponent;
            currentDate = tx.transactionDate;
        }
    }
    // Calculate interest from last payment/disbursement to today
    const daysDiffToToday = Math.max(0, Math.floor((today.getTime() - currentDate.getTime()) / msPerDay));
    if (daysDiffToToday > 0 && currentPrincipal > 0) {
        const dailyInterest = (currentPrincipal * loan.interestRate / 100) / 30;
        accruedInterest += dailyInterest * daysDiffToToday;
    }
    // Round interest to 2 decimal places
    accruedInterest = Math.round(accruedInterest * 100) / 100;
    if (accruedInterest < 0)
        accruedInterest = 0;
    return Object.assign(Object.assign({}, loan), { outstandingPrincipal,
        accruedInterest,
        totalPrincipalPaid,
        totalInterestPaid, totalPayable: outstandingPrincipal + accruedInterest });
});
exports.getLoanById = getLoanById;
