import User from '../models/User.js';
import { verifyToken } from '../config/auth.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Authentication token is required' });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'User session is invalid' });
    }

    req.user = user;
    req.userId = user._id;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Authentication failed' });
  }
};
