// backend/controllers/transactionController.js
import sql from '../config/database.js';

export const addTransaction = async (req, res) => {
  try {
    console.log('🔄 Adding transaction:', req.body);
    
    const {
      type,
      amount,
      description,
      date,
      category,
      receiptUrl,
      isRecurring = false,
      recurringInterval,
      nextRecurringDate,
      accountId
    } = req.body;
    
    const userId = req.userId;

    // Handle empty dates - convert to null
    const processedNextRecurringDate = nextRecurringDate && nextRecurringDate !== '' 
      ? nextRecurringDate 
      : null;
    
    const processedRecurringInterval = (isRecurring && recurringInterval) 
      ? recurringInterval 
      : null;

    console.log('📝 Processed transaction data:', {
      isRecurring,
      recurringInterval: processedRecurringInterval,
      nextRecurringDate: processedNextRecurringDate
    });

    // First, verify the account belongs to the user
    const accountCheck = await sql`
      SELECT id FROM accounts WHERE id = ${accountId} AND user_id = ${userId}
    `;

    if (accountCheck.length === 0) {
      return res.status(404).json({ 
        error: 'Account not found or access denied' 
      });
    }

    // Insert transaction
    const transactionResult = await sql`
      INSERT INTO transactions 
      (type, amount, description, date, category, receipt_url, is_recurring, 
       recurring_interval, next_recurring_date, user_id, account_id) 
      VALUES (
        ${type}, 
        ${parseFloat(amount)}, 
        ${description}, 
        ${date}, 
        ${category}, 
        ${receiptUrl || null}, 
        ${isRecurring}, 
        ${processedRecurringInterval}, 
        ${processedNextRecurringDate}, 
        ${userId}, 
        ${accountId}
      ) 
      RETURNING *
    `;

    // Update account balance
    if (type === 'INCOME') {
      await sql`
        UPDATE accounts 
        SET balance = balance + ${parseFloat(amount)} 
        WHERE id = ${accountId} AND user_id = ${userId}
      `;
    } else {
      await sql`
        UPDATE accounts 
        SET balance = balance - ${parseFloat(amount)} 
        WHERE id = ${accountId} AND user_id = ${userId}
      `;
    }

    // Get updated account info
    const updatedAccount = await sql`
      SELECT name, balance FROM accounts WHERE id = ${accountId}
    `;

    console.log('✅ Transaction added successfully');
    
    res.status(201).json({
      message: 'Transaction added successfully',
      transaction: transactionResult[0],
      updatedAccount: updatedAccount[0]
    });
  } catch (error) {
    console.error('❌ Error adding transaction:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to add transaction'
    });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10, type, startDate, endDate, accountId } = req.query;
    
    console.log('🔄 Fetching transactions for user:', userId, { page, limit, type, accountId });

    // Build query using tagged template literals
    let query = sql`
      SELECT 
        t.*, 
        a.name as account_name 
      FROM transactions t 
      JOIN accounts a ON t.account_id = a.id 
      WHERE t.user_id = ${userId}
    `;

    // Add filters using template literals
    if (type) {
      query = sql`${query} AND t.type = ${type}`;
    }

    if (accountId) {
      query = sql`${query} AND t.account_id = ${accountId}`;
    }

    if (startDate && endDate) {
      query = sql`${query} AND t.date >= ${startDate} AND t.date <= ${endDate}`;
    }

    // Add ordering and pagination
    query = sql`
      ${query} 
      ORDER BY t.date DESC, t.created_at DESC 
      LIMIT ${parseInt(limit)} 
      OFFSET ${(parseInt(page) - 1) * parseInt(limit)}
    `;

    const transactionsResult = await query;

    // Get total count
    let countQuery = sql`
      SELECT COUNT(*) as total_count
      FROM transactions t
      WHERE t.user_id = ${userId}
    `;

    if (type) {
      countQuery = sql`${countQuery} AND t.type = ${type}`;
    }

    if (accountId) {
      countQuery = sql`${countQuery} AND t.account_id = ${accountId}`;
    }

    if (startDate && endDate) {
      countQuery = sql`${countQuery} AND t.date >= ${startDate} AND t.date <= ${endDate}`;
    }

    const countResult = await countQuery;
    const totalCount = parseInt(countResult[0].total_count);
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    console.log(`✅ Found ${transactionsResult.length} transactions`);

    res.json({
      transactions: transactionsResult,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to fetch transactions'
    });
  }
};

