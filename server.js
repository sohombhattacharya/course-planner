var express = require('express');
var app = express();
var nunjucks = require('pug');
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
app.set('views', __dirname + '/views');
app.set('view engine', 'pug');
app.use(express.static('static'));

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
    var user = req.body.username; 
    var obj = {"username": user};
    var errorRes = {"error": ""}; 
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
                req.session.userInfo = {"userID": userID, "username": user, "nickname": nickname, "courses": []}; 
                req.session.admin = true; 
                return res.send(req.session.userInfo);
            });      
        }
        else if (count > 0){
            errorRes.error = "Username already exists! Please try creating an account with a different username."; 
            res.send(errorRes); 
        }
        else{
            errorRes.error = "Multiple accounts with different usernames, server/db error. Please try creating an account with different username."
            res.send(errorRes); 
        }
    });
});

app.delete('/api/course', auth, (req, res) =>{
    var courseName = req.body.courseName; 
    var userID = ObjectID(req.session.userInfo.userID);
    var query = {"userID": userID, "courseName": courseName};
    var tasksQuery = {"userID": userID, "course": courseName}; 
    db.collection('courses').find(query).toArray(function(err, results){
        if (err)
            res.send(err); 
        else if (results){
            if (results.length == 1){
                db.collection('courses').remove(query, function(err1, results1){
                    if (err1)
                        return res.send(err1); 
                    else if (results1){
                        var coursesList = req.session.userInfo.courses; 
                        for (i = 0; i < coursesList.length; i++){
                            if (coursesList[i].course == courseName){
                                coursesList.splice(i, 1); 
                                break; 
                            }
                        }
                        req.session.userInfo.courses = coursesList; 
                        db.collection('tasks').remove(tasksQuery, function(err2, results2){
                            if (err2)
                                return res.send(err2); 
                            else if (results2){
//                                console.log(results2); 
//                                var tasksList = req.session.userInfo.tasks; 
//                                for (i = 0; i < tasksList.length; i++){
//                                    if (tasksList[i].course == courseName){
//                                        tasksList.splice(i, 1); 
//                                        break; 
//                                    }
//                                }
//                                req.session.userInfo.tasks = tasksList; 
                                return res.send(req.session.userInfo); 
                            }
                            
                        }); 
                    }
                }); 
            }
            else if (results.length == 0)
                return res.send("course to remove does not exist!"); 
            else
                return res.send("unknown error");
        }
    }); 
}); 
app.post('/api/course', auth, (req, res) => {
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
                            var courseRow = {"course": results2.courseName, "description": results2.courseDescription, "tasks": []};
                            req.session.userInfo.courses.push(courseRow); 
                            return res.send(req.session.userInfo); 
                        }
                    });
                }
            });    
        }
        else
            return res.send("courseName already exists!");      
    });
});

app.put('/api/course', auth, (req, res) => {
    var oldCourseName = req.body.oldCourseName;
    var oldCourseDescription = req.body.oldCourseDescription; 
    var newCourseName = req.body.newCourseName; 
    var newCourseDescription = req.body.newCourseDescription; 
    var userID = ObjectID(req.session.userInfo.userID); 
    var masterQuery = {"userID": userID};
    var query = {"userID": userID, "courseName": oldCourseName};
    var courseExistsQuery = {"userID": userID, "courseName": newCourseName};   
    var courseData = {"$set": {"courseName": newCourseName, "courseDescription": newCourseDescription}};
    db.collection('courses').find(query).count().then(function(count){
        if (count == 1){
            db.collection('courses').find(courseExistsQuery).count().then(function(count1) {
                if (count1 > 0)
                    return res.send("course with this name already exists!"); 
                else if (count1 == 0){
                    db.collection('courses').updateOne(query, courseData, function(err, doc){
                        if (err)
                            return res.send(err);
                        else if (doc){
                            if (doc.matchedCount == 1 && doc.modifiedCount == 1){
                                db.collection('courses').findOne(courseExistsQuery, function(err1, doc1){
                                    if (err1)
                                        return res.send(err1); 
                                    else if (doc1){
                                        var coursesList = req.session.userInfo.courses;
                                        var tasksList = req.session.userInfo.tasks; 
                                        var newCourseRow = {"course": doc1.courseName, "description": doc1.courseDescription};
                                        // WANT TO FIND A BETTER WAY TO FIND INDEX OF WITHOUT FOR LOOP
//                                        for (i = 0; i < coursesList.length; i++){
//                                            if (coursesList[i].course == oldCourseName)
//                                                coursesList[i] = newCourseRow;
//                                        }
                                        var courseObj = (coursesList).filter(function( obj ) {
                                            return obj.course == oldCourseName;
                                        });                                         
                                        courseObj[0] = newCourseRow; 
                                        req.session.userInfo.courses = coursesList; 
                                        var taskQuery = {"userID": userID, "course": oldCourseName};
                                        var taskData = {"$set": {"course": newCourseName}};
                                        db.collection('tasks').update(taskQuery, taskData, function(err2, results){
                                            if (err2)
                                                return res.send(err2); 
                                            
                                            else if (results){
//                                                for (i = 0; i < tasksList.length; i++){
//                                                    if (tasksList[i].course == oldCourseName)
//                                                        tasksList[i].course = newCourseName; 
//                                                }
                                                var taskObj = (tasksList).filter(function( obj ) {
                                                    return obj.course == oldCourseName;
                                                });                                   
                                                taskObj[0].course = newCourseName; 
                                                req.session.userInfo.tasks = tasksList; 
                                                return res.send(req.session.userInfo); 
                                            }
                                        });
                                    }
                                });
                            }
                            else
                                return res.send("didn't modify correctly"); 
                        }
                    });
                }
            });        
        }
        else if (count == 0)
            return res.send("old course with this name currently does not exist"); 
        else
            return res.send("unknown error"); 
    }); 

});

