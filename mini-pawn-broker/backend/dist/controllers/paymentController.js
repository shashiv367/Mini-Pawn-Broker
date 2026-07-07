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
exports.receivePaymentController = void 0;
const paymentService_1 = require("../services/paymentService");
const schemas_1 = require("../types/schemas");
const receivePaymentController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { loanId } = req.params;
        const validatedData = schemas_1.createPaymentSchema.parse(req.body);
        const transaction = yield (0, paymentService_1.receivePayment)(loanId, validatedData);
        res.status(201).json(transaction);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ errors: error.errors });
        }
        else if (error.message.includes('not found')) {
            res.status(404).json({ message: error.message });
        }
        else if (error.message.includes('exceeds') || error.message.includes('closed') || error.message.includes('zero')) {
            res.status(400).json({ message: error.message });
        }
        else {
            console.error(error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }
});
exports.receivePaymentController = receivePaymentController;
