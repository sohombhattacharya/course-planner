var express = require('express');
var app = express();
var port = process.env.PORT || 3000;
var bodyParser = require('body-parser');
var path = require("path");
var bcrypt = require('bcryptjs');
var session = require('express-session');
var mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
var ObjectID = mongodb.ObjectID;
const mongoURL = 'mongodb://svb5582:test123@ds017165.mlab.com:17165/course-planner'; // HEROKU CONFIG VARIABLE FOR USER/PASS
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

/*
***************************************************************
NEED TO MAKE BETTER AUTH******
***************************************************************
*/
var auth = function(req, res, next) {
    if (req.session && req.session.admin)
        return next();
    else
        return res.sendStatus(401);
}; 
MongoClient.connect(mongoURL, (err, database) => {
    if (err) return res.send("database cannot be connected to");
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
            var account = {"username": user, "password": hash, "nickname": nickname, "courses": []};
            db.collection('accounts').insert(account, (err, results) => {
                if (err){ 
                    return res.send(err); // SET A STANDARD SESSION - ERROR VARIABLE THAT HOLDS THIS ERROR
                }
                req.session.userInfo = {"userID": results["ops"][0]["_id"], "username": user, "nickname": nickname, "courses": []}; 
                req.session.admin = true; 
                return res.redirect('/home');
            });      
        }
        else if (count > 0){
            res.send("username already exists"); 
        }
        else
            res.send("unknown error"); 
    });
});
app.post('/api/addCourse', auth, (req, res) => {
    courseName = req.body.courseName; 
    courseDescription = req.body.courseDescription; 
    var query = {"_id": ObjectID(req.session.userInfo.userID)}
    var existsQuery = {"_id": ObjectID(req.session.userInfo.userID), "courses.courseName": courseName};    
    var courseData = {"$addToSet": {"courses": {"courseName": courseName, "description": courseDescription, "tasks": []}}};
    var instr = {"returnOriginal": false};
    db.collection('accounts').find(existsQuery).count().then(function(count) {
        if (count > 0)
            return res.send("course with this name already exists!"); 
        else if (count == 0){  
            db.collection('accounts').findOneAndUpdate(query, courseData, instr).then(function(doc){
                req.session.userInfo.courses = doc.value.courses;  
                return res.redirect('/home');
            });    
        }
    });
});

app.post('/api/updateCourse', auth, (req, res) => {
    oldCourseName = req.body.oldCourseName; 
    courseName = req.body.newCourseName; 
    courseDescription = req.body.newCourseDescription; 
    var query = {"_id": ObjectID(req.session.userInfo.userID), "courses.courseName": oldCourseName};
    var existsQuery = {"_id": ObjectID(req.session.userInfo.userID), "courses.courseName": courseName};
    var courseData = {"$set": {"courses.$.courseName": courseName, "courses.$.description": courseDescription}};
    var instr = {"returnOriginal": false};
    db.collection('accounts').find(existsQuery).count().then(function(count) {
        if (count > 0)
            return res.send("course with this name already exists!"); 
        else if (count == 0){
            db.collection('accounts').findOneAndUpdate(query, courseData, instr).then(function(doc){
                req.session.userInfo.courses = doc.value.courses;  
                return res.redirect('/home');
            });
        }
    });
});




/*
******************************************************************************
NEED TO FIX THIS updateTask CALL, QUERY AND EXISTSQUERY NOT WORKING CORRECTLY*
******************************************************************************
*/
app.post('/api/updateTask', auth, (req, res) => {
    courseName = req.body.courseName; 
    oldTaskName = req.body.oldTaskName; 
    newTaskName = req.body.newTaskName; 
    newTaskDescription = req.body.newTaskDescription; 
    var query = {"_id": ObjectID(req.session.userInfo.userID), "courses": {"$elemMatch": {"courses.courseName": courseName, "courses.tasks.task": oldTaskName}}};
    var existsQuery = {"_id": ObjectID(req.session.userInfo.userID), "courses": { "$elemMatch": {"courses.courseName": courseName, "courses.tasks.task": newTaskName}}};
    var courseData = {"$set": {"courses.tasks.$.task": newTaskName, "courses.tasks.$.description": newTaskDescription}};
    var instr = {"returnOriginal": false};    
    db.collection('accounts').find(existsQuery).count().then(function(count) {
        console.log("done with existsQuery");
        if (count > 0)
            return res.send("task with this name already exists!");
        else if (count == 0){
            db.collection('accounts').findOneAndUpdate(query, courseData, instr).then(function(doc){
                console.log("done with query");
                req.session.userInfo.courses = doc.value.courses;  
                return res.redirect('/home');
            });        
        }
    });  
    
});

app.post('/api/addTask', auth, (req, res) => {
    courseName = req.body.courseName; 
    taskName = req.body.taskName; 
    taskDescription = req.body.taskDescription; 
    var query = {"_id": ObjectID(req.session.userInfo.userID), "courses.courseName": courseName};
    var existsQuery = {"_id": ObjectID(req.session.userInfo.userID), "courses": { "$elemMatch": {"courses.courseName": courseName, "courses.tasks.task": taskName}}};    
    var courseData = {"$addToSet": {"courses.$.tasks": {"task": taskName, "description": taskDescription}}};
    var instr = {"returnOriginal": false};
    db.collection('accounts').find(existsQuery).count().then(function(count) {
        if (count > 0)
            return res.send("task with this name already exists!");
        else if (count == 0){
            db.collection('accounts').findOneAndUpdate(query, courseData, instr).then(function(doc){
                req.session.userInfo.courses = doc.value.courses;  
                return res.redirect('/home');
            });        
        }
    });   
});

app.post('/api/login', (req, res) => {
    user = req.body.username; 
    db.collection('accounts').findOne({"username": user}).then(function(doc){
        if (doc){
            pwd = req.body.password;          
            var hash = doc.password;
            var correctPwd = bcrypt.compareSync(pwd, hash);
            if (correctPwd){
                req.session.userInfo = {"userID": doc._id, "username": doc.username, "nickname": doc.nickname, "courses": doc.courses}; 
                req.session.admin = true; 
                return res.redirect('/home');
            }
            else
                return res.send("incorrect username/password"); 
        }
        else
            return res.send("account doesn't exist!"); 
    
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

app.get('/logout', function (req, res) {
  req.session.destroy();
  res.redirect('/');
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