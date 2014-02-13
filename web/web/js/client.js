var ChatClient = function(optDebug) {

    var ChatServer;
    var focusRoom = '';

    var Joined = [];
    var Names  = {};

    if (undefined == optDebug || '' == optDebug) {
        optDebug = false;
    }
    var debug = optDebug;
    var Debug = function(msg) {
        if (debug) {
            console.log(msg);
        }
    }

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

    function setRoomBaseline(roomId, data)
    {
        var baseline = data.baseline;
        if ('' == baseline) {
            baseline = "&nbsp;";
        }
        $(".room-container[data-room-id='"+roomId+"']").find('.baseline').html(baseline);

        if (undefined == data.notify || data.notify == true) {
            if (undefined == data.username) {
                data.username = '???';
            }
            roomContainerAddApplicationMessage(roomId, 'info', "Channel topic was changed by <strong>"+data.username+"</strong> to: <em>"+baseline+"</em>");
        }
    }

    function availableRoomsAddRoom(room)
    {
        var newRoomItem = $(".available-room-item[data-room-id='template']").clone(false);
        newRoomItem.attr('data-room-id', room.id);
        newRoomItem.html(room.name);
        newRoomItem.css('display', 'block');
        newRoomItem.click(function() {
            joinRoom(room.id);
        });
        $("#available-rooms-list").append(newRoomItem);
    }

    /*****************************************************
     * Chat re-usable functions
     *****************************************************/
    // Current user joins a room
    function joinRoom(roomId) {
        // Test if this room is already loaded in this browser page
        if (-1 !== $.inArray(roomId, Joined)) {
            Debug('Already in the room: '+roomId);
            return false;
        }

        // Subscribe to room
        ChatServer.subscribe(roomId);

        // Register room in already-opened-rooms list
        Joined.push(parseInt(roomId));
        // parseInt(): to avoid a "type"-bug when searching for this value
    }

    // Current user leaves a room
    function leaveRoom(roomId) {
        // Subscribe to room
        ChatServer.unsubscribe(roomId);

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
            ChatServer.send(roomId, message);
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
            leaveRoom(roomId);
        });

        $('#create-room-toggle').click(function() {
            $('#create-room-form').toggle();
        });

        $('#create-room-submit').click(function() {
            var roomName = $('#create-room-name').val();
            if ('' == roomName) {
                return;
            }

            ChatServer.create(roomName, function(room) {
                joinRoom(room.id);
            });

            $('#create-room-name').val('');
            $('#create-room-form').toggle();
        });

        $(document).on('click', '.room-baseline-text', function () {
            if (undefined == focusRoom || '' == focusRoom) {
                return;
            }
            var roomHeader = $(".room-container[data-room-id='"+focusRoom+"'] > .header");

            roomHeader.find('.room-baseline-text').hide();
            roomHeader.find('.room-baseline-form').show();
            var currentBaseline = $(".room-container[data-room-id='"+focusRoom+"']").find('.baseline').html();
            if ('&nbsp;' == currentBaseline) {
                currentBaseline = '';
            }
            roomHeader.find('.room-baseline-input').val(currentBaseline);
            roomHeader.find('.room-baseline-input').focus();
        });

        var changeBaselineCallback = function () {
            if (undefined == focusRoom || '' == focusRoom) {
                return;
            }
            var roomHeader = $(".room-container[data-room-id='"+focusRoom+"'] > .header");
            var baseline = roomHeader.find('.room-baseline-input').val();

            // save
            ChatServer.changeBaseline(focusRoom, baseline);

            roomHeader.find('.room-baseline-form').hide();
            roomHeader.find('.room-baseline-text').show();
            roomHeader.find('.room-baseline-input').val('');
        };

        $(document).on('click', '.room-baseline-submit', changeBaselineCallback);
        $(document).on('keypress', '.room-baseline-input', function (e) {
            if(e.which == 13) {
                changeBaselineCallback();
            }
        });

        $(document).on('click', '.room-baseline-cancel', function () {
            if (undefined == focusRoom || '' == focusRoom) {
                return;
            }

            var roomHeader = $(".room-container[data-room-id='"+focusRoom+"'] > .header");
            roomHeader.find('.room-baseline-form').hide();
            roomHeader.find('.room-baseline-text').show();
            roomHeader.find('.room-baseline-input').val('');
        });

    });

    /*****************************************************
     * Transport layer
     *****************************************************/
    $(function() {

        ChatServer = new ChatServerPrototype(true);

        $(ChatServer).bind('connect', function(e) {
            status.update('online');

            // @todo : should fire the RPC call to "re-open" existing session (= user room list)

            // Retrieve available rooms
            ChatServer.availableRooms(function(roomList) {
                $.each( roomList, function( i, room ){
                    availableRoomsAddRoom(room);
                });
            });
        });

        $(ChatServer).bind('close', function(e) {
            status.update('offline');
        });

        // When subscribe a room topic this "event" is send by server
        $(ChatServer).bind('enterInRoom', function(jQevent, roomId, data) {
            createRoomIhm(roomId, data.name);
        });

        // When server indicate that someone enter in the room
        $(ChatServer).bind('userInRoom', function(jQevent, roomId, data) {
            userListAddUser(roomId, data);
        });

        // When server indicate that someone leave the room
        $(ChatServer).bind('userOutRoom', function(jQevent, roomId, data) {
            userListRemoveUser(roomId, data);
        });

        $(ChatServer).bind('roomBaseline', function(jQevent, roomId, data) {
            setRoomBaseline(roomId, data);
        });

        $(ChatServer).bind('message', function(jQevent, roomId, data) {
            roomContainerAddMessage(roomId, data);
            roomListNewMessageInRoom(roomId, 1);
        });
    });

    /*****************************************************
     * Stub code
     *****************************************************/
    // TEST
    $("#test1").click(function () {

    });
    $("#test2").click(function () {

    });
    $("#test3").click(function () {

    });
    // TEST

}(true);

