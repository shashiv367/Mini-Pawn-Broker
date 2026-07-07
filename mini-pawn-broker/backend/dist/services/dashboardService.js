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
exports.getDashboardMetrics = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const client_2 = require("@prisma/client");
const getDashboardMetrics = () => __awaiter(void 0, void 0, void 0, function* () {
    const totalLoans = yield client_1.default.loan.count();
    const activeLoans = yield client_1.default.loan.count({ where: { status: client_2.LoanStatus.ACTIVE } });
    const allLoans = yield client_1.default.loan.findMany({
        include: { transactions: true }
    });
    let outstandingPrincipal = 0;
    let interestEarned = 0;
    for (const loan of allLoans) {
        let principalPaid = 0;
        for (const t of loan.transactions) {
            if (t.transactionType === client_2.TransactionType.PAYMENT) {
                principalPaid += t.principalComponent;
                interestEarned += t.interestComponent;
            }
        }
        outstandingPrincipal += (loan.loanAmount - principalPaid);
    }
    // Today's collections
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaysTransactions = yield client_1.default.loanTransaction.findMany({
        where: {
            transactionType: client_2.TransactionType.PAYMENT,
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
});
exports.getDashboardMetrics = getDashboardMetrics;
