//Including classes
const Delegate = require('./delegate.js')
const Advisor = require('./advisor.js')
const Delegation = require('./delegation.js')
const config = require('./config.json')
const { roles } = require('./constants');


//Including External libraries
const express = require('express') //Build web app, handle and funnel requests
const flash = require('express-flash') 
const session = require('express-session')
const bcrypt = require('bcrypt') //password hashing
const passport = require('passport') //Session Authentication
const createHttpError = require('http-errors'); // error-handling library
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
      password: results[i].Password.toString(),
      role: results[i].Role,
      quota: results[i].Quota
    })
  }
});

const delegates = []
let nsql = "SELECT * FROM delegates";
connection.query(nsql, (error, results, fields) => {
  if (error) {
    // Displays the error (if any) on the console
    return console.error(error.message)
  }
  for (var i = 0; i < results.length; i++) {
    if (!delegates.find(delegate => delegate.id == results[i].Delegate_ID)){
      delegates.push({
        id: results[i].Delegate_ID,
        name: results[i].Name,
        committee: results[i].Committee,
        delegation: results[i].Delegation,
        school: results[i].School,
        nationality: results[i].Nationality,
        dob: results[i].DOB,
        supervisor_id: results[i].Supervisor_ID
      })
  }
  }
});
const committees = []
let msql = "SELECT * FROM committees";
connection.query(msql, (error, results, fields) => {
  if (error) {
    // Displays the error (if any) on the console
    return console.error(error.message)
  }
  for (var i = 0; i < results.length; i++) {
    if (!committees.find(Committee => Committee.name == results[i].committee)){
      committees.push({  
        name: results[i].Committee,
        max_delegates: results[i].Max_Delegates
      })
  }
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
  if (req.session.passport.user.role == roles.admin){
    res.render('admin-index.ejs', {
      delegates: delegates.filter((x) => { return x.supervisor_id == req.session.passport.user.id;}),
      user: req.session.passport.user, Committees: committees}
      )
  } else{
      res.render('index.ejs', {
      delegates: delegates.filter((x) => { return x.supervisor_id == req.session.passport.user.id;}),
      user: req.session.passport.user})
  }
})

app.get('/resources', checkAuthenticated, (req, res) => {
  res.locals.user = req.session.passport.user;
  res.render('resources.ejs', { name: req.user.name })
})

app.get('/settings', checkAuthenticated, (req, res) => {
  res.locals.user = req.session.passport.user;
  res.render('settings.ejs', { name: req.user.Name })
})

app.get('/admin', checkAuthenticated, checkAdmin,(req, res) => {
  res.render('manage.ejs', { users, user: req.session.passport.user, Committees: committees})
})

app.get('/user/:id', checkAuthenticated, checkAdmin,(req, res) => {
    const { id } = req.params;
    res.render('delegate-table.ejs', {delegates: delegates.filter((x) => { return x.supervisor_id == id;}) , user: req.session.passport.user})    
})

app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login.ejs')
})

app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('register.ejs')
})

app.post('/', checkAuthenticated, (req,res)=> {
  var delegate_id = req.body.id
  var name = req.body.name
  var school = req.body.school
  var nationality = req.body.nationality
  var dob = req.body.dob

  let insertStatement = 'UPDATE delegates SET Name = "' + name + '", School = "'+ school + '", DOB = "'+ dob + '", Nationality = "'+ nationality + '" WHERE (Delegate_ID =' + delegate_id + ')'
  connection.query(insertStatement, (error)=>{
    if(error){
      return console.error(error.message)
    }
  })
  var i = delegates.findIndex(x => x.id == delegate_id);
  delegates[i].name = name;
  delegates[i].school = school;
  delegates[i].dob = dob;
  delegates[i].nationality = nationality;
  res.redirect('/login')
})
app.post('/add-committee', checkAuthenticated, (req,res)=> {
  var name = req.body.name
  var max_delegates = req.body.max_delegates

  let insertStatement = 'INSERT INTO committees(Committee_ID, Committee, Max_Delegates) VALUES(NULL,"'+ name +'","' + max_delegates +'")'
  connection.query(insertStatement, (error)=>{
    if(error){
      return console.error(error.message)
    }
  })


  let sql = "SELECT * FROM committees ORDER BY Committee_ID DESC LIMIT 1" 
  connection.query(sql, (error, results, fields) => {
    if (error) {
      // Displays the error (if any) on the console
      return console.error(error.message)
    }

    committees.push({
      name: results[0].Committee,
      max_delegates: results[0].Max_Delegates
    })
  });
  res.redirect('/login')
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))


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
    if (email == "admin@email.com"){
      var role = roles.admin
    }  
    else{
      var role = roles.client
    }
    let insertStatement = 'INSERT INTO accounts(ID, Salutation, Name, Sex, School, Nationality, Email, Password, Role) VALUES(NULL,"'+ salutation +'","' + name +'","'+ sex +'","' + school +'","' + nationality +'","' + email +'","' + hashedPassword +'","' + role +'")'


    connection.query(insertStatement, (error)=>{
      if(error){
        return console.error(error.message)
      }
    })

    let sql = "SELECT * FROM accounts ORDER BY ID DESC LIMIT 1" 
    connection.query(sql, (error, results, fields) => {
      if (error) {
        // Displays the error (if any) on the console
        return console.error(error.message)
      }
      users.push({
        id: results[0].ID,
        salutation: salutation,
        name: name,
        sex: sex,
        school: school,
        nationality: nationality,
        email: email,
        password: hashedPassword,
        role: results[0].Role,
        quota: results[0].Quota
      })
    });

    res.redirect('/login')
  } catch(error) {
      res.redirect('/register')
  }
})

