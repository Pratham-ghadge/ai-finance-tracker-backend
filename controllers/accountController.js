import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import { accountTypes } from '../utils/constants.js';
import { serializeAccount } from '../utils/serializers.js';

export const createAccount = async (req, res) => {
  const { name, type = 'BANK', initialBalance = 0 } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Account name is required' });
  }

  if (!accountTypes.includes(type)) {
    return res.status(400).json({ message: 'Invalid account type' });
  }

  const account = await Account.create({
    user: req.userId,
    name: name.trim(),
    type,
    balance: Number(initialBalance) || 0,
  });

  return res.status(201).json({
    success: true,
    account: serializeAccount(account),
  });
};

export const getAccounts = async (req, res) => {
  const accounts = await Account.find({ user: req.userId }).sort({ createdAt: -1 });

  return res.json({
    success: true,
    accounts: accounts.map(serializeAccount),
  });
};

export const updateAccount = async (req, res) => {
  const { id } = req.params;
  const { name, type, balance } = req.body;

  const account = await Account.findOne({ _id: id, user: req.userId });
  if (!account) {
    return res.status(404).json({ message: 'Account not found' });
  }

  if (type && !accountTypes.includes(type)) {
    return res.status(400).json({ message: 'Invalid account type' });
  }

  if (typeof name === 'string' && name.trim()) {
    account.name = name.trim();
  }

  if (type) {
    account.type = type;
  }

  if (balance !== undefined && balance !== null && balance !== '') {
    account.balance = Number(balance) || 0;
  }

  await account.save();

  return res.json({
    success: true,
    account: serializeAccount(account),
  });
};

export const deleteAccount = async (req, res) => {
  const { id } = req.params;

  const linkedTransactions = await Transaction.countDocuments({ account: id, user: req.userId });
  if (linkedTransactions > 0) {
    return res.status(400).json({
      message: 'Delete linked transactions first or move them to another account',
    });
  }

  const account = await Account.findOneAndDelete({ _id: id, user: req.userId });
  if (!account) {
    return res.status(404).json({ message: 'Account not found' });
  }

  return res.json({
    success: true,
    message: 'Account deleted successfully',
  });
};
