import prisma from '../prisma/client';

export const getDaybookEntries = async () => {
  return await prisma.journalEntry.findMany({
    orderBy: { createdAt: 'desc' }
  });
};
