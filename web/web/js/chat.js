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
        focusOnRoom(roomId);
    }

    function removeRoomIhm(roomId) {
        $(".room-item[data-room-id='"+roomId+"']").remove();
        $(".room-container[data-room-id='"+roomId+"']").remove();
        $(".users-list[data-room-id='"+roomId+"']").remove();

        // If it was the last room open show() default
        if (1 > $(".room-item[data-room-id!='default'][data-room-id!='template']").length) {
            // Show default elements
            $("[data-room-id='default']").show();
        } else {
            // At least one open room remain, we focus on it
            focusOnRoom();
        }
    }

    function focusOnRoom(roomId) {
        // If roomId is null focus the first opened room
        if (roomId == undefined) {
            roomId = $( ".room-item[data-room-id!='default'][data-room-id!='template']").first().data('roomId');
        }

        focusRoom = roomId;

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

    function roomListNewMessageInRoom(roomId, num) {
        var badges = $(('.room-item[data-room-id="'+roomId+'"] > .badge'));
        if (badges.length == 0) {
            var html = '<span class="badge">0</span> ';
            $('.room-item[data-room-id="'+roomId+'"]').prepend(html);
        }

        var current = parseInt($(('.room-item[data-room-id="'+roomId+'"] > .badge')).html(), 10);
        current += num;
        $(('.room-item[data-room-id="'+roomId+'"] > .badge')).html(current);
    }

    function userListAddUser(roomId, user) {
        // Check that user is not already in DOM
        if ($(".users-list[data-room-id='"+roomId+"']").find(".user-item[data-user-id='"+user.id+"']").length > 0){
            return;
        }

        var html = '<a href="#" class="list-group-item user-item" data-user-id="'+user.id+'">'+user.username+'</a>';
        $(".users-list[data-room-id='"+roomId+"'] > .list-group").append(html);

        userListSort(roomId);

        if (undefined == user.notify || user.notify == true) {
            roomContainerAddApplicationMessage(roomId, 'info', "User <strong>"+user.username+"</strong> has joined the room");
        }
    }

    function userListSort(roomId) {
        var list = $(".users-list[data-room-id='"+roomId+"'] > .list-group");
        var items = $('a', list);

        items.sort(function(a, b) {
            var keyA = $(a).text();
            var keyB = $(b).text();
            return (keyA > keyB) ? 1 : 0;
        });

        $.each(items, function(index, row) {
            list.append(row);
        });
    }

    function userListRemoveUser(roomId, user) {
        $(".users-list[data-room-id='"+roomId+"']").find(".user-item[data-user-id='"+user.id+"']").remove();
        roomContainerAddApplicationMessage(roomId, 'info', "User <strong>"+user.username+"</strong> has left the room");
    }

    function roomContainerAddApplicationMessage(roomId, type, message) {
        var date = new Date();
        var dateText = date.getHours()+':'+date.getMinutes()+':'+date.getSeconds();
        var html = '<p class="'+type+'"><span class="date">['+dateText+']</span> <span class="text">'+message+'</span></p>';
        $(".room-container[data-room-id='"+roomId+"'] > .messages").append(html);
        scrollDown($(".room-container[data-room-id='"+roomId+"'] > .messages"));
    }

    function roomContainerAddMessage(roomId, message) {
        var date = new Date(message.time * 1000);
        var dateText = date.getHours()+':'+date.getMinutes()+':'+date.getSeconds();
        var html = '<p data-user-id="'+message.user_id+'"><span class="date">['+dateText+']</span> <span class="username">&lt;'+message.username+'&gt;</span> <span class="text">'+message.message+'</span></p>';
        $(".room-container[data-room-id='"+roomId+"'] > .messages").append(html);
        scrollDown($(".room-container[data-room-id='"+roomId+"'] > .messages"));
    }

    function setRoomTitle(roomId, topic)
    {
        $(".room-container[data-room-id='"+roomId+"']").find('.topic').html(topic);
    }

    /*****************************************************
     * Chat re-usable functions
     *****************************************************/
    // Current user joins a room
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

    // Current user leaves a room
    function leaveRoom(roomId) {
        // Test if this room is already loaded in this browser page
        if (-1 === $.inArray(roomId, Joined)) {
            console.log('Not in the room: '+roomId);
            return false;
        }

        // Subscribe to room
        Chat.unsubscribe(roomId);

        // IHM
        removeRoomIhm(roomId);

        // Un-register room in already-opened-rooms list
        delete Joined[$.inArray(roomId, Joined)];
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

        $(document).on('click', '.close', function () {
            var roomId = $(this).closest(".room-container").data('roomId');
            console.log(roomId);
            leaveRoom(roomId);
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

        // When subscribe a room topic this "event" is send by server
        $(Chat).bind('enterInRoom', function(jQevent, roomId, data) {
            createRoomIhm(roomId, data.name);
        });

        // When server indicate that someone enter in the room
        $(Chat).bind('userInRoom', function(jQevent, roomId, data) {
            userListAddUser(roomId, data);
        });

        // When server indicate that someone leave the room
        $(Chat).bind('userOutRoom', function(jQevent, roomId, data) {
            userListRemoveUser(roomId, data);
        });

        $(Chat).bind('roomTitle', function(jQevent, roomId, data) {
            setRoomTitle(roomId, data);
        });

        $(Chat).bind('message', function(jQevent, roomId, data) {
            roomContainerAddMessage(roomId, data);
            roomListNewMessageInRoom(roomId, 1);
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

