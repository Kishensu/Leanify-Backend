const db = require('../db'); 

exports.getUserData = async (req, res) => {
  try {
    const userId = req.user.id; 
    const teamId = req.user.team_id;

   
    const teamMembers = await db('users')
      .where({ team_id: teamId })
      .select('id', 'username', 'email', 'role'); 

    
    const discussions = await db('discussions')
      .join('users', 'discussions.user_id', 'users.id')
      .where({ 'discussions.team_id': teamId })
      .select('discussions.*', 'users.username as userName', 'users.role as userRole'); 

    const tasks = await db('tasks')
      .where({ user_id: userId })
      .select('id', 'title', 'description', 'status');

  
    const documents = await db('documents')
      .where({ team_id: teamId })
      .select('id', 'name', 'url');

    
    res.json({ teamMembers, discussions, tasks, documents });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve data' });
  }
};