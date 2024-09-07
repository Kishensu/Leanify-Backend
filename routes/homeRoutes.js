const express = require('express');
const { getUserData } = require('../controllers/homeController');
const passport = require('passport');

const router = express.Router();


router.get('/', passport.authenticate('jwt', { session: false }), getUserData);

module.exports = router;