const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db'); 


const register = async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

   
    await db('users').insert({
      username,
      email,
      password: hashedPassword,
    });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
};


const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    
    const user = await db('users').where({ email }).first();

    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    
    const token = jwt.sign({ id: user.id, team_id: user.team_id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

module.exports = {
  register,
  login,
};