##Pawn Broker Project

This project is a simple Pawn Broker Loan Management System built using Next.js, Node.js, Express, MySQL, and Prisma ORM. The focus of the implementation is on clean business logic, proper accounting, transaction history, and database design rather than UI.

Tech Stack
Frontend
Next.js 15 (App Router)
TypeScript
Tailwind CSS
React Hook Form
Zod
TanStack React Query

Backend
Node.js
Express.js
TypeScript
Prisma ORM
Database
MySQL

Project Structure

The application is divided into two separate parts:

Frontend – Handles the user interface.
Backend – Contains APIs, business logic, and database operations.

The backend follows a simple layered architecture:

Routes
Controllers
Services
Prisma (Database)

Business logic is kept inside the service layer, while controllers only handle requests and responses.

Database Design

The database is designed to preserve complete transaction history instead of simply updating balances.

Customer

Stores customer information.

Loan

Stores all loan details including customer, pledged item, loan amount, interest rate, payment mode, and current status.

Loan Transactions

Every financial activity is recorded here.

Examples include:

Loan Disbursement
Customer Payment
Adjustments

Nothing is deleted or overwritten, allowing a complete audit trail.

Journal Entries

Stores accounting entries for every transaction using double-entry bookkeeping.

Interest Calculation

The application uses Simple Interest.

Interest is calculated daily based on the outstanding principal.

Formula used:

Monthly Interest = Outstanding Principal × Monthly Interest Rate
Daily Interest = Monthly Interest ÷ 30

Whenever a payment is made or loan details are viewed, interest is calculated from the previous transaction date up to the current date.

Compound interest is not used.

Payment Processing

The application supports both partial and multiple payments.

The payment allocation works as follows:

Calculate the interest due up to today's date.
If the payment amount is less than or equal to the interest due, the full payment is applied to interest.
If the payment is greater than the interest due, the interest is cleared first and the remaining amount is applied to the principal.
Payments greater than the total amount payable are rejected.
Once the outstanding principal becomes zero, the loan is automatically marked as Closed.

Each payment is stored as a separate transaction so the complete payment history is always available.

Accounting Logic

The application follows basic double-entry accounting.

Loan Creation

Debit

Loan Receivable Account

Credit

Cash Account (Cash Payment)
Bank Account (Bank Payment)
Customer Payment

Debit

Cash/Bank Account

Credit

Interest Income Account (Interest Portion)
Loan Receivable Account (Principal Portion)

Journal entries are automatically created whenever a loan or payment transaction occurs.

Environment Variables
Backend
PORT=3001

DATABASE_URL="mysql://root:password@localhost:3306/pawn_broker"
Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001/api
Running the Project
Backend
cd backend

npm install

npx prisma migrate dev --name init

npm run dev

Make sure MySQL is running before starting the backend.

Frontend
cd frontend

npm install

npm run dev
Available APIs
Loans
POST /api/loans
GET /api/loans
GET /api/loans/:id
Payments
POST /api/payments/:loanId
Day Book
GET /api/daybook
Dashboard
GET /api/dashboard
Sample Request
{
  "customerName": "John Doe",
  "loanDate": "2023-10-01",
  "loanAmount": 100000,
  "interestRate": 2,
  "itemName": "Gold Ring",
  "grossWeight": 15.5,
  "stoneWeight": 2.1,
  "estimatedValue": 120000,
  "paymentMode": "CASH"
}
Design Approach

The primary objective of this project was to implement the business logic correctly while keeping the codebase clean and easy to maintain.

Key design decisions include:

Maintaining a complete transaction history instead of updating balances directly.
Using Prisma transactions to ensure database consistency.
Separating business logic from controllers for better maintainability.
Implementing automatic payment allocation between interest and principal.
Generating journal entries for every financial transaction to maintain proper accounting records.
Keeping the UI simple so the focus remains on functionality and correctness.

This approach makes the project easy to understand, extend, and modify, which is especially useful if additional requirements are introduced later.