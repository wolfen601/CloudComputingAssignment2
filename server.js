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
/*******************
 * AWS Initialize  *
*******************/
//configure the aws account information to be used
// aws.config.update({
//   region: "us-west-2",
//   endpoint: "http://localhost:8000"
// });
//
// var docClient = new AWS.DynamoDB.DocumentClient();
//
// var table = "Users";
// var username = "Kevichino";
// var password = "password";
// var taskListId = 100001;
//
// var params = {
//   TableName:table,
//   Item:{
//     "username": username,
//     "password": hash,
//     "taskListId": taskListId,
//   }
// };
//
// console.log("Adding a new item...");
// docClient.put(params, function(err, data) {
//   if (err) {
//     console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
//   } else {
//     console.log("Added item:", JSON.stringify(data, null, 2));
//   }
// });
// //set the desired s3 bucket to use
// var s3 = new aws.S3({
//       params: {Bucket: s3bucket}
// });

/***************
 * Routing     *
***************/
//homepage

app.post('/login', function(req, res){
  console.log(req.body.user.name);
  console.log(req.body.user.passwd);
  //check database
  if(req.body.user.name == "Kevichino" && req.body.user.passwd == "password"){
    res.redirect('/user/' + req.body.user.name);
  }
});

app.post('/signup', function(req, res){
  console.log(req.body.user.name);
  console.log(req.body.user.passwd);
  if(req.body.user.name !== "" && req.body.user.passwd !== ""){
    //check database
    if(req.body.user.name == "Kevichino"){
      console.log('User exists!');
    }else{
      res.redirect('/');
    }
  }else{
    console.log('Nothing Entered!');
  }
});

app.get('/', function(req, res){
	res.sendFile(path.join(__dirname, '/views', 'home.html'));
});

app.get('/login', function(req, res){
	res.sendFile(path.join(__dirname, '/views', 'login.html'));
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
var taskList = [{
    "TaskId":"123456",
    "TaskName":"Task1",
    "Difficulty":"Easy",
    "Points":"2",
    "CreatedOn":"25/02/2016",
    "Status":"Complete"
  },
  {
      "TaskId":"654321",
      "TaskName":"Task2",
      "Difficulty":"Hard",
      "Points":"10",
      "CreatedOn":"25/02/2016",
      "Status":"Active"
    }];
//on successful connection from client to server
io.on('connection', function (socket) {
  for (var i in messageHistory) {
     socket.emit('showMessage', { message: messageHistory[i] } );
  }
  socket.on('load', function(data){
    console.log('user: ' + data.username + '\n' + JSON.stringify(taskList));
    io.emit('tasks', { username: data.username, tasks: taskList } );
  });
  //on message send detected, send message to all clients
  socket.on('sendMessage', function(data){
    messageHistory.push(data.message);
    io.emit('showMessage', { message: data.message } );
  });
});
