$(document).ready(function(){
    
    $(".modal").on("hidden.bs.modal", function(){
        $(".modal-login-error").html("");
        $(".modal-create-account-error").html("");
        
    });
    
    $("#loginButton").click(function(){
        $("#errorMessageLogin").text(""); 
        var username = $("#usernameLogin").val();
        var pwd = $("#pwdLogin").val(); 
        console.log(username); 
        console.log(pwd); 
          $.ajax({
            url: "/api/login",
            type: "POST",
            data: {username: username, password: pwd},
            cache: false,
            timeout: 5000,
            complete: function() {
              console.log('POST complete');
            },
            success: function(data) {
                console.log('process sucsess');
                if (data.nickname && data.username && data.userID && data.courses && data.tasks)
                    window.location.replace("/home");
                else
                    $("#errorMessageLogin").text(data.error);     
            },
            error: function() {
                $("#errorMessageLogin").text("login call to server resulted in error, please try again");                 
            },
          });        
    });
    
    $("#createAccountButton").click(function(){
        $("#errorMessageCreateAccount").text(""); 
        var username = $("#usernameCreate").val();
        var pwd = $("#pwdCreate").val();
        var nickname = $("#nicknameCreate").val(); 
        console.log(username); 
        console.log(pwd); 
        console.log(nickname); 
          $.ajax({
            url: "/api/createAccount",
            type: "POST",
            data: {username: username, password: pwd, nickname: nickname},
            cache: false,
            timeout: 5000,
            complete: function() {
              console.log('POST complete');
            },
            success: function(data) {
                console.log('process success');
                if (data.nickname && data.username && data.userID && data.courses && data.tasks)
                    window.location.replace("/home");
                else
                    $("#errorMessageCreateAccount").text(data.error);     
            },
            error: function() {
                $("#errorMessageCreateAccount").text("create-account call to server resulted in error, please try again");                 
            },
          });        
    });    
});