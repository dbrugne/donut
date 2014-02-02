var reloadTime = 1000;
var scrollBar = false;

var postMessage = function() {
    var msg = $('#message').val();
    if (msg == "") {
        alert("Empty message. Coquinou!");
        return;
    }

    $.ajax({
        type: "POST",
        url: '/post',
        data: "message="+msg,
        success: function(r) {
            $("#message").val('');
        }
    });
};

var upCall = function () {
    $.getJSON('/up', function(data) {
        if(data['error'] == '0') {

            $('#chatHeader').empty();
            $('#chatHeader').val("TF1 - "+data.topic);

            $('#users').empty();
            $.each( data.members, function( i, member ) {
                $('#users').append("<li>"+member.username+" ("+member.status+")</li>");
            });

            $('#text').empty();
            $.each( data.messages, function( i, message ) {
                $('#text').append("<div><strong>"+message.username+":</strong> "+message.message+"</li>");
            });
        }
    });
}