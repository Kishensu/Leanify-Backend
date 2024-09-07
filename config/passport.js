const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const db = require('../db'); 
const dotenv = require('dotenv');

dotenv.config();

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

module.exports = (passport) => {
  passport.use(
    new JwtStrategy(opts, async (jwt_payload, done) => {
      try {
        
        const user = await db('users').where({ id: jwt_payload.id }).first();
        if (user) {
          return done(null, user); 
        } else {
          return done(null, false); 
        }
      } catch (error) {
        return done(error, false); 
      }
    })
  );
};