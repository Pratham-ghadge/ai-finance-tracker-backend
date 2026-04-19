import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import { expenseCategories, incomeCategories } from '../utils/constants.js';
import { parseCsvTransactions, parseSmsTransactions } from '../utils/parsers.js';
import { serializeTransaction } from '../utils/serializers.js';

const getAllowedCategories = (type) => (type === 'INCOME' ? incomeCategories : expenseCategories);
const signedAmount = (type, amount) => (type === 'INCOME' ? amount : -amount);

const validateCategory = (type, category) => {
  const allowedCategories = getAllowedCategories(type);
  return allowedCategories.includes(category) ? category : allowedCategories[allowedCategories.length - 1];
};

const getUserAccount = async (userId, accountId) =>
  Account.findOne({
    _id: accountId,
    user: userId,
  });

const applyAccountDelta = async (accountId, delta) => {
  await Account.findByIdAndUpdate(accountId, {
    $inc: { balance: delta },
  });
};

const buildTransactionPayload = (body, fallbackSource = 'MANUAL') => ({
  type: body.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
  amount: Number(body.amount),
  category: validateCategory(body.type, body.category),
  date: body.date ? new Date(body.date) : new Date(),
  description: body.description?.trim() || 'Transaction',
  source: body.source || fallbackSource,
  smsRaw: body.smsRaw || '',
  importBatchId: body.importBatchId || '',
});

export const addTransaction = async (req, res) => {
  const { accountId } = req.body;
  const account = await getUserAccount(req.userId, accountId);

  if (!account) {
    return res.status(404).json({ message: 'Account not found' });
  }

  const transactionPayload = buildTransactionPayload(req.body);

  if (!transactionPayload.amount || transactionPayload.amount <= 0) {
    return res.status(400).json({ message: 'Amount must be greater than 0' });
  }

  const transaction = await Transaction.create({
    ...transactionPayload,
    user: req.userId,
    account: account._id,
  });

  await applyAccountDelta(account._id, signedAmount(transaction.type, transaction.amount));
  const populated = await transaction.populate('account', 'name type');

  return res.status(201).json({
    success: true,
    transaction: serializeTransaction(populated),
  });
};

export const getTransactions = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const filters = { user: req.userId };

  if (req.query.type) {
    filters.type = req.query.type;
  }

  if (req.query.accountId) {
    filters.account = req.query.accountId;
  }

  if (req.query.startDate || req.query.endDate) {
    filters.date = {};
    if (req.query.startDate) filters.date.$gte = new Date(req.query.startDate);
    if (req.query.endDate) filters.date.$lte = new Date(req.query.endDate);
  }

  if (req.query.search) {
    filters.$or = [
      { description: { $regex: req.query.search, $options: 'i' } },
      { category: { $regex: req.query.search, $options: 'i' } },
      { source: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  const [transactions, total] = await Promise.all([
    Transaction.find(filters)
      .populate('account', 'name type')
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Transaction.countDocuments(filters),
  ]);

  return res.json({
    success: true,
    transactions: transactions.map(serializeTransaction),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};

export const updateTransaction = async (req, res) => {
  const { id } = req.params;
  const existing = await Transaction.findOne({ _id: id, user: req.userId });

  if (!existing) {
    return res.status(404).json({ message: 'Transaction not found' });
  }

  const nextAccountId = req.body.accountId || existing.account.toString();
  const nextAccount = await getUserAccount(req.userId, nextAccountId);

  if (!nextAccount) {
    return res.status(404).json({ message: 'Account not found' });
  }

  await applyAccountDelta(existing.account, -signedAmount(existing.type, existing.amount));

  const nextPayload = buildTransactionPayload(
    {
      ...existing.toObject(),
      ...req.body,
      type: req.body.type || existing.type,
      category: req.body.category || existing.category,
      description: req.body.description || existing.description,
      amount: req.body.amount || existing.amount,
      date: req.body.date || existing.date,
      source: req.body.source || existing.source,
      smsRaw: req.body.smsRaw || existing.smsRaw,
      importBatchId: req.body.importBatchId || existing.importBatchId,
    },
    existing.source
  );

  existing.type = nextPayload.type;
  existing.amount = nextPayload.amount;
  existing.category = nextPayload.category;
  existing.date = nextPayload.date;
  existing.description = nextPayload.description;
  existing.source = nextPayload.source;
  existing.smsRaw = nextPayload.smsRaw;
  existing.importBatchId = nextPayload.importBatchId;
  existing.account = nextAccount._id;
  await existing.save();

  await applyAccountDelta(existing.account, signedAmount(existing.type, existing.amount));
  const populated = await existing.populate('account', 'name type');

  return res.json({
    success: true,
    transaction: serializeTransaction(populated),
  });
};

export const deleteTransaction = async (req, res) => {
  const { id } = req.params;
  const transaction = await Transaction.findOneAndDelete({ _id: id, user: req.userId });

  if (!transaction) {
    return res.status(404).json({ message: 'Transaction not found' });
  }

  await applyAccountDelta(transaction.account, -signedAmount(transaction.type, transaction.amount));

  return res.json({
    success: true,
    message: 'Transaction deleted successfully',
  });
};

const importParsedTransactions = async (parsedTransactions, defaultAccountId, userId) => {
  const batchId = `batch_${Date.now()}`;
  const accounts = await Account.find({ user: userId });

  if (!accounts.length) {
    throw new Error('Create at least one account before importing transactions');
  }

  const accountMap = new Map(accounts.map((account) => [account.name.toLowerCase(), account]));
  const fallbackAccount =
    accounts.find((account) => account._id.toString() === defaultAccountId) || accounts[0];

  const createdTransactions = [];

  for (const entry of parsedTransactions) {
    const matchedAccount =
      accountMap.get(entry.accountName?.toLowerCase?.()) ||
      fallbackAccount;

    const transaction = await Transaction.create({
      user: userId,
      account: matchedAccount._id,
      type: entry.type,
      amount: entry.amount,
      category: validateCategory(entry.type, entry.category),
      date: entry.date,
      description: entry.description,
      source: entry.source,
      smsRaw: entry.smsRaw || '',
      importBatchId: batchId,
    });

    await applyAccountDelta(matchedAccount._id, signedAmount(entry.type, entry.amount));
    createdTransactions.push(await transaction.populate('account', 'name type'));
  }

  return {
    batchId,
    transactions: createdTransactions.map(serializeTransaction),
  };
};

export const importTransactionsFromCsv = async (req, res) => {
  const parsed = parseCsvTransactions(req.body.csvText);
  const result = await importParsedTransactions(parsed, req.body.defaultAccountId, req.userId);

  return res.status(201).json({
    success: true,
    importedCount: result.transactions.length,
    batchId: result.batchId,
    transactions: result.transactions,
  });
};

export const importTransactionsFromSms = async (req, res) => {
  const parsed = parseSmsTransactions(req.body.smsText);
  const result = await importParsedTransactions(parsed, req.body.defaultAccountId, req.userId);

  return res.status(201).json({
    success: true,
    importedCount: result.transactions.length,
    batchId: result.batchId,
    transactions: result.transactions,
  });
};
