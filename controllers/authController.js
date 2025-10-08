// backend/controllers/authController.js
import sql from '../config/database.js';
import { hashPassword, comparePassword, generateToken } from '../config/auth.js';

export const register = async (req, res) => {
  try {
    console.log('📨 Register request received - Full request:', {
      body: req.body,
      headers: req.headers,
      method: req.method,
      url: req.url
    });

    // Check if request body exists and has the expected properties
    if (!req.body || typeof req.body !== 'object') {
      console.log('❌ Request body is missing or invalid');
      return res.status(400).json({ error: 'Request body is required and must be JSON' });
    }

    const { email, password, name } = req.body;
    
    console.log('🔍 Extracted fields:', { email, password: password ? '***' : 'missing', name });
    
    // Check if fields exist (not just truthy, but actually present)
    if (email === undefined || password === undefined || name === undefined) {
      return res.status(400).json({ 
        error: 'All fields are required: email, password, name',
        received: { email: email !== undefined, password: password !== undefined, name: name !== undefined }
      });
    }

    // Check if fields are not empty
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'All fields must not be empty',
        received: { email: !!email, password: !!password, name: !!name }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    console.log('🔍 Checking if user exists in database:', email);
    
    // Check if user exists - USING NEON SQL
    const existingUsers = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;
    
    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    console.log('🔐 Hashing password...');
    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    
    console.log('👤 Creating user in database...');
    // Create user - USING NEON SQL
    const newUser = await sql`
      INSERT INTO users (email, password, name) 
      VALUES (${email}, ${hashedPassword}, ${name}) 
      RETURNING id, email, name
    `;
    
    const token = generateToken(newUser[0].id);
    
    console.log('✅ User created successfully:', newUser[0].email);
    
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: newUser[0].id,
        email: newUser[0].email,
        name: newUser[0].name
      }
    });
  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const login = async (req, res) => {
  try {
    console.log('📨 Login request received:', {
      email: req.body?.email,
      headers: req.headers
    });

    // Check if request body exists
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Request body is required and must be JSON' });
    }

    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    console.log('🔍 Finding user:', email);
    
    // USING NEON SQL
    const users = await sql`
      SELECT * FROM users WHERE email = ${email}
    `;
    
    if (!users || users.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const user = users[0];
    console.log('🔐 Comparing passwords...');
    const isMatch = await comparePassword(password, user.password);
    
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const token = generateToken(user.id);
    
    console.log('✅ Login successful:', user.email);
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};