app.delete('/api/task', auth, (req, res) => {
    var courseName = req.body.courseName; 
    var taskName = req.body.taskName; 
    var taskDescription = req.body.taskDescription; 
    var userID = ObjectID(req.session.userInfo.userID);
    var query = {"userID": userID, "course": courseName, "task": taskName, "description": taskDescription}; 
    db.collection('tasks').find(query).toArray(function(err, results){
        if (err)
            return res.send(err);
        else if (results){
            console.log("test");
            if (results.length == 1){
                console.log("test1"); 
                db.collection('tasks').remove(query, function(err1, results1){
                    console.log("test2"); 
                    if (err1)
                        return res.send(err1)
                    else if (results1){
                        console.log(results1); 
                        var courseObj = (req.session.userInfo.courses).filter(function( obj ) {
                            return obj.course == courseName;
                        });                         
                        var tasksList = courseObj[0].tasks; 
//                        for (i = 0; i < tasksList.length; i++){
//                            if (tasksList[i].task == taskName && tasksList[i].course == courseName && tasksList[i].description == taskDescription){
//                                console.log(i); 
//                                tasksList.splice(i, 1); 
//                                break; 
//                            }
//                        }
                        var taskObj = (tasksList).filter(function( obj ) {
                            return (obj.task == taskName && obj.course == courseName && obj.description == taskDescription);
                        });
                        tasksList.splice(tasksList.indexOf(taskObj[0]), 1); 
                        return res.send(req.session.userInfo); 
                    }
                }); 
            }
            else if (results.length == 0)
                return res.send("this specific task does not exist!"); 
            else 
                return res.send("this task appears multiple times in db - error"); 
        }
    
    }); 
}); 
app.put('/api/task', auth, (req, res) => {
    var courseName = req.body.courseName; 
    var oldTaskName = req.body.oldTaskName; 
    var newTaskName = req.body.newTaskName; 
    var newTaskDescription = req.body.newTaskDescription; 
    var userID = ObjectID(req.session.userInfo.userID);
    var query = {"userID": userID, "course": courseName, "task": newTaskName}; 
    var oldTaskQuery = {"userID": userID, "course": courseName, "task": oldTaskName};
    var taskData = {"$set": {"task": newTaskName, "description": newTaskDescription}};    
    db.collection('tasks').find(oldTaskQuery).toArray(function(err, results){
        if (err)
            return res.send(err); 
        else if (results){
            if (results.length == 1){
                db.collection('tasks').find(query).toArray(function(err1, results1){
                    if (err1)
                        return res.send(err1); 
                    else if (results1.length == 0){
                        db.collection('tasks').updateOne(oldTaskQuery, taskData, function(err2, results2){
                            if (err2)
                                return res.send(err2);
                            else if (results2){
                                if (results2.matchedCount == 1 && results2.modifiedCount == 1){
                                    db.collection('tasks').findOne(query, function(err3, doc){
                                        if (err3)
                                            return res.send(err3); 
                                        else if (doc){
                                            var courseObj = (req.session.userInfo.courses).filter(function( obj ) {
                                              return obj.course == courseName;
                                            });                                  
                                            
                                            var tasksList = courseObj[0].tasks; 
                                            console.log(tasksList); 
//                                            for (i = 0; i < tasksList.length; i++){
//                                                if (tasksList[i].task == oldTaskName && tasksList[i].course == courseName){
//                                                    tasksList[i].task = doc.task; 
//                                                    tasksList[i].description = doc.description;
//                                                }
//                                            }
                                            var taskObj = (tasksList).filter(function( obj ) {
                                              return (obj.task == oldTaskName);
                                            }); 
                                            console.log(taskObj); 
                                            taskObj[0].task = doc.task; 
                                            taskObj[0].description = doc.description; 
                                            return res.send(req.session.userInfo); 
                                        }
                                    }); 
                                }    
                                else
                                    return res.send("didn't modify correctly"); 
                            }
                        }); 
                        
                    }
                    else if (results1.length == 1)
                        return res.send("task with this name already exists!"); 
                    else 
                        return res.send("unknown error - internal"); 
                }); 
            }
            else if (results.length == 0)
                return res.send("old task name doesn't exist for this course!"); 
            else
                return res.send("unknown error - external"); 
        }
    }); 

    
});

