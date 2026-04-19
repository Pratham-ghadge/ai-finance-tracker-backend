import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import { serializeAccount, serializeTransaction } from '../utils/serializers.js';
import { buildDashboardInsights } from '../utils/insights.js';

export const getDashboardData = async (req, res) => {
  const accounts = await Account.find({ user: req.userId }).sort({ createdAt: -1 });
  const recentTransactions = await Transaction.find({ user: req.userId })
    .populate('account', 'name type')
    .sort({ date: -1, createdAt: -1 })
    .limit(8);

  const analysisStart = new Date();
  analysisStart.setMonth(analysisStart.getMonth() - 11);
  analysisStart.setDate(1);

  const monthlyTransactions = await Transaction.find({
    user: req.userId,
    date: { $gte: analysisStart },
  }).sort({ date: 1 });
  const insights = buildDashboardInsights({
    accounts,
    transactions: monthlyTransactions,
  });

  res.json({
    success: true,
    summary: insights.summary,
    accounts: accounts.map(serializeAccount),
    recentTransactions: recentTransactions.map(serializeTransaction),
    monthlyTrends: insights.monthlyTrends,
    categoryExpenses: insights.categoryExpenses,
    sourceBreakdown: insights.sourceBreakdown,
    topMerchants: insights.topMerchants,
    taxSummary: insights.taxSummary,
    investmentInsights: insights.investmentInsights,
    sync: {
      directPhoneInboxAccess: false,
      status: 'Browser apps cannot read SMS inbox directly without native mobile permissions.',
      supportedImports: ['CSV', 'SMS paste', 'sample sync'],
    },
  });
};
