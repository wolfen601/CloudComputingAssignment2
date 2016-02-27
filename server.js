/* Author: Kevin Ho
 * Server file
 * Handles communication with the storage service as well as emitting messages
 * to all clients.
*/
/***************
 * Initialize  *
***************/
//initialize all the required libraries and connections
var express = require('express'),
    app = express(),
    bodyParser = require('body-parser'),
    http = require('http'),
    socketIo = require('socket.io'),
    aws = require('aws-sdk'),
    path = require('path');
var server = http.createServer(app);
var io = socketIo.listen(server);
var port = process.env.PORT || 8080;
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
var users = {};
/*******************
 * AWS Initialize  *
*******************/
var accessKeyId =  process.env.AWS_ACCESS_KEY || "AKIAI5F5H7SX4T2D7P3Q";
var secretAccessKey = process.env.AWS_SECRET_KEY || "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";
var s3bucket = process.env.S3_BUCKET || "kevichino-cloud-computing";
var table = "Users";
aws.config.update({
  accessKeyId: accessKeyId,
  secretAccessKey: secretAccessKey,
  region: "us-west-2",
});

var docClient = new aws.DynamoDB.DocumentClient({
      params: {
        endpoint:  "https://dynamodb.us-west-2.amazonaws.com"
      }
});

// //set the desired s3 bucket to use
var s3 = new aws.S3({
      params: {
        Bucket: s3bucket,
        endpoint:  "https://s3.us-west-2.amazonaws.com"
      }
});

/***************
 * Routing     *
***************/
//homepage

app.post('/login', function(req, res){
  var username = req.body.user.name;
  var password = req.body.user.passwd;
  if(username !== "" && password !== ""){
    var params = {
     TableName : table,
     KeyConditionExpression: "#usr = :name",
     ExpressionAttributeNames:{
     "#usr": "username"
     },
     ExpressionAttributeValues: {
     ":name":username
     }
   }
   docClient.query(params, function(err, data) {
      if (err) {
        console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
        } else {
          console.log("Query succeeded.");
          data.Items.forEach(function(item) {
            if(username == item.username && password == item.password){
              users[username] = item.taskListId;
              res.redirect('/user/' + username);
            }else{
              res.redirect('/login');
            }
          });
        }
    });
  }else{
    console.log('Missing Username or Password.');
    res.redirect('/login');
  }
});

app.post('/signup', function(req, res){
  var username = req.body.user.name;
  var password = req.body.user.passwd;
  if(username !== "" && password !== ""){
    var params = {
      TableName : table,
      KeyConditionExpression: "#usr = :name",
      ExpressionAttributeNames:{
        "#usr": "username"
      },
      ExpressionAttributeValues: {
        ":name":username
      }
    }
    docClient.query(params, function(err, data) {
      if (err) {
        console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
      } else {
        console.log("Query succeeded.");
        if(data.Items.length > 0){
          console.log("User exists.");
          res.redirect('/signup');
        }else{
          console.log("User does not exists.");
          addNewUser(username, password);
          res.redirect('/');
        }
      }
    });
  }else{
    console.log('Missing Username or Password.');
      res.redirect('/signup');
  }
});

app.get('/', function(req, res){
	res.sendFile(path.join(__dirname, '/views', 'home.html'));
});

app.get('/login', function(req, res){
	res.sendFile(path.join(__dirname, '/views', 'login.html'));
});

app.get('/logout/:id', function(req, res){
  console.log('logout: ' + req.params.id);
  delete users[req.params.id];
	res.redirect('/');
});

app.get('/signup', function(req, res){
	res.sendFile(path.join(__dirname, '/views', 'signup.html'));
});

app.get('/user/:id', function(req, res){
	res.sendFile(path.join(__dirname, '/views', 'user.html'));
});

/**********************
 * Start Application  *
***********************/
//start the application
server.listen(port);
console.log("Server running on 127.0.0.1:" + port);
var messageHistory = [];
var date = new Date();
var taskList = [{
    "TaskId":"123456",
    "TaskName":"Sign Up",
    "Difficulty":"Easy",
    "Points":"2",
    "CreatedOn": date.getDate()  + '/' + (date.getMonth() + 1) + '/' +  date.getFullYear(),
    "Status":"Complete"
  }];
//on successful connection from client to server
io.on('connection', function (socket) {
  for (var i in messageHistory) {
     socket.emit('showMessage', { message: messageHistory[i] } );
  }

  socket.on('logout', function(data){
    var user = data.id;
    var tasks = data.tasks;

    var params = {
      Key: user + "-" + users[user] + ".json",
      Body: JSON.stringify(tasks),
      ContentType: 'application/json',
      ACL: 'public-read'
    };
    s3.putObject(params, function(errBucket, dataBucket) {
      if (errBucket) {
        console.log("Error uploading data: ", errBucket);
      } else {
        console.log("Success uploading data: ", dataBucket);
      }
    });
  });

  socket.on('load', function(data){
    //get task list from s3
    var user = data.username;
    var listId = users[user];
    console.log(listId);

    var params = {
      Key: user + "-" + listId + ".json",
      ResponseContentType : 'application/json'
    };
    s3.getObject(params, function(errBucket, dataBucket) {
      if (errBucket) {
        console.log("Error downloading data: ", errBucket);
      } else {
        console.log("Success downloading data: ", dataBucket);
        taskList = JSON.parse(dataBucket.Body).tasks;
      }
      console.log('user: ' + user + '\n' + JSON.stringify(taskList));
      io.emit('tasks', { username: user, tasks: taskList} );
    });
  });
  //on message send detected, send message to all clients
  socket.on('sendMessage', function(data){
    messageHistory.push(data.message);
    io.emit('showMessage', { message: data.message } );
  });
});

function addNewUser(username, password) {
  var taskListId = Math.round((Math.random() * 1000000));;
  var params = {
    TableName: table,
    Item:{
      "username": username,
      "password": password,
      "taskListId": taskListId,
    }
  };

  console.log("Adding a new user...");
  docClient.put(params, function(err, data) {
    if (err) {
      console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      console.log("Added item:", JSON.stringify(data, null, 2));
    }
  });
}
