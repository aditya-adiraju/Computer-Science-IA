const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')
let mysql = require('mysql')
const config = require('./config.json')

let connection = mysql.createConnection(config);



function initialize(passport, getUserByEmail) {
  const authenticateUser = async (email, password, done) => {
    const user = getUserByEmail(email)
    if (user == null) {
      return done(null, false, { message: 'An account with this email does not exist' })
    }
    try {
      if (await bcrypt.compare(password, user.password)) {
        return done(null, user)
      } else {
        return done(null, false, { message: 'The password you entered is incorrect.' })
      }
    } catch (e) {
      return done(e)
    }
  }


  passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser))
   passport.serializeUser((user, done) => done(null, user))
   passport.deserializeUser((user, done) => {
     let sql = "SELECT * FROM accounts WHERE id =" + user.id
     connection.query(sql, (error, results, fields) => {
       if (error) {
         return console.error(error.message)
       }
       done(error, results)
     })
   })
}

module.exports = initialize