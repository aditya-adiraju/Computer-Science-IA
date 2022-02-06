//Including classes

const Delegate = require('./delegate.js')
const Advisor = require('./advisor.js')
const Delegation = require('./delegation.js')
const config = require('./config.json')


//Including External libraries
const express = require('express') //Build web app, handle and funnel requests
const flash = require('express-flash') 
const session = require('express-session')
const bcrypt = require('bcrypt') //password hashing
const passport = require('passport') //Session Authentication
const methodOverride = require('method-override')
const bodyParser = require('body-parser');

let mysql = require('mysql') //connecting to MYSQL database
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config() //Creates environment variables
}
const app = express()
var path = require('path');


/*
Object Serialization/Deserialization
Password Authentication
Classes and Object Oriented Structure
User defined Methods
Error Handling and Validation Techniques
*/

//creating a connection to MySQL Database
let connection = mysql.createConnection(config);

// Extracting data from the database to the 'users' array
let sql = 'SELECT * FROM accounts'
const users = []
connection.query(sql, (error, results, fields) => {
  if (error) {
    // Displays the error (if any) on the console
    return console.error(error.message)
  }

  for (var i = 0; i < results.length; i++) {
    users.push({
      id: results[i].ID,
      salutation: results[i].Salutation,
      name: results[i].Name,
      sex: results[i].Sex,
      school: results[i].School,
      nationality: results[i].Nationality,
      email: results[i].Email,
      password: results[i].Password.toString()
    })
  }
});


//Initializing Passport settings 
const initializePassport = require('./passport-config')
const { name } = require('ejs')
initializePassport(
  passport,
  email => users.find(user => user.email === email),
  id => users.find(user => user.id === id)
)


//Configuring application to run ejs files
app.set('view-engine', 'ejs')
app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({
  secret: 'process.env.SESSION_SECRET',
  resave: false,
  saveUninitialized: false
}))

app.use(passport.initialize());
app.use(passport.session());



app.use(methodOverride('_method'))
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended : false }));

//Checks whether the user is authenticated and directs to login page if they are not authenticatec
app.get('/', checkAuthenticated, (req, res, next) => {
  res.locals.user = req.session.passport.user;
  res.render('index.ejs', {
    salutation: req.session.passport.user.salutation,
    name: req.session.passport.user.name,
    id: req.session.passport.user.id,
    nationality: req.session.passport.user.nationality,
    sex: req.session.passport.user.sex,
    school: req.session.passport.user.school,
    email: req.session.passport.user.email})

})

app.get('/resources', checkAuthenticated, (req, res) => {
  res.locals.user = req.session.passport.user;
  res.render('resources.ejs', { name: req.user.name })
})

app.get('/settings', checkAuthenticated, (req, res) => {
  res.locals.user = req.session.passport.user;
  res.render('settings.ejs', { name: req.user.Name })
})

app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login.ejs')
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))

app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('register.ejs')
})

app.post('/', checkAuthenticated, (req,res)=> {
  var supervisor_id = req.session.passport.user.id
  var name = req.body.name
  var school = req.body.school
  var nationality = req.body.nationality
  var dob = req.body.dob
  console.log(req.body.dob)
  let insertStatement = 'INSERT INTO delegates(Delegate_ID, Name, DOB, School, Nationality, Supervisor_ID) VALUES(NULL,"'+ name +'","' + dob +'","'+ school +'","' + nationality +'","' + supervisor_id+'")'

  connection.query(insertStatement, (error)=>{
    if(error){
      return console.error(error.message)
    }
  })
  console.log("Delegate Added to the List")
  res.redirect('/login')
})

app.post('/register', checkNotAuthenticated, async (req, res) => {
  try {
    /* adding the new registration as a record in the database*/
    // asynchronous hashing of the password with 10 rounds of salting to ensure data security
    const hashedPassword = await bcrypt.hash(req.body.password, 10)

    var salutation = req.body.salutation
    var name = req.body.name
    var sex = req.body.sex
    var school = req.body.school
    var nationality = req.body.nationality
    var email = req.body.email

    let insertStatement = 'INSERT INTO accounts(ID, Salutation, Name, Sex, School, Nationality, Email, Password) VALUES(NULL,"'+ salutation +'","' + name +'","'+ sex +'","' + school +'","' + nationality +'","' + email +'","' + hashedPassword +'")'


    connection.query(insertStatement, (error)=>{
      if(error){
        return console.error(error.message)
      }
    })

    let sql = "SELECT * FROM accounts ORDER BY ID DESC LIMIT 1" 
    connection.query(sql, (error, results, fields) => {
      if (error) {
        // Displays the error (if any) on the console
      }
      users.push({
        id: results[0].ID,
        salutation: salutation,
        name: name,
        sex: sex,
        school: school,
        nationality: nationality,
        email: email,
        password: hashedPassword
      })
    });

    res.redirect('/login')
  } catch(error) {
      res.redirect('/register')
  }
})


app.delete('/logout', (req, res) => {
  req.logOut()
  res.redirect('/login')
})



function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/')
  }
  next()
}

//PORT 3000
const PORT = process.env.PORT || 3000;
console.log(`🚀 @  http://localhost:${PORT}`)
app.listen(PORT)