var GUI = function() {

    var Chat;
    var focusRoom = '';

    var Joined = [];
    var Names  = {};

    /****************************************************
     * Interface initialization
     ****************************************************/
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

    /****************************************************
     * Interface re-usable functions
     ****************************************************/
    function createRoomIhm(roomId, roomName) {
        // If no already focused room
        if (focusRoom == '') {
            focusRoom = roomId;
        }

        // Test if elements for this room are already in the DOM
        if ($(".room-item[data-room-id='"+roomId+"']").length > 0){
            return;
        }

        // Hide default elements
        $("[data-room-id='default']").hide();

        // Create room in rooms-list
        var newRoomItem = $(".room-item[data-room-id='template']").clone(false);
        newRoomItem.attr('data-room-id', roomId);
        newRoomItem.html(roomName);
        newRoomItem.css('display', 'block');
        newRoomItem.click(function() {
            focusOnRoom(roomId);
        });
        $("#rooms-list").append(newRoomItem);

        // Create room-container
        var newRoomContainer = $(".room-container[data-room-id='template']").clone(false);
        newRoomContainer.attr('data-room-id', roomId);
        newRoomContainer.find('.name').html(roomName);
        newRoomContainer.find('.input-message').attr('data-room-id', roomId);
        newRoomContainer.find('.send-message').attr('data-room-id', roomId);
        $("#main").append(newRoomContainer);

        // Create room users-list
        var newUsersList = $(".users-list[data-room-id='template']").clone(false);
        newUsersList.attr('data-room-id', roomId);
        $("#users").append(newUsersList);

        // Active this new room (if needed)
        if (focusRoom == roomId) {
            focusOnRoom(roomId);
        }
    }

    function focusOnRoom(roomId) {
        // Room list
        $( ".room-item").removeClass('active');
        $('.room-item[data-room-id="'+roomId+'"]').addClass('active');

        // Room content
        $( ".room-container" ).hide();
        $('.room-container[data-room-id="'+roomId+'"]').show();

        // User list
        $( ".users-list" ).hide();
        $('.users-list[data-room-id="'+roomId+'"]').show();
    }

    function scrollDown(e) {
        // certain browsers have a bug such that scrollHeight is too small
        // when content does not fill the client area of the element
        var scrollHeight = Math.max(e.scrollHeight, e.clientHeight);
        e.scrollTop = scrollHeight - e.clientHeight;
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

    function userListAddUser(roomId, user) {
        // Check that user is not already in DOM
        if ($(".users-list[data-room-id='"+roomId+"']").find(".user-item[data-user-id='"+user.id+"']").length > 0){
            return;
        }

        // @todo : Order alphabetically

        var html = '<a href="#" class="list-group-item user-item" data-user-id="'+user.id+'">'+user.username+'</a>';
        $(".users-list[data-room-id='"+roomId+"'] > .list-group").append(html);
    }

    function roomContainerAddMessage(id, user_id, username, time, message) {
        var date = new Date(time * 1000);
        var dateText = date.getHours()+':'+date.getMinutes()+':'+date.getSeconds();
        var html = '<p><span class="date">['+dateText+']</span> <span class="username">&lt;'+username+'&gt;</span> <span class="text">'+message+'</span></p>';
        $(".room-container[data-room-id='"+id+"'] > .messages").append(html);
        scrollDown($(".room-container[data-room-id='"+id+"'] > .messages"));
    }

    function setRoomTitle(roomId, topic)
    {
        $(".room-container[data-room-id='"+roomId+"']").find('.topic').html(topic);
    }

    /*****************************************************
     * Chat re-usable functions
     *****************************************************/
    // Current user join a room
    function joinRoom(roomId) {
        // Test if this room is already loaded in this browser page
        if (-1 !== $.inArray(roomId, Joined)) {
            console.log('Already in the room: '+roomId);
            return false;
        }

        // Subscribe to room
        Chat.subscribe(roomId);

        // Register room in already-opened-rooms list
        Joined.push(roomId);
    }

    /*****************************************************
     * Interface binding
     *****************************************************/
    $(function() {

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
        });

    });

    /*****************************************************
     * Transport layer
     *****************************************************/
    $(function() {

        Chat  = new ChatRoom(true);

        $(Chat).bind('connect', function(e) {
            status.update('online');

            // @todo : should fire the RPC call to "re-open" existing session (= user room list)
        });

        $(Chat).bind('close', function(e) {
            status.update('offline');
        });

        // When subscribe a room topic this "event" is send by server on control topic
        $(Chat).bind('enterInRoom', function(jQevent, data) {
            // Create room DOM element
            createRoomIhm(data.id, data.name, data.topic);
        });

        // When subscribe a room topic this "event" is send by server on control topic for  each room user
        $(Chat).bind('userInRoom', function(jQevent, data) {
            userListAddUser('1', data);
        });

        $(Chat).bind('roomTitle', function(jQevent, data) {
            setRoomTitle('1', data);
        });

        $(Chat).bind('message', function(jQevent, topic, username, message, time) {
            var roomId = topic.replace('ws://chat.local/room#', '');
            roomContainerAddMessage(roomId, '1', username, time, message);
            roomListNewMessageInRoom(roomId, '1');
        });
    });

    /*****************************************************
     * Stub code
     *****************************************************/
    // TEST
    $("#test1").click(function () {
        // Enter in ROOM 1
        joinRoom(1);
    });
    $("#test2").click(function () {
        // Enter in ROOM 2
        joinRoom(2);
    });
    $("#test3").click(function () {
        // Enter in ROOM 3
        joinRoom(3);
    });
    // TEST

}();

