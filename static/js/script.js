$(document).ready(function(){
    $("#loginButton").click(function(){
        var username = $("#username").val();
        var pwd = $("#pwd").val(); 
        console.log(username); 
        console.log(pwd); 
          $.ajax({
            url: "/api/login",
            type: "POST",
            data: {username: username, password: pwd},
            cache: false,
            timeout: 5000,
            complete: function() {
              //called when complete
              console.log('process complete');
            },

            success: function(data) {
              console.log(data);
              console.log('process sucess');
           },

            error: function() {
              console.log('process error');
            },
          });        
    });
});