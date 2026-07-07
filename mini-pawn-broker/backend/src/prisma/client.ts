import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import dotenv from 'dotenv';

dotenv.config();

// Prisma 7 requires a driver adapter for MySQL/MariaDB connections.
// We parse the DATABASE_URL to extract connection credentials.
function parseDatabaseUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '3306', 10),
    user: parsed.username,
    password: parsed.password,
    database: parsed.pathname.replace('/', ''),
    connectionLimit: 5,
  };
}

const dbConfig = parseDatabaseUrl(process.env.DATABASE_URL || 'mysql://root:root@localhost:3306/pawn_broker');
const adapter = new PrismaMariaDb(dbConfig);
const prisma = new PrismaClient({ adapter });

export default prisma;
