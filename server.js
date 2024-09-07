const express = require('express');
const authRoutes = require('./routes/authRoutes');
const homeRoutes = require('./routes/homeRoutes');
const bodyParser = require('body-parser');
const cors = require('cors');
const passport = require('passport');
const mysql = require('mysql2/promise'); 
const axios = require('axios'); 
require('dotenv').config(); 

require('./config/passport')(passport);

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(bodyParser.json());
app.use(passport.initialize());

app.use('/api/auth', authRoutes);
app.use('/api/home', passport.authenticate('jwt', { session: false }), homeRoutes); 


const HOST = process.env.SINGLESTORE_HOST;  
const USER = process.env.SINGLESTORE_USER;      
const PASSWORD = process.env.SINGLESTORE_PASSWORD; 
const DATABASE = process.env.SINGLESTORE_DATABASE; 

let pool;

async function initializeDatabase() {
  try {
    pool = mysql.createPool({
      host: HOST,
      user: USER,
      password: PASSWORD,
      database: DATABASE,
    });
    console.log("Connected to SingleStore database.");
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
}

initializeDatabase();

app.post('/api/processes', async (req, res) => {
  const { description, steps, kpis, cycleTime, owners, embeddings } = req.body;
  try {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        'INSERT INTO processes (description, steps, kpis, cycle_time, owners, embeddings) VALUES (?, ?, ?, ?, ?, ?)',
        [description, JSON.stringify(steps), JSON.stringify(kpis), cycleTime, owners, JSON.stringify(embeddings)]
      );
      res.status(200).send('Process saved successfully');
    } catch (error) {
      console.error('Error saving process:', error);
      res.status(500).send('Error saving process');
    } finally {
      connection.release(); 
    }
  } catch (error) {
    console.error('Error connecting to database:', error);
    res.status(500).send('Error connecting to database');
  }
});

app.post('/api/chat', async (req, res) => {
  const { query } = req.body;

  try {
    
    const embeddingResponse = await axios.post(
      'https://api.openai.com/v1/embeddings',
      { model: 'text-embedding-ada-002', input: query },
      { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } } 
    );

    const queryEmbedding = embeddingResponse.data.data[0].embedding;


    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT description, embeddings FROM processes');
    connection.release();

    
    const closestProcess = rows[0].description; 


    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a process expert AI.' },
          { role: 'user', content: `Context: ${closestProcess}\n\nUser Query: ${query}` }
        ]
      },
      { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } } 
    );

    const aiResponse = response.data.choices[0].message.content;
    res.json({ reply: aiResponse });
  } catch (error) {
    console.error('Error processing chat request:', error);
    res.status(500).send('Error processing chat request');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});