app.post('/admin/update-role', checkAuthenticated, checkAdmin, (req,res)=> {
  var role = req.body.role
  var id = req.body.id
  var foundIndex = users.findIndex(user => user.id == id);
  users[foundIndex].role = role;
  let sql = 'UPDATE accounts SET Role ="' + role + '" WHERE (ID =' + id + ');'
  connection.query(sql, (error)=>{
    if(error){
      return console.error(error.message)
    }
  })
  res.redirect('/login')
})

app.post('/admin/modify-quota', checkAuthenticated, checkAdmin, (req,res)=> {
  var id = req.body.id
  var quota = req.body.quota
  var del_list = req.body['delegate[]'];
  var committee_list = req.body['SelectedCommittee[]'];
  var foundIndex = users.findIndex(user => user.id == id);
  users[foundIndex].quota = quota;
  let sql = 'UPDATE accounts SET Quota = ' + quota + ' WHERE (ID =' + id + ');'
  console.log(sql)
  connection.query(sql, (error)=>{
    if(error){
      return console.error(error.message)
    }
  })
  sql = '';
  if (del_list){
    if (Array.isArray(del_list)){
      for( let index = 0; index < del_list.length; index++ ) {
        //parallel arrays
        sql += 'INSERT INTO delegates(Delegate_ID, Delegation, Committee, Supervisor_ID) VALUES(NULL,"' + del_list[index] +'","' + committee_list[index] + '","' + id+'");'
      }
      connection.query(sql, (error)=>{
        if(error){
          return console.error(error.message)
        }
      })
      let stmt = 'SELECT * FROM delegates ORDER BY Delegate_ID DESC LIMIT '  + del_list.length  
      connection.query(stmt, (error, results, fields) => {
        if (error) {
          // Displays the error (if any) on the console
          return console.error(error.message)
        }
        for (var i = 0; i < results.length; i++) {
          if (!delegates.find(delegate => delegate.id == results[i].Delegate_ID)){
            delegates.push({
              id: results[i].Delegate_ID,
              name: results[i].Name,
              committee: results[i].Committee,
              delegation: results[i].Delegation,
              school: results[i].School,
              nationality: results[i].Nationality,
              dob: results[i].DOB,
              supervisor_id: results[i].Supervisor_ID
            })
        }
        }
      });

    }
    else{
      sql = 'INSERT INTO delegates(Delegate_ID, Delegation, Committee, Supervisor_ID) VALUES(NULL,"' + del_list +'","' + committee_list + '","' + id+'")'
      connection.query(sql, (error)=>{
        if(error){
          return console.error(error.message)
        }
      })
      let stmt = "SELECT * FROM delegates ORDER BY Delegate_ID DESC LIMIT 1" 
      connection.query(stmt, (error, results, fields) => {
        if (error) {
          // Displays the error (if any) on the console
          return console.error(error.message)
        }
        delegates.push({
          id: results[0].Delegate_ID,
          name: results[0].Name,
          committee: results[0].Committee,
          delegation: results[0].Delegation,
          school: results[0].School,
          nationality: results[0].Nationality,
          dob: results[0].DOB,
          supervisor_id: results[0].Supervisor_ID
        })
      });
    }
    console.log(sql)

  }
  res.redirect('/admin')
})

app.post('/delete-delegate', checkAuthenticated, (req,res)=> {
  console.log(req.body['delegate[]'])
  var delegate = req.body['delegate[]'];
  let sql = '';
  if (delegate){
    if (Array.isArray(delegate)){
      for( let index = 0; index < delegate.length; index++ ) {
        sql += 'DELETE FROM delegates WHERE (Delegate_ID = ' + delegate[index] + ');'
        var i = delegates.findIndex(x => x.id == delegate[index]);
        if (i > -1) {
          delegates.splice(i, 1); // 2nd parameter means remove one item only
        }
      }
 
    }
    else{
      sql = 'DELETE FROM delegates WHERE (DELEGATE_ID =' + delegate + ');'
      var index = delegates.findIndex(x => x.id == delegate);
      if (index > -1) {
        delegates.splice(index, 1); // 2nd parameter means remove one item only
      } 
    }

    connection.query(sql, (error)=>{
      if(error){
        return console.error(error.message)
      }
    })
  }
  res.redirect('/')
})


app.delete('/logout', (req, res) => {
  req.logOut()
  res.redirect('/login')
})


// 404 Handler
app.use((req, res, next) => {
  next(createHttpError.NotFound());
});

// Error Handler
app.use((error, req, res, next) => {
  error.status = error.status || 500;
  res.status(error.status);
  res.render('error40x.ejs', { error });
});

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

function checkAdmin(req, res, next) {

  if (req.session.passport.user.role == roles.admin) {
    next();
  } else {
    res.redirect('/');
  }
}
//PORT 3000
const PORT = process.env.PORT || 3000;
console.log(`🚀 @  http://localhost:${PORT}`)
app.listen(PORT)