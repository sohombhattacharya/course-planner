$(document).ready(function(){
    ("#error").hide(); 
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
              console.log('POST complete');
            },

            success: function(data) {
                console.log(data);
                console.log('process sucess');
                if (data.nickname && data.username && data.userID && data.courses && data.tasks)
                    window.location.replace("/home");
                else if (data.error){
                    //NEED TO FINISH ERROR HANDLING!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                }
           },

            error: function() {
              console.log('POST error');
            },
          });        
    });
    
    $("#createAccountButton").click(function(){
        var username = $("#username").val();
        var pwd = $("#pwd").val(); 
        var nickname = $("#nickname").val(); 
        console.log(nickname); 
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
              console.log('POST complete');
            },

            success: function(data) {
              console.log(data);
              console.log('process sucess');
                window.location.replace("/home");
            
           },

            error: function() {
              console.log('POST error');
            },
          });        
    });    
});