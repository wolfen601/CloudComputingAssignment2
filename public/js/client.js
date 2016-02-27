/* Author: Kevin Ho
 * Client side operations in generating the visuals as well as functionality
*/
document.addEventListener("DOMContentLoaded", function() {
   var username = window.location.pathname.match(/\/user\/(.*)$/)[1];
   var socket  = io.connect();
   var tasks;
   socket.emit('load', { username : username });
   //chat send
   var send = document.getElementById('send');
   var sent = false;
   send.onclick = function(){
     sent = true;
     var messageContent = document.getElementById('message');
     var msg = messageContent.value;
     socket.emit('sendMessage', { message: [ username, msg ] });
   };
   //create new task
   var newTaskSubmit = document.getElementById('submitNewTask');
   var newTaskName = document.getElementById('newTaskName');
   var newDifficulty = document.getElementById('newDifficulty');
   newTaskSubmit.onclick = function(){
     var name = newTaskName.value;
     var difficulty = newDifficulty.value;
     if(name == ""){
       alert("No name entered!");
     }else{
       var id = 100000;
       var taken = "";
       do{
         id = Math.round((Math.random() * 1000000));
         taken = checkTaskId(id);
       }while(taken != "");
       alert(id + " : " + name + " : " + difficulty);
       var points = 0;
       if(difficulty == "Easy"){
         points = 2;
       }else if(difficulty == "Medium"){
         points = 5;
       }
       else if(difficulty == "Hard"){
         points = 10;
       }
       var date = new Date();
       var task = {
           "TaskId": id,
           "TaskName": name,
           "Difficulty": difficulty,
           "Points": points,
           "CreatedOn": date.getDate()  + '/' + (date.getMonth() + 1) + '/' +  date.getFullYear(),
           "Status":"Active"
       };
       drawRow(task);
       $('#popupForm').modal('toggle');
       addStatusChanger();
     }
   };
   //logout
   var logout = document.getElementById('logout');
   var loggingOut = false;
   logout.href = "/logout/" + username;
   logout.onclick = function(){
     loggingOut = true;
     var taskList = getTaskListFromTable();
     socket.emit('logout', { id : username , tasks : taskList});
   };
   //SOCKETS
   socket.on('tasks', function(data){
     //alert('user: ' + data.username + '\n' + JSON.stringify(data.tasks) + '\n' + data.tasks.length );
     if(data.username == username){
       var taskList = data.tasks;
       tasks = taskList;
       for (var i = 0; i < taskList.length; i++) {
          drawRow(taskList[i]);
       }
       updateTableColors();
     }
     addStatusChanger();
     loadScores(taskList);
   });
  //show message
  socket.on('showMessage', function(data){
    var noMessage = document.getElementById('nomessages');
    noMessage.style.display = "none";
    var chatWindow = document.getElementById('chatWindow');
    chatWindow.style.display = "block";
    var user = data.message[0];
    var msg = data.message[1];
    //message
    var chat = document.createElement("li");
    chat.className = 'you';
    if(user == username){
      chat.className = 'me';
    }

    var character = document.createElement("b");
    var chrName = document.createTextNode(user);
    character.appendChild(chrName);

    var newMsg = document.createElement("P");
    var text = document.createTextNode("" + msg);
    newMsg.appendChild(text);

    var image = document.createElement("div");
    image.className = "image";

    var img = document.createElement("img");
    img.src = "../img/unnamed.jpg";

    image.appendChild(img);
    image.appendChild(character);

    chat.appendChild(image);
    chat.appendChild(newMsg);
    document.getElementById("chats").appendChild(chat);

    $('#chatWindow').stop().animate({
      scrollTop: $("#chatWindow")[0].scrollHeight
    }, 800);
  });

  function addStatusChanger(){
    var statuses = document.getElementsByClassName('status');
    for (i = 0; i < statuses.length; i++) {
      statuses[i].onclick = function(){
        var currentStatus = this.textContent;
        if(currentStatus == "Complete"){
          currentStatus = "Failed";
        }else if(currentStatus == "Active"){
          currentStatus = "Complete";
        }else if(currentStatus == "Failed"){
          currentStatus = "Active";
        }
        this.textContent = currentStatus;
        updateTableColors();
        var taskList = getTaskListFromTable();
        loadScores(taskList.tasks);
      };
    }
  }
  function updateTableColors(){
    var rows = $("#taskTable").find("tbody>tr");
    for(var i = 0; i < rows.length; i++){
      var row = rows[i];
      var cell = row.cells[row.cells.length-1].textContent;
      if(cell == "Complete"){
        row.className = "success";
      }else if (cell == "Failed") {
        row.className = "danger";
      }else{
        row.className = "default";
      }
    }
  }

  function checkTaskId(id) {
    return tasks.filter(
      function(task) {
        return task.TaskId == id;
      }
    );
  }
  //draw row
  function drawRow(task){
    var row = $("<tr/>");
    $("#tableBody").append(row);
    row.append($("<td>" + task.TaskId + "</td>"));
    row.append($("<td>" + task.TaskName + "</td>"));
    row.append($("<td>" + task.Difficulty + "</td>"));
    row.append($("<td>" + task.Points + "</td>"));
    row.append($("<td>" + task.CreatedOn + "</td>"));
    row.append($("<td class=status>" + task.Status + "</td>"));
  }
  //load scores
  function loadScores(taskList){
    var easyCount = 0;
    var mediumCount = 0;
    var hardCount = 0;
    var points = 0;
    var completedCount = 0;
    var activeCount = 0;
    var failedCount = 0;
    for (var i = 0; i < taskList.length; i++) {
       if(taskList[i].Difficulty == "Easy"){
         easyCount ++;
       }
       if(taskList[i].Difficulty == "Medium"){
         mediumCount ++;
       }
       if(taskList[i].Difficulty == "Hard"){
         hardCount ++;
       }
       if(taskList[i].Status == "Complete"){
         completedCount ++;
         points = points + parseInt(taskList[i].Points);
       }
       if(taskList[i].Status == "Active"){
         activeCount ++;
       }
       if(taskList[i].Status == "Failed"){
         failedCount ++;
       }
    }
    $("#easyTasks").text(easyCount);
    $("#mediumTasks").text(mediumCount);
    $("#hardTasks").text(hardCount);
    $("#numTasks").text((easyCount + mediumCount + hardCount));
    $("#totalPoints").text(points);
    $("#numComplete").text(completedCount);
    $("#numActive").text(activeCount);
    $("#numFailed").text(failedCount);
  }
  function getTaskListFromTable(){
    var myRows = [];
    var headersText = [];
    var $headers = $(".saveName");

    // Loop through grabbing everything
    var $rows = $("tbody tr").each(function(index) {
      $cells = $(this).find("td");
      myRows[index] = {};

      $cells.each(function(cellIndex) {
        // Set the header text
        if(headersText[cellIndex] === undefined) {
          headersText[cellIndex] = $($headers[cellIndex]).text();
        }
        // Update the row object with the header/cell combo
        myRows[index][headersText[cellIndex]] = $(this).text();
      });
    });

    // Let's put this in the object like you want and convert to JSON (Note: jQuery will also do this for you on the Ajax request)
    var myObj = {
        "tasks": myRows
    };
    return myObj;
  }
  //  // main loop, running every 25ms
  //  function mainLoop() {
  //    if(sent == true){
  //      sent = false;
  //
  //    }
  //    if(loggingOut == true){
  //      loggingOut = false;
  //    }
  //    setTimeout(mainLoop, 25);
  //  }
  //  mainLoop();
});
