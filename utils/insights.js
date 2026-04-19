const monthLabel = (date) =>
  date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

const buildMonthlyTrendMap = (transactions, monthsBack = 6) => {
  const now = new Date();
  const trendMap = new Map();

  for (let offset = monthsBack - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const label = monthLabel(date);
    trendMap.set(label, {
      month: label,
      income: 0,
      expense: 0,
    });
  }

  transactions.forEach((transaction) => {
    const label = monthLabel(new Date(transaction.date));
    if (!trendMap.has(label)) {
      return;
    }

    const current = trendMap.get(label);
    if (transaction.type === 'INCOME') {
      current.income += transaction.amount;
    } else {
      current.expense += transaction.amount;
    }
  });

  return Array.from(trendMap.values());
};

const sumTransactions = (transactions, type) =>
  transactions
    .filter((transaction) => transaction.type === type)
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

const calculateTaxBySlabs = (income, slabs) => {
  let remaining = income;
  let previousLimit = 0;
  let totalTax = 0;

  for (const slab of slabs) {
    if (remaining <= 0) break;

    const slabUpperBound = slab.upto ?? Number.POSITIVE_INFINITY;
    const taxablePortion = Math.min(remaining, slabUpperBound - previousLimit);

    if (taxablePortion > 0) {
      totalTax += taxablePortion * slab.rate;
      remaining -= taxablePortion;
    }

    previousLimit = slabUpperBound;
  }

  return totalTax;
};

const applyCess = (tax) => tax * 1.04;

export const createTaxSummary = (annualIncome, annualInvestmentAmount) => {
  const deductibleInvestments = Math.min(annualInvestmentAmount, 150000);
  const taxableOldRegime = Math.max(annualIncome - 50000 - deductibleInvestments, 0);
  const taxableNewRegime = Math.max(annualIncome - 75000, 0);

  const oldRegimeTax = taxableOldRegime <= 500000
    ? 0
    : applyCess(
      calculateTaxBySlabs(taxableOldRegime, [
        { upto: 250000, rate: 0 },
        { upto: 500000, rate: 0.05 },
        { upto: 1000000, rate: 0.2 },
        { rate: 0.3 },
      ])
    );

  const newRegimeTax = taxableNewRegime <= 1200000
    ? 0
    : applyCess(
      calculateTaxBySlabs(taxableNewRegime, [
        { upto: 400000, rate: 0 },
        { upto: 800000, rate: 0.05 },
        { upto: 1200000, rate: 0.1 },
        { upto: 1600000, rate: 0.15 },
        { upto: 2000000, rate: 0.2 },
        { upto: 2400000, rate: 0.25 },
        { rate: 0.3 },
      ])
    );

  const betterRegime = oldRegimeTax < newRegimeTax ? 'OLD' : 'NEW';

  return {
    annualIncome,
    annualInvestmentAmount,
    deductibleInvestments,
    taxableIncomeOldRegime: taxableOldRegime,
    taxableIncomeNewRegime: taxableNewRegime,
    estimatedOldRegimeTax: Number(oldRegimeTax.toFixed(2)),
    estimatedNewRegimeTax: Number(newRegimeTax.toFixed(2)),
    suggestedMonthlyTaxReserve: Number((Math.min(oldRegimeTax, newRegimeTax) / 12).toFixed(2)),
    betterRegime,
    assumptions: [
      'India FY 2025-26 slab-based estimate',
      'Standard deduction assumed for salaried income',
      'Investment deduction capped at Rs 1.5 lakh under old regime estimate',
    ],
  };
};

