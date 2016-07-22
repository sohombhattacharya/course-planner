$(document).ready(function(){
    $("#loginButton").click(function(){
        $.post("http://localhost:3000/api/login",
        {
          username: "sohom95",
          password: "test123"
        },
        function(data,status){
            alert("Data: " + data + "\nStatus: " + status);
        });
    });
});