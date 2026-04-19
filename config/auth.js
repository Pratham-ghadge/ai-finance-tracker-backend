import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const hashPassword = (password) => bcrypt.hash(password, 12);
export const comparePassword = (password, hash) => bcrypt.compare(password, hash);

export const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

export const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);
