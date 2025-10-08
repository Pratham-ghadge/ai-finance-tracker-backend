// backend/controllers/dashboardController.js
import sql from '../config/database.js';

export const getDashboardData = async (req, res) => {
  console.log('🔍 Dashboard endpoint called');
  console.log('👤 User ID from auth:', req.userId);
  
  try {
    const userId = req.userId;
    
    if (!userId) {
      console.log('❌ No user ID found in request');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log('✅ User authenticated, ID:', userId);

    // Test database connection first
    console.log('🔄 Testing database connection...');
    try {
      const testResult = await sql`SELECT NOW() as current_time`;
      console.log('✅ Database connection OK:', testResult[0].current_time);
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError);
      return res.status(500).json({ 
        error: 'Database connection failed',
        details: dbError.message 
      });
    }

    // 1. Get account balances
    console.log('🔄 Fetching accounts...');
    let accountsResult;
    try {
      accountsResult = await sql`
        SELECT id, name, type, balance, is_default 
        FROM accounts 
        WHERE user_id = ${userId} 
        ORDER BY created_at DESC
      `;
      console.log(`📊 Found ${accountsResult.length} accounts`);
    } catch (error) {
      console.error('❌ Error fetching accounts:', error);
      // If accounts table doesn't exist, return empty array
      accountsResult = [];
    }

    // 2. Get current month stats
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    console.log('🔄 Fetching monthly stats...');
    let monthlyStats;
    try {
      monthlyStats = await sql`
        SELECT 
          type,
          COALESCE(SUM(amount), 0) as total,
          COUNT(*) as count
        FROM transactions 
        WHERE user_id = ${userId} AND date >= ${firstDayOfMonth}
        GROUP BY type
      `;
      console.log('💰 Monthly stats:', monthlyStats);
    } catch (error) {
      console.error('❌ Error fetching monthly stats:', error);
      monthlyStats = [];
    }

    // 3. Get category stats
    console.log('🔄 Fetching category stats...');
    let categoryStats;
    try {
      categoryStats = await sql`
        SELECT 
          category,
          COALESCE(SUM(amount), 0) as total
        FROM transactions 
        WHERE user_id = ${userId} AND type = 'EXPENSE' 
          AND date >= ${firstDayOfMonth}
        GROUP BY category
        ORDER BY total DESC
      `;
      console.log('📈 Category stats:', categoryStats);
    } catch (error) {
      console.error('❌ Error fetching category stats:', error);
      categoryStats = [];
    }

    // 4. Get monthly trends for last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    console.log('🔄 Fetching monthly trends...');
    let monthlyTrends;
    try {
      monthlyTrends = await sql`
        SELECT 
          TO_CHAR(date, 'YYYY-MM') as month,
          type,
          COALESCE(SUM(amount), 0) as total
        FROM transactions 
        WHERE user_id = ${userId} AND date >= ${sixMonthsAgo}
        GROUP BY TO_CHAR(date, 'YYYY-MM'), type
        ORDER BY month ASC
      `;
      console.log('📅 Monthly trends found:', monthlyTrends.length);
    } catch (error) {
      console.error('❌ Error fetching monthly trends:', error);
      monthlyTrends = [];
    }

    // Calculate total balance safely
    const totalBalance = accountsResult.reduce((sum, account) => {
      return sum + parseFloat(account.balance || 0);
    }, 0);

    const dashboardData = {
      accounts: accountsResult.map(account => ({
        ...account,
        balance: parseFloat(account.balance || 0)
      })),
      monthlyStats: monthlyStats.map(stat => ({
        ...stat,
        total: parseFloat(stat.total || 0)
      })),
      categoryStats: categoryStats.map(stat => ({
        ...stat,
        total: parseFloat(stat.total || 0)
      })),
      monthlyTrends: monthlyTrends.map(trend => ({
        ...trend,
        total: parseFloat(trend.total || 0)
      })),
      totalBalance: totalBalance
    };

    console.log('✅ Dashboard data prepared successfully');
    console.log('📦 Response summary:', {
      accounts: dashboardData.accounts.length,
      monthlyStats: dashboardData.monthlyStats.length,
      categoryStats: dashboardData.categoryStats.length,
      monthlyTrends: dashboardData.monthlyTrends.length,
      totalBalance: dashboardData.totalBalance
    });

    res.json(dashboardData);

  } catch (error) {
    console.error('❌ DASHBOARD CONTROLLER ERROR:', error);
    console.error('❌ Error stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      details: 'Check server logs for more information'
    });
  }
};

export const getDashboardTest = async (req, res) => {
  try {
    console.log('🧪 Dashboard test endpoint called');
    console.log('👤 User ID:', req.userId);

    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Test database connection
    const dbTest = await sql`SELECT NOW() as current_time, version() as version`;
    
    // Get user info
    const userResult = await sql`
      SELECT id, email, name 
      FROM users 
      WHERE id = ${req.userId}
    `;

    if (userResult.length === 0) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    res.json({
      success: true,
      user: userResult[0],
      database: {
        connected: true,
        timestamp: dbTest[0].current_time,
        version: dbTest[0].version
      },
      message: 'Dashboard test successful - authentication and database working'
    });

  } catch (error) {
    console.error('❌ Dashboard test error:', error);
    res.status(500).json({
      error: 'Test failed',
      message: error.message,
      details: 'Database or query issue'
    });
  }
};