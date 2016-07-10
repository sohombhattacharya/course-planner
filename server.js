var express = require('express');
var app = express();
var port = process.env.PORT || 3000;
var bodyParser = require('body-parser');
var path = require("path");
var bcrypt = require('bcryptjs');
var session = require('express-session');
const MongoClient = require('mongodb').MongoClient
const mongoURL = 'mongodb://svb5582:test123@ds017165.mlab.com:17165/course-planner'; // NEED TO USE HEROKU CONFIG VARIABLES HERE!!!
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: '2C44-4D55-WppQ38S', // HEROKU CONFIG VARIABLE 
    resave: true,
    saveUninitialized: true,
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000,
    httpOnly: true,
    secure: true,
    ephemeral: true
}));
var auth = function(req, res, next) {
    if (req.session && req.session.admin)
        return next();
    else
        return res.sendStatus(401);
}; 
MongoClient.connect(mongoURL, (err, database) => {
    if (err) return console.log(err);
    db = database;
    app.listen(port, () => {
        console.log('listening on 3000');
    });
});

app.post('/api/createAccount', (req, res) => {
    user = req.body.username; 
    var obj = {"username": user};
    db.collection('accounts').find(obj).count().then(function(count) {
        if (count == 0){
            pwd = req.body.password;  
            nickname = req.body.nickname; 
            var hash = bcrypt.hashSync(pwd, 10); // 10 NEEDS TO BE HEROKU CONFIG VARIABLE
            var account = {"username": user, "password": hash, "nickname": nickname};
            db.collection('accounts').insert(account, (err, results) => {
                if (err){ 
                    return res.send(err); // SET A STANDARD SESSION - ERROR VARIABLE THAT HOLDS THIS ERROR
                }
//                console.log(results["ops"][0]["_id"]);
                req.session.userInfo = {"userID": results["ops"][0]["_id"], "username": user, "nickname": nickname}; 
                req.session.admin = true; 
                //req.session.userCourses

                return res.redirect('/home');
//                res.sendFile(path.join(__dirname+'/views/homepage.html'));
            });      
        }
        else if (count > 0){
            res.send("username already exists"); 
        //SET SESSION RETURN VALUE TO --> USERNAME ALREADY EXISTS PLEASE ENTER NEW
        }
        else
            res.send("unknown error"); 
//        callback(count);
    });
});

app.post('/api/login', (req, res) => {
    user = req.body.username; 
    db.collection('accounts').findOne({"username": user}).then(function(doc){
        if (doc){
            pwd = req.body.password;          
            var hash = doc.password;
            var correctPwd = bcrypt.compareSync(pwd, hash);
            if (correctPwd)
                res.sendFile(path.join(__dirname+'/views/homepage.html'));
            else
                res.send("incorrect username/password"); 
        }
        else
            res.send("account doesn't exist!"); 
    
    });
//    db.collection('accounts').find({"username":user}).then(function(cursor) {
//        if (cursor.count() == 1){
//            
//            return res.send("account exists"); 
//        }
//        else if (cursor.count() == 0){
//            return res.send("account doesn't exist"); 
//        }
//        else
//            return res.send("unknown error"); 
//    });
});

//app.post('/api/saveDB', (req, res) => {
//    var respContent = {};
//    respContent.user_id = req.body.id + "2222";
//    respContent.token = req.body.token;
//    respContent.geo = req.body.geo;    
//    
//    db.collection('testCollection').save(respContent, (err, result) => {
//    if (err) return console.log(err);
//    console.log('saved to database');
//    res.json(respContent);
//  });
//});

app.get('/',function(req,res){
  res.sendFile(path.join(__dirname+'/views/index.html'));
  //__dirname : It will resolve to your project folder.
});

app.get('/home', auth, function(req, res){
    res.json(req.session); 
});

//app.get('/testGet', function (req, res) {
//    var respContent = {};
//    respContent.name = "sohom";
//    respContent.message = "Hello World!";
//    respContent.params = [1, 2, 3, 4, 5];
//    respContent.users = [];
//    respContent.users.push({"user": "josh"});
//    respContent.users.push({"user": "juee"});
//    
//    res.json(respContent);
//});


//app.post('/api/users', function(req, res) {
//    var respContent = {};
//    respContent.user_id = req.body.id + "2222";
//    respContent.token = req.body.token;
//    respContent.geo = req.body.geo;
//    res.json(respContent);
//
////    res.send(user_id + ' ' + token + ' ' + geo);
//});

//app.listen(port, function () {
//  console.log('course-planner listening on port 3000');
//});