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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLoanByIdController = exports.getLoansController = exports.createLoanController = void 0;
const loanService_1 = require("../services/loanService");
const schemas_1 = require("../types/schemas");
const createLoanController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const validatedData = schemas_1.createLoanSchema.parse(req.body);
        const loan = yield (0, loanService_1.createLoan)(validatedData);
        res.status(201).json(loan);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ errors: error.errors });
        }
        else {
            console.error(error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }
});
exports.createLoanController = createLoanController;
const getLoansController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const loans = yield (0, loanService_1.getLoans)();
        res.status(200).json(loans);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
exports.getLoansController = getLoansController;
const getLoanByIdController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const loan = yield (0, loanService_1.getLoanById)(req.params.id);
        if (!loan) {
            res.status(404).json({ message: 'Loan not found' });
            return;
        }
        res.status(200).json(loan);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
exports.getLoanByIdController = getLoanByIdController;
