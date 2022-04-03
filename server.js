//Including classes
const config = require('./config.json')
const emailAuth = require('./email-details.json')
const { roles } = require('./constants');
var favicon = require('serve-favicon');



//Including External libraries
const express = require('express') //Build web app, handle post and requests
var ejs = require("ejs");
const flash = require('express-flash') 
const nodemailer = require('nodemailer');
const session = require('express-session')
const bcrypt = require('bcrypt') //password hashing
const passport = require('passport') //Session Authentication
const createHttpError = require('http-errors'); // error-handling library
const methodOverride = require('method-override')
const bodyParser = require('body-parser');
var fs = require("fs");
let mysql = require('mysql') //connecting to MYSQL database
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config() //Creates environment variables
}
const app = express()
var path = require('path');

// app.use(favicon(__dirname + '/public/images/favicon.ico'));

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

sql = 'SELECT * FROM cost_table'
const costs = []
connection.query(sql, (error, results, fields) => {
  if (error) {
    // Displays the error (if any) on the console
    return console.error(error.message)
  }

  for (var i = 0; i < results.length; i++) {
    costs.push({
      id: results[i].item_ID,
      description: results[i].Description,
      price: results[i].Price,
      cost: results[i].Cost
    })
  }
});
sql = 'SELECT * FROM resources'
const resources = []
connection.query(sql, (error, results, fields) => {
  if (error) {
    // Displays the error (if any) on the console
    return console.error(error.message)
  }

  for (var i = 0; i < results.length; i++) {
    resources.push({
      id: results[i].Resource_ID,
      name: results[i].Name,
      link: results[i].Resource_Link
    })
  }
});

const delegates = []
sql = "SELECT * FROM delegates";
connection.query(sql, (error, results, fields) => {
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
sql = "SELECT * FROM committees";
connection.query(sql, (error, results, fields) => {
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
app.set('views', path.join(__dirname, 'views'));

// Set view engine as EJS
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

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
      delegates: delegates ,
      user: req.session.passport.user, resources, Committees: committees}
      )
  } else{
      res.render('index.ejs', {
      delegates: delegates.filter((x) => { return x.supervisor_id == req.session.passport.user.id;}),
      user: req.session.passport.user})
  }
})

app.get('/resources', checkAuthenticated, (req, res) => {
  res.locals.user = req.session.passport.user;
  res.render('resources.ejs', { name: req.user.name, resources })
})

app.get('/finance', checkAuthenticated, (req, res) => {
  var revenue = 0;
  var total_cost = 0;
  users.forEach(user => {
    costs.forEach(cost =>{
      revenue += user.quota * cost.price 
      total_cost += user.quota * cost.cost 
    })
  })
  res.render('finance.ejs', { user: req.session.passport.user ,costs, total: {revenue: revenue, cost: total_cost}})
})

app.get('/settings', checkAuthenticated, (req, res) => {
  res.locals.user = req.session.passport.user;
  res.render('settings.ejs', { name: req.user.Name })
})

app.get('/admin', checkAuthenticated, checkAdmin,(req, res) => {

  res.render('manage.ejs', {users, user: req.session.passport.user, Committees: committees})
})

app.get('/user/:id', checkAuthenticated, checkAdmin,(req, res) => {
    const { id } = req.params;
    var del_names = []
    delegates.forEach(del => 
      del_names.push(del.name));
    res.render('delegate-table.ejs', {allDelegates: delegates.filter((x) => { return x.supervisor_id == id;}), names: del_names, delegates: delegates.filter((x) => { return x.supervisor_id == id;}) , user: req.session.passport.user, id })    
})

app.post('/user/generate-invoice', checkAuthenticated, checkAdmin,(req, res) => {
  var id = req.body.id;
  var index = users.findIndex(x => x.id == id)
  res.render('invoice.ejs', {invoice: costs, user: users[index] })    
})

app.get('/delegates', checkAuthenticated, checkAdmin, (req, res) => {
  var del_names = []
  delegates.forEach(del => del_names.push(del.name));
  res.render('delegate-table.ejs', {allDelegates: delegates, names: del_names, delegates: delegates , user: req.session.passport.user, users})    
})


app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login.ejs')
})

app.get('/contact', (req, res) => {
  res.render('contact-form.ejs')
})