export const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    console.log('🔄 Fetching transaction:', id);

    const result = await sql`
      SELECT 
        t.*, 
        a.name as account_name 
      FROM transactions t 
      JOIN accounts a ON t.account_id = a.id 
      WHERE t.id = ${id} AND t.user_id = ${userId}
    `;

    if (result.length === 0) {
      return res.status(404).json({ 
        error: 'Transaction not found or access denied' 
      });
    }

    console.log('✅ Transaction found');

    res.json({
      transaction: result[0]
    });
  } catch (error) {
    console.error('❌ Error fetching transaction:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to fetch transaction'
    });
  }
};

export const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const {
      type,
      amount,
      description,
      date,
      category,
      receiptUrl,
      isRecurring = false,
      recurringInterval,
      nextRecurringDate,
      accountId
    } = req.body;

    console.log('🔄 Updating transaction:', id, req.body);

    // Handle empty dates - convert to null
    const processedNextRecurringDate = nextRecurringDate && nextRecurringDate !== '' 
      ? nextRecurringDate 
      : null;
    
    const processedRecurringInterval = (isRecurring && recurringInterval) 
      ? recurringInterval 
      : null;

    // Get the original transaction first to calculate balance changes
    const originalTransaction = await sql`
      SELECT type, amount, account_id 
      FROM transactions 
      WHERE id = ${id} AND user_id = ${userId}
    `;

    if (originalTransaction.length === 0) {
      return res.status(404).json({ 
        error: 'Transaction not found or access denied' 
      });
    }

    const original = originalTransaction[0];

    // Revert original transaction's effect on balance
    if (original.type === 'INCOME') {
      await sql`
        UPDATE accounts 
        SET balance = balance - ${parseFloat(original.amount)} 
        WHERE id = ${original.account_id} AND user_id = ${userId}
      `;
    } else {
      await sql`
        UPDATE accounts 
        SET balance = balance + ${parseFloat(original.amount)} 
        WHERE id = ${original.account_id} AND user_id = ${userId}
      `;
    }

    // Update the transaction
    const updatedTransaction = await sql`
      UPDATE transactions 
      SET 
        type = ${type},
        amount = ${parseFloat(amount)},
        description = ${description},
        date = ${date},
        category = ${category},
        receipt_url = ${receiptUrl || null},
        is_recurring = ${isRecurring},
        recurring_interval = ${processedRecurringInterval},
        next_recurring_date = ${processedNextRecurringDate},
        account_id = ${accountId},
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;

    if (updatedTransaction.length === 0) {
      throw new Error('Transaction update failed');
    }

    // Apply new transaction's effect on balance
    if (type === 'INCOME') {
      await sql`
        UPDATE accounts 
        SET balance = balance + ${parseFloat(amount)} 
        WHERE id = ${accountId} AND user_id = ${userId}
      `;
    } else {
      await sql`
        UPDATE accounts 
        SET balance = balance - ${parseFloat(amount)} 
        WHERE id = ${accountId} AND user_id = ${userId}
      `;
    }

    console.log('✅ Transaction updated successfully');

    res.json({
      message: 'Transaction updated successfully',
      transaction: updatedTransaction[0]
    });
  } catch (error) {
    console.error('❌ Error updating transaction:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to update transaction'
    });
  }
};

export const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    console.log('🔄 Deleting transaction:', id);

    // Get the transaction first to revert balance changes
    const transaction = await sql`
      SELECT type, amount, account_id 
      FROM transactions 
      WHERE id = ${id} AND user_id = ${userId}
    `;

    if (transaction.length === 0) {
      return res.status(404).json({ 
        error: 'Transaction not found or access denied' 
      });
    }

    const { type, amount, account_id } = transaction[0];

    // Revert balance changes
    if (type === 'INCOME') {
      await sql`
        UPDATE accounts 
        SET balance = balance - ${parseFloat(amount)} 
        WHERE id = ${account_id} AND user_id = ${userId}
      `;
    } else {
      await sql`
        UPDATE accounts 
        SET balance = balance + ${parseFloat(amount)} 
        WHERE id = ${account_id} AND user_id = ${userId}
      `;
    }

    // Delete the transaction
    const deletedTransaction = await sql`
      DELETE FROM transactions 
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;

    console.log('✅ Transaction deleted successfully');

    res.json({
      message: 'Transaction deleted successfully',
      transaction: deletedTransaction[0]
    });
  } catch (error) {
    console.error('❌ Error deleting transaction:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to delete transaction'
    });
  }
};
