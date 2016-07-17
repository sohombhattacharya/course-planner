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
            var account = {"username": user, "password": hash, "nickname": nickname};
            db.collection('accounts').insert(account, (err, results) => {
                if (err){ 
                    return res.send(err); // SET A STANDARD SESSION - ERROR VARIABLE THAT HOLDS THIS ERROR
                }
                var userID = results["ops"][0]["_id"]; 
                req.session.userInfo = {"userID": userID, "username": user, "nickname": nickname, "courses": [], "tasks": []}; 
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
    var courseName = req.body.courseName; 
    var courseDescription = req.body.courseDescription; 
    var userID = ObjectID(req.session.userInfo.userID);
    var query = {"userID": userID, "courseName": courseName};
    var docToInsert = {"userID": userID, "courseName": courseName, "courseDescription": courseDescription};
    db.collection('courses').find(query).toArray(function(err, results){
        if (err)
            return res.send(err); 
        if (results.length == 0){
            db.collection('courses').insert(docToInsert, function(err1, results1){
                if(err1)
                    return res.send(err1);
                else{
                    var simpleQuery = {"userID": userID};
                    db.collection('courses').findOne(query, function(err2, results2){
                        if (err2)
                            return res.send(err2); 
                        else{
                            var courseRow = {"course": results2.courseName, "description": results2.courseDescription};
                            req.session.userInfo.courses.push(courseRow); 
                            return res.redirect('/home'); 
                        }
                    });
                }
            });    
        }
        else
            return res.send("courseName already exists!");      
    });
});

app.post('/api/updateCourse', auth, (req, res) => {
    oldCourseName = req.body.oldCourseName; 
    newCourseName = req.body.newCourseName; 
    newCourseDescription = req.body.newCourseDescription; 
    var query = {"_id": ObjectID(req.session.userInfo.userID), "courses.courseName": oldCourseName};
    var courseExistsQuery = {"_id": ObjectID(req.session.userInfo.userID), "courses.courseName": newCourseName};
    var courseData = {"$set": {"courses.$.courseName": newCourseName, "courses.$.description": newCourseDescription}};
    var instr = {"returnOriginal": false};
    db.collection('courses').find(courseExistsQuery).count().then(function(count) {
        if (count > 0)
            return res.send("course with this name already exists!"); 
        else if (count == 0){
            db.collection('courses').findOneAndUpdate(query, courseData, instr).then(function(doc){
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
//    var query = 
    var existsQuery = {
    "_id": ObjectID(req.session.userInfo.userID),    
    "courses": { 
        "$elemMatch": {
            "courseName": courseName,
            "tasks": {
                "$elemMatch": {
                    "task": newTaskName,
//                    "description": newTaskDescription
                }
            }
        }
    }
};    
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
    var user = req.body.username; 
    var query = {"username": user};
    db.collection('accounts').findOne({"username": user}).then(function(doc){
        if (doc){
            pwd = req.body.password;          
            var hash = doc.password;
            var correctPwd = bcrypt.compareSync(pwd, hash);
            if (correctPwd){
//                console.log("correct pass"); 
                var userID = doc._id; 
                var query = {"userID": ObjectID(userID)};
                req.session.userInfo = {"userID": userID, "username": doc.username, "nickname": doc.nickname, "courses": [], "tasks": []};
                
                db.collection('courses').find(query).toArray(function(err, results){
                    if (err)
                        return res.send(err);
                    else if (results){
                        for (i = 0; i < results.length; i++){
                            var courseRow = {"course": results[i].courseName, "description": results[i].courseDescription};
                            req.session.userInfo.courses.push(courseRow); 
                        }
                        db.collection('tasks').find(query).toArray(function(err1, results1){
                            if (err1)
                                return res.send(err1); 
                            else if (results){
                                for (i = 0; i < results1.length; i++){
                                    var taskRow = {"task": results1[i].taskName, "description": results1[i].taskDescription};
                                    req.session.userInfo.tasks.push(taskRow); 
                                }
                                req.session.admin = true; 
                                return res.redirect('/home'); 
                            }
                            
                        });    
                    
                    }
                        
                });                   
            }
            else
                return res.send("incorrect username/password"); 
        }
        else
            return res.send("account doesn't exist!"); 
    });
});


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