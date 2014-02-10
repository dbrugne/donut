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

    /**
     * IHM function
     */
    function roomListAddRoom(id, name) {
        if (focusRoom == '') {
            focusRoom = id;
        }

        if (focusRoom == id) {
            var focusClass = 'active';
        } else {
            var focusClass = '';
        }

        var html = '<a href="#" class="list-group-item room-item '+focusClass+'" data-room-id="'+id+'">'+name+'</a>';
        $('#rooms-list .default').remove();
        $('#rooms-list').append(html);
    }

    function roomListRemoveRoom(id) {

    }

    function roomListNewMessageInRoom(id, num) {
        var badges = $(('.room-item[data-room-id="'+id+'"] > .badge'));
        if (badges.length == 0) {
            var html = '<span class="badge">'+num+'</span> ';
            $('.room-item[data-room-id="'+id+'"]').prepend(html);
            return;
        }

        badges.first( function () {
            var current = this.first().val();
            current ++;
            this.first().val(current);
        });
    }

    function userListCreate(id) {
        if (focusRoom == '') {
            focusRoom = id;
        }

        if (focusRoom == id) {
            var focusClass = 'block';
        } else {
            var focusClass = 'none';
        }

        var html = '';
        html += '<div class="panel panel-default users-list" data-room-id="'+id+'" style="display: '+focusClass+';">';
        html += '   <div class="panel-heading">Users</div>';
        html += '   <div class="list-group"></div>';
        html += '</div>';
        $(".users-list[data-room-id='default']").hide();
        $("#users").append(html);
    }

    function userListAddUser(id, user) {
        var html = '<a href="#" class="list-group-item user-item" data-user-id="'+user.id+'">'+user.username+'</a>';
        $(".users-list[data-room-id='"+id+"'] > .list-group").append(html);
    }

    function userListRemoveUser(id) {

    }

    function userListRemove(id) {

    }

    function roomContainerCreate(id, name, topic) {
        if (focusRoom == '') {
            focusRoom = id;
        }

        if (focusRoom == id) {
            var focusClass = 'flex';
        } else {
            var focusClass = 'none';
        }

        var html = '';
        html += '<div class="room-container" data-room-id="'+id+'" style="display: '+focusClass+';">';
        html += '    <section class="topic"><span class="name">'+name+'</span> '+topic+'</section>';
        html += '    <section class="messages"></section>';
        html += '    <section class="postbox">';
        html += '        <a name="post"></a>';
        html += '        <div class="row">';
        html += '            <div class="col-lg-1"><p class="text-center"><img src="/img/smiley-icon.png" width="29px" /></p></div>';
        html += '            <div class="col-lg-11">';
        html += '                <div class="input-group">';
        html += '                    <input type="text" name="message" class="form-control input-message" data-room-id="'+id+'" />';
        html += '                    <span class="input-group-btn">';
        html += '                        <button type="button" class="btn btn-default send-message" data-room-id="'+id+'">Send!</button>';
        html += '                    </span>';
        html += '                </div>';
        html += '            </div>';
        html += '        </div>';
        html += '    </section>';
        html += '</div>';

        $(".room-container[data-room-id='default']").hide();
        $('#main').append(html);
    }

    function roomContainerRemove(id) {

    }

    function roomContainerAddMessage(id, user_id, username, time, message) {
        var html = '<p><span class="date">'+time+'</span> <span class="username">&lt;'+username+'&gt;</span> <span class="text">'+message+'</span></p>';
        $(".room-container[data-room-id='"+id+"'] > .messages").append(html);
    }

    function roomContainerChangeTopic(id) {

    }

    /**
     * Inteface action binding
     */
//    $(function() {

        var postMessageCallback = function (e) {
            var roomId = $(e).data('roomId');
            var message = $('.input-message[data-room-id='+roomId+']').val();
            if (message == '') {
                return;
            }
            // Send to server
            Chat.send(roomId, message);
            // Empty the field
            $('.input-message[data-room-id='+roomId+']').val('');
        };

        $(document).on('keypress', '.input-message', function (e) {
            if(e.which == 13) {
                postMessageCallback(this);
            }
        });
        $(document).on('click', '.send-message', function () {
              postMessageCallback(this);
//            var roomId = $(this).data('roomId');
//            var message = $('.input-message[data-room-id='+roomId+']').val();
//            if (message == '') {
//                return;
//            }
//
//            // Send to server
//            Chat.send(roomId, message);
//
//            // Empty the field
//            $('.input-message[data-room-id='+roomId+']').val('');
//
////            return false;
        });

//    });

    /**
     * Transport layer initialization
     */
    $(function() {

//        // TEST
//        $('.sendMessage').click(function() {
//            Chat.send(Joined[0], 'test test test');
//        });
//        // TEST

        Chat  = new ChatRoom(true);

        $(Chat).bind('connect', function(e) {
            status.update('online');

            // Once the WebSocket is opened, retrieve user room list
            Chat.getUserRooms(function(roomList) {
                $.each( roomList, function( i, room ){
                    // subscribe (and get name, topic and user list in return)
                    Chat.join(room.topic, function(roomData) {
                        //alert(roomData);
                    });
                });
            });
        });

        $(Chat).bind('close', function(e) {
            status.update('offline');
        });

        $(Chat).bind('message', function(jQevent, topic, username, message, time) {
            var roomId = topic.replace('ws://chat.local/room#', '');
            roomContainerAddMessage(roomId, '1', username, time, message);
            roomListNewMessageInRoom(roomId, '1');
        });

        $(Chat).bind('openRoom', function(e, roomId, roomName) {
        });

        $(Chat).bind('closeRoom', function(e, room) {
        });

        $(Chat).bind('leftRoom', function(e, room, id) {
        });

        $(Chat).bind('roomData', function(jQevent, data) {
            // Already in the room? (on this page)
            if (-1 !== $.inArray(data.id, Joined)) {
                alert('Already in the room: '+data.id);
                return false;
            }

            // Add room in rooms-list
            roomListAddRoom(data.id, data.name);
            // Create room-container
            roomContainerCreate(data.id, data.name, data.topic);
            // Create users-list
            userListCreate(data.id);

            // Subscribe to room
            Chat.join(data.id);

            // Add in Joined array
            Joined.push(data.id);
        });

        $(Chat).bind('roomUsers', function(jQevent, data) {
            $(data.users).each(function () {
               userListAddUser(data.roomId, this);
            });
        });
    });

}();

/**
 * $("#messages").each( function() { chatScrollDown(this); });
 * @param e
 */
var chatScrollDown = function (e) {
    // certain browsers have a bug such that scrollHeight is too small
    // when content does not fill the client area of the element
    var scrollHeight = Math.max(e.scrollHeight, e.clientHeight);
    e.scrollTop = scrollHeight - e.clientHeight;
}

