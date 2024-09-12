const express = require('express');
const authRoutes = require('./routes/authRoutes');
const homeRoutes = require('./routes/homeRoutes');
const bodyParser = require('body-parser');
const cors = require('cors');
const passport = require('passport');
const mysql = require('mysql2/promise');
require('dotenv').config();


const {
    createThread,
    addMessage,
    runAssistant,
    checkingStatus,
} = require('./openaiApi'); 

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
  try {
      const { query } = req.body;
      
     
      const thread = await createThread();

      
      await addMessage(thread.id, query);

      
      const run = await runAssistant(thread.id);

      
      const pollingInterval = setInterval(() => {
          checkingStatus(res, thread.id, run.id, pollingInterval); 
      }, 5000);
      
  } catch (error) {
      console.error('Error handling assistant interaction:', error);
      res.status(500).json({ error: 'Failed to process query' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});