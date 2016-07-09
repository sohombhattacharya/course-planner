var express = require('express');
var app = express();
var port = process.env.PORT || 3000;
var bodyParser = require('body-parser');
var path = require("path");
var bcrypt = require('bcryptjs');
const MongoClient = require('mongodb').MongoClient
const mongoURL = 'mongodb://svb5582:test123@ds017165.mlab.com:17165/course-planner'; // NEED TO USE HEROKU CONFIG VARIABLES HERE!!!
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

MongoClient.connect(mongoURL, (err, database) => {
    if (err) return console.log(err);
    db = database;
    app.listen(port, () => {
        console.log('listening on 3000');
    });
});


app.post('/api/createAccount', (req, res) => {
    user = req.body.username; 
    db.collection('accounts').find({"username":user}).count().then(function(count) {
        if (count == 0){
            pwd = req.body.password;  
            nickname = req.body.nickname; 
            var hash = bcrypt.hashSync(pwd, 10);
            var account = {"username": user, "password": hash, "nickname": nickname};
            db.collection('accounts').insert(account, (err, results) => {
                if (err) return res.send(err); // SET A STANDARD SESSION - ERROR VARIABLE THAT HOLDS THIS ERROR 
                return res.send("account added");  
            });      
        }
        else if (count > 0){
            return res.send("username already exists"); 
        //SET SESSION RETURN VALUE TO --> USERNAME ALREADY EXISTS PLEASE ENTER NEW
        }
        else
            return res.send("unknown error"); 
//        callback(count);
    });
});

app.post('/api/login', (req, res) => {
    user = req.body.username; 
    db.collection('accounts').findOne({"username": "eee"}).then(function(doc){
        if (doc){
            res.send("account exists"); 
            pwd = req.body.password;          
            var hash = doc.password;
            bcrypt.compareSync(pwd, hash);

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
    pwd = req.body.password;  
    var hash = bcrypt.hashSync(pwd, 10);
    
    bcrypt.compareSync("not_bacon", hash);
    res.send(hash);
    

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