app.post('/api/task', auth, (req, res) => {
    var courseName = req.body.courseName; 
    var taskName = req.body.taskName; 
    var taskDescription = req.body.taskDescription; 
    var userID = ObjectID(req.session.userInfo.userID);
    var taskQuery = {"userID": userID, "task": taskName, "course": courseName, "description": taskDescription};
    var courseQuery = {"userID": userID, "courseName": courseName}; 
    var query = {"userID": userID, "task": taskName, "course": courseName}; 
    db.collection('courses').find(courseQuery).toArray(function(error, result){
        if (error)
            return res.send(error); 
        else if (result.length == 1){
            db.collection('tasks').find(query).toArray(function(err, results){
                if (err)
                    return res.send(err); 
                else if (results)
                    if (results.length == 0){
                        var docToInsert = {"userID": userID, "course": courseName, "task": taskName, "description": taskDescription};
                        db.collection('tasks').insert(docToInsert, function(err1, results1){
                            if (err1)
                                return res.send(err1); 
                            else{
                                db.collection('tasks').findOne(taskQuery, function(err2, doc){
                                    if (err2)
                                        return res.send(err2); 
                                    else if (doc){
        //                                console.log(doc); 
                                        var newTaskRow = {"task": doc.task, "description": doc.description}; 
                                        var courseObj = (req.session.userInfo.courses).filter(function( obj ) {
                                          return obj.course == courseName;
                                        });                                            
                                        courseObj[0].tasks.push(newTaskRow);  
                                        return res.send(req.session.userInfo); 
                                    }
                                }); 
                            }
                        });
                    }
                    else if (results.length == 1)
                        return res.send("this task already exists for the course!");
                    else 
                        return res.send("unknown error"); 
            });         
        }
        else if (result.length == 0)
            return res.send("this course doesn't exists!"); 
        else 
            return res.send("unknown error"); 
    
    
    }); 
});

app.post('/api/login', (req, res) => {
//    console.log("request came"); 
    var user = req.body.username; 
    var query = {"username": user};
    var errorRes = {"error": "incorrect username/password"}; 
    db.collection('accounts').findOne({"username": user}).then(function(doc){
        if (doc){
            pwd = req.body.password;          
            var hash = doc.password;
            var correctPwd = bcrypt.compareSync(pwd, hash);
            if (correctPwd){
//                console.log("correct pass"); 
                var userID = doc._id; 
                var query = {"userID": ObjectID(userID)};
                req.session.userInfo = {"userID": userID, "username": doc.username, "nickname": doc.nickname, "courses": []};
                
                db.collection('courses').find(query).toArray(function(err, results){
                    if (err)
                        return res.send(err);
                    else if (results){
                        for (i = 0; i < results.length; i++){
                            var courseRow = {"course": results[i].courseName, "description": results[i].courseDescription, "tasks": []};
                            req.session.userInfo.courses.push(courseRow); 
                        }
                        db.collection('tasks').find(query).toArray(function(err1, results1){
                            if (err1)
                                return res.send(err1); 
                            else if (results1){
                                for (i = 0; i < results1.length; i++){
                                    var taskRow = {"task": results1[i].task, "description": results1[i].description};
                                    var courseObj = (req.session.userInfo.courses).filter(function( obj ) {
                                      return obj.course == results1[i].course;
                                    });         
//                                    console.log(courseObj); 
                                    if (courseObj)
                                        courseObj[0].tasks.push(taskRow);
                                }
                                req.session.admin = true; 
                                res.contentType('json');
                                return res.send(req.session.userInfo); 
                            }
                            
                        });    
                    
                    }
                        
                });                   
            }
            else
                return res.send(errorRes); 
        }
        else
            return res.send(errorRes); 
    });
});


app.get('/',function(req,res){
    res.render('index'); 
  //__dirname : It will resolve to your project folder.
});

app.get('/home', auth, function(req, res){
    res.render('home', req.session.userInfo); 
});

app.get('/api/logout', auth, function (req, res) {
  req.session.destroy();
  res.redirect('/');
});