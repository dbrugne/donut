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
        $('.room-container[data-room-id="'+roomId+'"]').fadeIn(400);

        // User list
        $( ".users-list" ).hide();
        $('.users-list[data-room-id="'+roomId+'"]').fadeIn(400);

        // Remove un-read message badge
        $('.room-item[data-room-id="'+roomId+'"] > .badge').fadeOut(400, function () {
            $('.room-item[data-room-id="'+roomId+'"] > .badge').remove();
        });
    }

    function scrollDown(e) {
        $(".messages").scrollTop(100000);
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

        var html = '<a href="#" class="user-item" data-user-id="'+user.id+'">'+user.username+'</a>';
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
        var dateText = $.format.date(new Date(), "HH:mm:ss");
        var html = '<p class="'+type+'"><span class="date">['+dateText+']</span> <span class="text">'+message+'</span></p>';
        $(".room-container[data-room-id='"+roomId+"'] > .messages").append(html);
        scrollDown($(".room-container[data-room-id='"+roomId+"'] > .messages"));
    }

    function roomContainerAddMessage(roomId, message) {
        var dateText = $.format.date(new Date(message.time*1000), "HH:mm:ss");
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

    /*****************************************************
     * Chat re-usable functions
     *****************************************************/
    // Current user joins a room
    function joinRoom(roomId) {
        // Test if this room is already loaded in this browser page
        if (-1 !== $.inArray(parseInt(roomId), Joined)) {
            Debug('Room already opened (joinRoom): '+roomId);
            focusOnRoom(roomId);
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

        $(window).on('beforeunload', function() {
            // only if at list one room is open
            if (Joined.length > 0) {
                // prevent user leave the page un-intentionnaly
                return "If you leave this page all the chatroom history will be lost.";
            }
        });

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
            if ($('#create-room-form').is(':visible')) {
                $('#create-room-form').hide();
            } else {
                $('#create-room-form').show();
                $('#create-room-name').focus();
            }
        });

        $('#create-room-cancel').click(function() {
            $('#create-room-name').val('');
            $('#create-room-form').hide();
        });

        var submitCreateRoomForm = function () {
            var roomName = $('#create-room-name').val();
            if ('' == roomName) {
                return;
            }

            ChatServer.create(roomName, function(room) {
                joinRoom(room.id);
            });

            $('#create-room-name').val('');
            $('#create-room-form').hide();
        }
        $(document).on('click', '#create-room-submit', submitCreateRoomForm);
        $(document).on('keypress', '#create-room-name', function (e) {
            if(e.which == 13) {
                submitCreateRoomForm();
            }
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

        $("#search-room-link").click(function () {
            $("#room-search-modal").modal();
        });

        var searchRoomsCallback = function() {
            var inputModal = $("#room-search-modal").find(".room-search-input").first();
            var search = inputModal.val();
            if ('' == search) {
                return;
            }
            ChatServer.searchForRooms(search, function(roomList) {
                var ul =  $("#room-search-modal").find("ul.rooms-list").first();

                // Empty list
                $(ul).children('li').remove();

                // No result
                if (roomList.length < 1) {
                    var html = '<li><span class="no-result">No result</span></li>';
                    $(ul).append(html);
                }

                // Fill list with result
                $(roomList).each(function() {
                    var roomId = this.id;
                    var html = '<li class="list-group-item search-room-item" data-room-id="'+roomId+'"><h4 class="list-group-item-heading">'+this.name+'</h4> <p class="list-group-item-text">'+this.baseline+'</p></li>';
                    $(ul).append(html);

                    $(ul).find("li.search-room-item[data-room-id='"+roomId+"']").first().click(function() {
                        joinRoom(roomId);
                        $("#room-search-modal").modal('hide');
                    });
                });
            });
        };

        $("#room-search-modal").find(".room-search-submit").first().click(searchRoomsCallback);
        $("#room-search-modal").find(".room-search-input").first().keyup(searchRoomsCallback);

    });

    /*****************************************************
     * Transport layer
     *****************************************************/
    $(function() {

        ChatServer = new ChatServerPrototype(true);

        $(ChatServer).bind('connect', function(e) {
            status.update('online');

            // Retrieve rooms the user is in (maybe in other devices or browsers)
            ChatServer.userIsInRooms(function(roomList) {
                $.each( roomList, function( i, room ){
                    joinRoom(room.room_id);
                });
            });

            // Try to detect if a room was submitted in the URL (when user come from home for example)
            if(window.location.hash)
            {
                // Hash found
                var hash = window.location.hash.substring(1); // Puts hash in variable, and removes the # character
                var roomId = parseInt(hash.replace('room=', ''));
                joinRoom(roomId);
            }
        });

        $(ChatServer).bind('close', function(e) {
            status.update('offline');

            // To be sure that client will re-subscribe to any topic after re-connection
            Joined = [];
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

        $(ChatServer).bind('joinRoomFromOtherDevice', function(jQevent, data) {
            joinRoom(data.room_id);
        });

        $(ChatServer).bind('leaveRoomFromOtherDevice', function(jQevent, data) {
            leaveRoom(data.room_id);
        });

        $(ChatServer).bind('message', function(jQevent, roomId, data) {
            roomContainerAddMessage(roomId, data);
            if (focusRoom != roomId) {
                roomListNewMessageInRoom(roomId, 1);
            }
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

