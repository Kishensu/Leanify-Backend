const bcrypt = require('bcryptjs');

const plainPassword = 'believe'; 
bcrypt.hash(plainPassword, 10, function(err, hash) {
  if (err) throw err;
  console.log(hash); 
});