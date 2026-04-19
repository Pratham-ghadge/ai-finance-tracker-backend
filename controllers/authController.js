import User from '../models/User.js';
import { comparePassword, generateToken, hashPassword } from '../config/auth.js';
import { serializeUser } from '../utils/serializers.js';

export const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
  if (existingUser) {
    return res.status(400).json({ message: 'User already exists with this email' });
  }

  const user = await User.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: await hashPassword(password),
  });

  return res.status(201).json({
    success: true,
    token: generateToken(user._id.toString()),
    user: serializeUser(user),
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isValidPassword = await comparePassword(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  return res.json({
    success: true,
    token: generateToken(user._id.toString()),
    user: serializeUser(user),
  });
};

export const getProfile = async (req, res) => {
  res.json({
    success: true,
    user: serializeUser(req.user),
  });
};

export const updateProfile = async (req, res) => {
  const { name, familyDetails } = req.body;

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(4404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (familyDetails) {
      user.familyDetails = {
        ...user.familyDetails,
        ...familyDetails,
      };
    }

    await user.save();

    res.json({
      success: true,
      user: serializeUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile' });
  }
};
