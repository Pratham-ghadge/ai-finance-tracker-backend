// backend/middleware/validation.js
export const validateTransaction = (req, res, next) => {
  const { type, amount, date, category, accountId } = req.body;
  
  if (!type || !amount || !date || !category || !accountId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  if (amount <= 0) {
    return res.status(400).json({ error: 'Amount must be positive' });
  }
  
  next();
};