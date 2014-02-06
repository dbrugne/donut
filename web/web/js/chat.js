var GUI = function() {

    var Chat;
    var focusRoom = '';

    var Joined = [];
    var Names  = {};

    /**
     * Interface initialization
     */
    var status = function() {
        var btnStatus;

        return {
            init: function() {
                btnStatus = $('#status');
            },
            update: function(status) {
                btnStatus.removeClass().addClass('btn').addClass('btn btn-xs');
                switch (status) {
                    case 'online':
                        btnStatus.addClass('btn-success').html('Online');
                        break;
                    case 'connecting':
                        btnStatus.addClass('btn-warning').html('Connecting');
                        break;
                    case 'offline':
                        btnStatus.addClass('btn-inverse').html('Offline');
                        break;
                    case 'error':
                        btnStatus.addClass('btn-danger').html('Offline');
                        break;
                }
            }
        }
    }();
    status.init();
    status.update('connecting');

    $(function() {
        $('.sendMessage').click(function() {
            Chat.send(Joined[0], 'test test test');
        });

        Chat  = new ChatRoom(true);

        $(Chat).bind('connect', function(e) {
            status.update('online');

            // Get rooms list
            //Chat.getUserRooms("test", function(id, display) {
            //});

            Chat.create('Test', function(id, display) {
                Chat.join(id);
                Joined.push(id);
            });
        });

        $(Chat).bind('close', function(e) {
            status.update('offline');
        });

        $(Chat).bind('message', function(e, room, from, msg, time) {
            var message = { "id" : 1212, "date" : time, "username": from, "text": msg };
            chatAddMessage(message);
        });

        $(Chat).bind('openRoom', function(e, roomId, roomName) {
        });

        $(Chat).bind('closeRoom', function(e, room) {
        });

        $(Chat).bind('leftRoom', function(e, room, id) {
        });

        $(Chat).bind('joinRoom', function(e, room, id, name) {
        });
    });

}();

var chatScrollDown = function (e) {
    // certain browsers have a bug such that scrollHeight is too small
    // when content does not fill the client area of the element
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
    $(".messages").append(htmlCode);
    $(".messages").each( function() { chatScrollDown(this); });
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
