export const serializeUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
});

export const serializeAccount = (account) => ({
  id: account._id.toString(),
  name: account.name,
  type: account.type,
  balance: Number(account.balance || 0),
  createdAt: account.createdAt,
  updatedAt: account.updatedAt,
});

export const serializeTransaction = (transaction) => ({
  id: transaction._id.toString(),
  type: transaction.type,
  amount: Number(transaction.amount || 0),
  category: transaction.category,
  date: transaction.date,
  description: transaction.description,
  source: transaction.source,
  smsRaw: transaction.smsRaw,
  importBatchId: transaction.importBatchId,
  account: transaction.account && typeof transaction.account === 'object'
    ? {
        id: transaction.account._id?.toString?.() || transaction.account.id,
        name: transaction.account.name,
        type: transaction.account.type,
      }
    : undefined,
  accountId: transaction.account?._id?.toString?.() || transaction.account?.toString?.(),
  createdAt: transaction.createdAt,
  updatedAt: transaction.updatedAt,
});
