import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import { buildDashboardInsights } from '../utils/insights.js';

export const getInvestmentSuggestions = async (req, res) => {
  const [accounts, transactions] = await Promise.all([
    Account.find({ user: req.userId }).sort({ createdAt: -1 }),
    Transaction.find({ user: req.userId }).sort({ date: -1 }),
  ]);

  const insights = buildDashboardInsights({ accounts, transactions });
  const { investmentInsights, taxSummary } = insights;

  res.json({
    success: true,
    suggestions: {
      profile: investmentInsights.profile,
      monthlySurplus: investmentInsights.monthlySurplus,
      suggestedMonthlyInvestment: investmentInsights.suggestedMonthlyInvestment,
      emergencyFundTarget: investmentInsights.emergencyFundTarget,
      emergencyFundGap: investmentInsights.emergencyFundGap,
      taxEfficientCapacity: Math.max(150000 - taxSummary.deductibleInvestments, 0),
      bestStocks: investmentInsights.topRecommendedStocks,
      bestSips: investmentInsights.bestSips,
      allocations: [
        {
          name: 'Emergency reserve',
          percentage: investmentInsights.allocation.emergencyFund,
          description: 'Keep this in a liquid fund or high-yield savings buffer before increasing risk exposure.',
        },
        {
          name: 'Index funds',
          percentage: investmentInsights.allocation.indexFunds,
          description: 'Use broad-market index exposure for the core long-term allocation.',
        },
        {
          name: 'Debt funds',
          percentage: investmentInsights.allocation.debtFunds,
          description: 'Use lower-volatility debt exposure for stability and upcoming goals.',
        },
        {
          name: 'Satellite bets',
          percentage: investmentInsights.allocation.thematic,
          description: 'Keep high-conviction sector or thematic allocations capped and deliberate.',
        },
      ],
      actionPlan: [
        `Reserve around Rs ${investmentInsights.suggestedMonthlyInvestment.toFixed(0)} per month for investing based on recent cash flow.`,
        investmentInsights.emergencyFundGap > 0
          ? `Close the emergency fund gap of Rs ${investmentInsights.emergencyFundGap.toFixed(0)} before taking more equity risk.`
          : 'Emergency fund target is in range, so you can increase long-term allocations.',
        `You still have roughly Rs ${Math.max(150000 - taxSummary.deductibleInvestments, 0).toFixed(0)} of old-regime Section 80C-style deduction room in this estimate.`,
      ],
      disclaimer:
        'These are rule-based educational suggestions generated from your tracked income, expense, and account mix. They are not live market or regulated advisory recommendations.',
    },
  });
};
