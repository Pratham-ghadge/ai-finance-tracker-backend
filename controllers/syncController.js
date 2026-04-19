import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import { expenseCategories } from '../utils/constants.js';

// Mock Bank API Responses
const MOCK_MERCHANTS = [
    { name: 'Amazon India', category: 'Shopping' },
    { name: 'Swiggy', category: 'Food' },
    { name: 'Zomato', category: 'Food' },
    { name: 'Uber India', category: 'Travel' },
    { name: 'Reliance Digital', category: 'Shopping' },
    { name: 'Airtel Postpaid', category: 'Bills' },
    { name: 'Tata Power', category: 'Bills' },
    { name: 'Starbucks', category: 'Food' },
    { name: 'Netflix', category: 'Entertainment' },
];

export const fetchSimulatedTransactions = async (req, res) => {
    try {
        const { userId } = req;

        // Find a primary account for the user
        const account = await Account.findOne({ user: userId });

        if (!account) {
            return res.status(404).json({ message: 'No account found to sync with.' });
        }

        // Simulate "Fetching" logic
        // In a real app, this would call Plaid/Salt Edge APIs
        const numToFetch = Math.floor(Math.random() * 3) + 1; // 1-3 new transactions
        const newTransactions = [];

        for (let i = 0; i < numToFetch; i++) {
            const merchant = MOCK_MERCHANTS[Math.floor(Math.random() * MOCK_MERCHANTS.length)];
            const amount = Math.floor(Math.random() * 2000) + 50;

            const transaction = await Transaction.create({
                user: userId,
                account: account._id,
                amount,
                type: 'EXPENSE',
                category: merchant.category,
                description: `Auto-Sync: ${merchant.name}`,
                date: new Date(),
                source: 'BANK_SYNC_AUTO',
            });

            // Update account balance
            await Account.findByIdAndUpdate(account._id, { $inc: { balance: -amount } });
            newTransactions.push(transaction);
        }

        return res.json({
            success: true,
            message: `Successfully synced ${newTransactions.length} new transactions.`,
            transactions: newTransactions
        });
    } catch (error) {
        console.error('Sync Error:', error);
        return res.status(500).json({ message: 'Sync engine failed.' });
    }
};