export const createInvestmentInsights = ({ annualIncome, annualExpense, totalBalance, investmentBalance }) => {
  const monthlyIncome = annualIncome / 12;
  const monthlyExpense = annualExpense / 12;
  const monthlySurplus = monthlyIncome - monthlyExpense;
  const savingsRate = annualIncome > 0 ? ((annualIncome - annualExpense) / annualIncome) * 100 : 0;
  const emergencyFundTarget = monthlyExpense * 6;
  const emergencyFundGap = Math.max(emergencyFundTarget - Math.max(totalBalance - investmentBalance, 0), 0);
  const investableAmount = Math.max(monthlySurplus, 0);

  let profile = 'Capital preservation';
  let allocation = {
    emergencyFund: 60,
    indexFunds: 25,
    debtFunds: 10,
    thematic: 5,
  };

  const recommendedStocks = [
    { symbol: 'RELIANCE', name: 'Reliance Industries', category: 'Energy/Retail', rationale: 'Market leader with diversified cash flows.' },
    { symbol: 'HDFCBANK', name: 'HDFC Bank', category: 'Finance', rationale: 'Top private bank with strong asset quality.' },
    { symbol: 'TCS', name: 'Tata Consultancy Services', category: 'IT', rationale: 'Resilient margins and high dividend yield.' },
    { symbol: 'ICICIBANK', name: 'ICICI Bank', category: 'Finance', rationale: 'Strong retail growth and digital leadership.' },
    { symbol: 'BHARTIARTL', name: 'Bharti Airtel', category: 'Telecom', rationale: 'Expanding ARPU and 5G leadership.' },
  ];

  const recommendedSips = [
    { name: 'Nifty 50 Index Fund', type: 'Large Cap', risk: 'Moderate' },
    { name: 'Nifty Next 50', type: 'Large/Mid', risk: 'High' },
    { name: 'Direct Equity SIP', type: 'Stocks', risk: 'Very High' },
  ];

  if (savingsRate >= 30) {
    profile = 'Growth';
    allocation = {
      emergencyFund: 20,
      indexFunds: 45,
      debtFunds: 20,
      thematic: 15,
    };
  } else if (savingsRate >= 15) {
    profile = 'Balanced';
    allocation = {
      emergencyFund: 30,
      indexFunds: 40,
      debtFunds: 20,
      thematic: 10,
    };
  }

  return {
    profile,
    annualIncome,
    annualExpense,
    monthlySurplus: Number(monthlySurplus.toFixed(2)),
    savingsRate: Number(Math.max(savingsRate, 0).toFixed(1)),
    emergencyFundTarget: Number(emergencyFundTarget.toFixed(2)),
    emergencyFundGap: Number(emergencyFundGap.toFixed(2)),
    currentInvestmentBalance: Number(investmentBalance.toFixed(2)),
    suggestedMonthlyInvestment: Number(investableAmount.toFixed(2)),
    allocation,
    topRecommendedStocks: recommendedStocks.slice(0, profile === 'Growth' ? 5 : 3),
    bestSips: recommendedSips.slice(0, profile === 'Capital preservation' ? 1 : 3),
  };
};

export const buildDashboardInsights = ({ accounts, transactions }) => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastTwelveMonthsStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const currentMonthTransactions = transactions.filter(
    (transaction) => new Date(transaction.date) >= currentMonthStart
  );
  const annualTransactions = transactions.filter(
    (transaction) => new Date(transaction.date) >= lastTwelveMonthsStart
  );

  const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const investmentBalance = accounts
    .filter((account) => account.type === 'INVESTMENT')
    .reduce((sum, account) => sum + Number(account.balance || 0), 0);

  const totalIncome = sumTransactions(currentMonthTransactions, 'INCOME');
  const totalExpenses = sumTransactions(currentMonthTransactions, 'EXPENSE');
  const annualIncome = sumTransactions(annualTransactions, 'INCOME');
  const annualExpense = sumTransactions(annualTransactions, 'EXPENSE');
  const annualInvestmentAmount = annualTransactions
    .filter((transaction) => transaction.category === 'Investment')
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

  const categoryMap = new Map();
  const sourceBreakdown = new Map();
  const merchantMap = new Map();

  currentMonthTransactions.forEach((transaction) => {
    if (transaction.type === 'EXPENSE') {
      categoryMap.set(transaction.category, (categoryMap.get(transaction.category) || 0) + transaction.amount);
      merchantMap.set(transaction.description, (merchantMap.get(transaction.description) || 0) + transaction.amount);
    }

    sourceBreakdown.set(transaction.source, (sourceBreakdown.get(transaction.source) || 0) + 1);
  });

  return {
    summary: {
      totalBalance,
      totalIncome,
      totalExpenses,
      netSavings: totalIncome - totalExpenses,
      accountCount: accounts.length,
      transactionCount: transactions.length,
      automationRate: currentMonthTransactions.length
        ? Math.round((((sourceBreakdown.get('SMS') || 0) + (sourceBreakdown.get('CSV') || 0)) / currentMonthTransactions.length) * 100)
        : 0,
    },
    monthlyTrends: buildMonthlyTrendMap(annualTransactions, 6),
    categoryExpenses: Array.from(categoryMap.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((left, right) => right.total - left.total),
    sourceBreakdown: Array.from(sourceBreakdown.entries()).map(([source, count]) => ({ source, count })),
    topMerchants: Array.from(merchantMap.entries())
      .map(([merchant, total]) => ({ merchant, total }))
      .sort((left, right) => right.total - left.total)
      .slice(0, 5),
    taxSummary: createTaxSummary(annualIncome, annualInvestmentAmount),
    investmentInsights: createInvestmentInsights({
      annualIncome,
      annualExpense,
      totalBalance,
      investmentBalance,
    }),
  };
};
