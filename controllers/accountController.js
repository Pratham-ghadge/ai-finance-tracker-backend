// backend/controllers/accountController.js
import sql from '../config/database.js';

export const createAccount = async (req, res) => {
  try {
    const { name, type, initialBalance = 0 } = req.body;
    const userId = req.userId;

    console.log('🔄 Creating account:', { name, type, initialBalance, userId });

    const result = await sql`
      INSERT INTO accounts (name, type, balance, user_id) 
      VALUES (${name}, ${type}, ${initialBalance}, ${userId}) 
      RETURNING *
    `;

    console.log('✅ Account created successfully:', result[0]);

    res.status(201).json({
      message: 'Account created successfully',
      account: result[0]
    });
  } catch (error) {
    console.error('❌ Error creating account:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to create account'
    });
  }
};

export const getAccounts = async (req, res) => {
  try {
    const userId = req.userId;
    
    console.log('🔄 Fetching accounts for user:', userId);

    const result = await sql`
      SELECT * FROM accounts 
      WHERE user_id = ${userId} 
      ORDER BY created_at DESC
    `;

    console.log(`✅ Found ${result.length} accounts for user ${userId}`);

    res.json({ 
      accounts: result,
      count: result.length 
    });
  } catch (error) {
    console.error('❌ Error fetching accounts:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to fetch accounts'
    });
  }
};

export const updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, balance } = req.body;
    const userId = req.userId;

    console.log('🔄 Updating account:', { id, name, type, balance, userId });

    const result = await sql`
      UPDATE accounts 
      SET name = ${name}, type = ${type}, balance = ${balance}, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;

    if (result.length === 0) {
      return res.status(404).json({ 
        error: 'Account not found or access denied' 
      });
    }

    console.log('✅ Account updated successfully:', result[0]);

    res.json({
      message: 'Account updated successfully',
      account: result[0]
    });
  } catch (error) {
    console.error('❌ Error updating account:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to update account'
    });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    console.log('🔄 Deleting account:', { id, userId });

    const result = await sql`
      DELETE FROM accounts 
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;

    if (result.length === 0) {
      return res.status(404).json({ 
        error: 'Account not found or access denied' 
      });
    }

    console.log('✅ Account deleted successfully:', result[0]);

    res.json({
      message: 'Account deleted successfully',
      account: result[0]
    });
  } catch (error) {
    console.error('❌ Error deleting account:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to delete account'
    });
  }
};