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



var chatScrollDown = function (e) {
    // certain browsers have a bug such that scrollHeight is too small
    // when content does not fill the client area of the element
    console.log(e);
    var scrollHeight = Math.max(e.scrollHeight, e.clientHeight);
    e.scrollTop = scrollHeight - e.clientHeight;
}

/**
 * DOM manipulation
 */

var message = { "id" : 1212, "date" : "19:47:39", "username": "yangs_", "text": "oui, mais pas tout le temps." };
var user = { "id" : 456, "username": "néné", "op": false, "friend": true };

var chatAddMessage = function (message) {
    /**
     * Input:
     *   message = {
     *     id,
     *     date,
     *     username,
     *     text,
     *   }
     *
     * Output:
     *    <p><span class="date">[19:47:39]</span> <span class="username">&lt;albou&gt;</span> <span class="text">oui, mais pas tout le temps.</span></p>
     */

    var htmlCode = "<p data-message-id='"+message.id+"'><span class='date'>["+message.date+"]</span> <span class='username'>&lt;"+message.username+"&gt;</span> <span class='text'>"+message.text+"</span></p>";
    $("#messages").append(htmlCode);

    $("#messages").each( function() { chatScrollDown(this); });
}

var chatRemoveMessage = function (messageid) {
    $('[data-message-id="'+messageid+'"]').remove();
    $("#messages").each( function() { chatScrollDown(this); });
}

var chatAddUser = function (user) {
    /**
     * Input:
     *   user = {
     *     id,
     *     username,
     *     op,
     *     friend,
     *   }
     *
     * Output:
     *    <li class="op">Pomf</li>
     */
    var specialClasses = '';
    if (user.op == true) specialClasses += ' op';
    if (user.friend == true) specialClasses += ' friend';
    var htmlCode = "<li data-user-id='"+user.id+"' class='"+specialClasses+"'>"+user.username+"</li>";
    $("#users > ul").append(htmlCode);
}

var chatRemoveUser = function (userid) {
    $('[data-user-id="'+userid+'"]').remove();
}