app.get('/generate-invoice', checkAuthenticated, (req, res) => {

  res.render('invoice.ejs', {user: req.session.passport.user, invoice: costs})
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

app.post('/contact', (req,res)=> {
  var name = req.body.name
  var email = req.body.email
  var school = req.body.school
  var message = req.body.msg
    
  let mailTransporter = nodemailer.createTransport(emailAuth);

  let mailDetails = {
    from: emailAuth.auth.user, //noreply@server.com
    to: 'adadiraju@cisb.org.in',
    subject: 'You\'ve recieved a response from your Contact Form',
    text: "From: "+ name + "\nSchool: "+ school + "\nEmail: "+ email +"\n\n" + message
  };

  mailTransporter.sendMail(mailDetails, function(err, data) {
    if(err) {
        console.error(err.message)
    } else {
        console.log('Email sent successfully');
    }
  });
  res.redirect('/login')
})

app.post('/send-invoice', (req,res)=> {
  var id = req.body.id;
  console.log(id)
  var index = users.findIndex(x => x.id == id)
  console.log(users[index])
  
  let mailTransporter = nodemailer.createTransport(emailAuth);

  ejs.renderFile(__dirname + "/views/invoice.ejs", {invoice: costs, user: users[index] }, function (err, data) {
    if (err) {
        console.log(err);
    } else {
        var mailOptions = {
            from: emailAuth.auth.user,
            to: users[index].email,
            subject: 'Your Invoice for CISMUN has been Generated',
            html: data
        };
        mailTransporter.sendMail(mailOptions, function (err, info) {
            if (err) {
                console.log(err);
            } else {
                console.log('Message sent: ' + info.response);
            }
        });
    }
    
    });
  res.redirect('/login')
})


app.post('/display-delegates', checkAuthenticated, checkAdmin, (req,res)=> {
  var del_names = req.body.delegate.split(",")

  var del_list = []
  del_names.forEach(name => {
    const index = delegates.findIndex(del => del.name == name);
    del_list.push(delegates[index])
  });


  res.render('delegate-table.ejs',{allDelegates: delegates, delegates: del_list , names: del_names, user: req.session.passport.user, users} )
})

app.post('/add-cost', checkAuthenticated, checkAdmin, (req,res)=> {
  var name = req.body.name
  var price = req.body.price
  var cost = req.body.cost

  let insertStatement = 'INSERT INTO cost_table(item_ID, Description, Cost, Price) VALUES(NULL,"'+ name +'","' + cost +'","' + price +'")'
  connection.query(insertStatement, (error)=>{
    if(error){
      return console.error(error.message)
    }
  })

  let sql = "SELECT * FROM cost_table ORDER BY item_ID DESC LIMIT 1" 
  connection.query(sql, (error, results, fields) => {
    if (error) {
      // Displays the error (if any) on the console
      return console.error(error.message)
    }

    costs.push({
      id: results[0].item_ID,
      description: results[0].Description,
      price: results[0].Price,
      cost: results[0].Cost
    })
  });
  res.redirect('/finance')
})

app.post('/add-resource', checkAuthenticated, checkAdmin, (req,res)=> {
  var name = req.body.name
  var link = req.body.link

  let insertStatement = 'INSERT INTO resources(Resource_ID, Name, Resource_Link) VALUES(NULL,"'+ name +'","' + link +'")'
  connection.query(insertStatement, (error)=>{
    if(error){
      return console.error(error.message)
    }
  })

  let sql = "SELECT * FROM resources ORDER BY Resource_ID DESC LIMIT 1" 
  connection.query(sql, (error, results, fields) => {
    if (error) {
      // Displays the error (if any) on the console
      return console.error(error.message)
    }
    resources.push({
      id: results[0].Resource_ID,
      name: results[0].Name,
      link: results[0].Resource_Link
    })
  });
  res.redirect('/')
})

app.post('/add-committee', checkAuthenticated, checkAdmin, (req,res)=> {
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

app.post('/modify-committee', checkAuthenticated, checkAdmin, (req,res)=> {
  var committee = req.body.committee
  var name = req.body.name
  var max_delegates = req.body.max_delegates
  var index = committees.findIndex(x => x.name == committee);
  committees[index].name = name
  committees[index].max_delegates = max_delegates

  let insertStatement = 'UPDATE committees SET Committee = "'+ name +'" WHERE (`Committee` = "'+ committee +'" );'
  insertStatement += 'UPDATE committees SET Max_Delegates = '+ max_delegates +' WHERE (`Committee` = "'+ committee +'" );'
  
  

  connection.query(insertStatement, (error)=>{
    if(error){
      return console.error(error.message)
    }
  })
  var filteredDelegates = delegates.filter(x => x.committee == committee)
  filteredDelegates.forEach(delegate => {
    var index = delegates.findIndex(x => x.id == delegate.id);
    delegates[index].committee = name
  })
  res.redirect('/')

});


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
  let sql = 'UPDATE accounts SET Quota = ' + quota + ' WHERE (ID =' + id + ');DELETE FROM delegates WHERE (Supervisor_ID =' + id +')'
  connection.query(sql, (error)=>{
    if(error){
      return console.error(error.message)
    }
  })
  var filteredDelegates = delegates.filter(x => x.supervisor_id == id)
  filteredDelegates.forEach(delegate => {
    var index = delegates.findIndex(x => x.id == delegate.id);
    if (index > -1) {
      delegates.splice(index, 1); // 2nd parameter means remove one item only
    }}
  )
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
      sql = 'INSERT INTO delegates(Delegate_ID, Delegation, Committee, Supervisor_ID) VALUES(NULL,"' + del_list +'","' + committee_list + '",' + id +')'
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

  }
  res.redirect('/admin')
})

app.post('/delete-cost', checkAuthenticated, checkAdmin, (req,res)=> {
  var id = req.body.id;
  let sql = 'DELETE FROM cost_table WHERE (item_ID =' + id + ');'
  var index = costs.findIndex(x => x.id == id);
  if (index > -1) {
    costs.splice(index, 1); // 2nd parameter means remove one item only
  } 

  connection.query(sql, (error)=>{
    if(error){
      return console.error(error.message)
    }
  })
  res.redirect('/finance')
})

app.post('/delete-resource', checkAuthenticated, checkAdmin, (req,res)=> {
  var id = req.body.id;
  let sql = 'DELETE FROM resources WHERE (Resource_ID =' + id + ');'
  var index = resources.findIndex(x => x.id == id);
  if (index > -1) {
    resources.splice(index, 1); // 2nd parameter means remove one item only
  } 

  connection.query(sql, (error)=>{
    if(error){
      return console.error(error.message)
    }
  })
  res.redirect('/')
})

app.post('/delete-delegate', checkAuthenticated, (req,res)=> {
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

app.post('/settings/modify-account', checkAuthenticated, (req,res)=> {
  try{
  var id = req.body.id
  var salutation = req.body.salutation
  var name = req.body.name
  var sex = req.body.sex
  var school = req.body.school
  var nationality = req.body.nationality
  var email = req.body.email

  
  let sql = 'UPDATE accounts SET Salutation = "' + salutation + '" WHERE (ID =' + id + ');'
  sql += 'UPDATE accounts SET Name = "' + name + '" WHERE (ID =' + id + ');'
  sql += 'UPDATE accounts SET Sex = "' + sex + '" WHERE (ID =' + id + ');'
  sql += 'UPDATE accounts SET School = "' + school + '" WHERE (ID =' + id + ');'
  sql += 'UPDATE accounts SET Nationality = "' + nationality + '" WHERE (ID =' + id + ');'
  sql += 'UPDATE accounts SET Email = "' + email + '" WHERE (ID =' + id + ');'
  connection.query(sql, (error)=>{
    if(error){
      return console.error(error.message)
    }
  })
  var index = users.findIndex(x => x.id == id);
  users[index].name = name
  users[index].sex = sex
  users[index].school = school
  users[index].nationality = nationality
  users[index].email = email


  res.redirect('/')
  } catch(e){
    res.redirect('/settings')
  }
  
})

app.post('/settings/change-password', checkAuthenticated, async (req,res)=> {
  try{
  const hashedPassword = await bcrypt.hash(req.body.password, 10)
  var id = req.body.id
  var password = req.body.password
  var confirmPassword = req.body.confirmPassword
  

  if (password != confirmPassword){
    res.render('settings.ejs', {user: req.session.passport.user, messages: {error: "Passwords Do not Match"} })
  }
  
  let sql = 'UPDATE accounts SET Password = "' + hashedPassword + '" WHERE (ID =' + id + ');'
  connection.query(sql, (error)=>{
    if(error){
      return console.error(error.message)
    }
  })
  var i = users.findIndex(x => x.id == id);
  users[i].password = hashedPassword;

  res.redirect('/login')
  } catch(e){
    res.redirect('/settings')
  }
  
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
console.log(`🚀  @  http://localhost:${PORT}`)
app.listen(PORT)
