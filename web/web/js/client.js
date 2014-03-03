var ChatClient = function(optDebug) {

    var ChatServer;
    var openedWindows = [];
    var focusedWindow = '';

    if (undefined == optDebug || '' == optDebug) {
        optDebug = false;
    }
    var debug = optDebug;
    var Debug = function(msg) {
        if (debug) {
            console.log(msg);
        }
    }

    Array.prototype.remove = function(from, to) {
        var rest = this.slice((to || from) + 1 || this.length);
        this.length = from < 0 ? this.length + from : from;
        return this.push.apply(this, rest);
    };

    var smileys = [
        { label: 'smile', class: 'emoticon-smile', symbol: ":)" },
        { label: 'grin', class: 'emoticon-grin', symbol: ":D" },
        { label: 'joy', class: 'emoticon-joy', symbol: ":')" },
        { label: 'wink', class: 'emoticon-wink', symbol: ";)" },
        { label: 'cheeky', class: 'emoticon-cheeky', symbol: ":P" },
        { label: 'surprised', class: 'emoticon-surprised', symbol: ":O" },
        { label: 'kiss', class: 'emoticon-kiss', symbol: ":*" },
        { label: 'frown', class: 'emoticon-frown', symbol: ":(" },
        { label: 'tears', class: 'emoticon-tears', symbol: ":'(" },
        { label: 'cool', class: 'emoticon-cool', symbol: "&gt;B)" },
        { label: 'angry', class: 'emoticon-angry', symbol: ":@" },
        { label: 'confused', class: 'emoticon-confused', symbol: ":S" },
        { label: 'angel', class: 'emoticon-angel', symbol: "O:)" },
        { label: 'devil', class: 'emoticon-devil', symbol: "3:)" },
        { label: 'music', class: 'emoticon-music', symbol: "(8)" },
        { label: 'thumbs-up', class: 'emoticon-thumbs-up', symbol: "(Y)" },
        { label: 'thumbs-down', class: 'emoticon-thumbs-down', symbol: "(N)" },
        { label: 'heart', class: 'emoticon-heart', symbol: "&lt;3" },
        { label: 'broken-heart', class: 'emoticon-broken-heart', symbol: "&lt;/3" }
    ];
    // { label: 'annoyed', class: 'emoticon-annoyed', symbol: ":/" },
    var smileysHtml = '';
    $(smileys).each(function (idx, smiley) {
        smileysHtml += '<li class="emoticon-18px '+smiley.class+'" data-symbol="'+smiley.symbol+'" data-sclass="'+smiley.class+'">'+smiley.symbol+' - '+smiley.label+'</li>';
    });

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
    function isChatWindowExists(topic) {
        if ($(".room-item[data-room-id='"+topic+"']").length > 0){
            return true;
        } else {
            return false;
        }
    }

    function newChatWindow(topic, data) {
        // Test if elements for this room are already in the DOM
        if (isChatWindowExists(topic)) {
            return;
        }

        windowType = ChatServer.getTopicType(topic);

        // Window name
        var windowName;
        if (windowType == 'room') {
            windowName = data.name;
        } else if (windowType == 'discussion') {
            windowName = data.username;
        }

        // Hide default elements
        $("[data-room-id='default']").hide();

        // Create room in rooms-list
        var newRoomItem = $(".room-item[data-room-id='template']").clone(false);
        $(newRoomItem).attr('data-room-id', topic);
        $(newRoomItem).find('.name').html(windowName);
        $(newRoomItem).css('display', 'block');
        $(newRoomItem).click(function() {
            focusOnWindow(topic);
        });
        $("#rooms-list").append(newRoomItem);

        // Create room-container
        var newRoomContainer = $(".room-container[data-room-id='template']").clone(false);
        $(newRoomContainer).attr('data-room-id', topic);
        $(newRoomContainer).find('.name').html(windowName);
        $(newRoomContainer).find('.input-message').attr('data-room-id', topic);
        $(newRoomContainer).find('.send-message').attr('data-room-id', topic);
        $(newRoomContainer).find('.smileys-message').attr('data-room-id', topic);
        $(newRoomContainer).find('.smileys-popin-message').attr('data-room-id', topic);
        $(newRoomContainer).find('ul.smileys').first().html(smileysHtml);
        if (windowType == 'room') {
            $(newRoomContainer).find('.baseline').html(data.baseline);
        } else if (windowType == 'discussion') {
            $(newRoomContainer).find('.baseline').remove();
            $(newRoomContainer).find('.room-baseline-form').remove();
        }
        $("#room").append(newRoomContainer);

        // Textarea autosize
        $(".input-message[data-room-id='"+topic+"']").autosize();

        // Smileys management
        $(".smileys-message[data-room-id='"+topic+"']").on('click', function () {
            var popin = $('.smileys-popin-message[data-room-id="'+$(this).data('topic')+'"]');
            var position = $(this).position();

            var newTop = position.top - $(popin).outerHeight();
            var newLeft = (position.left + ($(this).outerWidth()/2)) - ($(popin).outerWidth()/2);

            $(popin).css('top', newTop);
            $(popin).css('left', newLeft);
            $(popin).toggle();
        });
        $('.smileys-popin-message[data-room-id="'+topic+'"]').find('li').on('click', function () {
            var smileyHtml = '<span class="smiley emoticon-16px '+sclass+'">'+symbol+'</span>';

            var symbol = $(this).data('symbol');
            var sclass = $(this).data('sclass');
            Debug([symbol, sclass]);

            $(".input-message[data-room-id='"+topic+"']").insertAtCaret(symbol);
            $('.smileys-popin-message[data-room-id="'+topic+'"]').hide();
        });

        if (windowType == 'room') {
            // Create room users-list
            var newUsersList = $(".users-list[data-room-id='template']").clone(false);
            $(newUsersList).attr('data-room-id', topic);
            $("#users").append(newUsersList);
        }

        // Set the height as with flexbox model
        resizeMessages();

        // Register room in already-opened-rooms list
        openedWindows.push(topic);
    }

    function removeWindowDOM(topic) {
        $(".room-item[data-room-id='"+topic+"']").remove();
        $(".room-container[data-room-id='"+topic+"']").remove();
        $(".users-list[data-room-id='"+topic+"']").remove();

        // If it was the last room open show() default
        if (1 > $(".room-item[data-room-id!='default'][data-room-id!='template']").length) {
            // Show default elements
            $("[data-room-id='default']").show();
        } else {
            // At least one open room remain, we focus on it
            focusOnWindow();
        }
    }

    function focusOnWindow(topic) {
        // If topic is null focus the first opened room
        if (topic == undefined) {
            topic = $(".room-item[data-room-id!='default'][data-room-id!='template']").first().data('roomId');
        }

        focusedWindow = topic;

        // Room list
        $( ".room-item").removeClass('active');
        $('.room-item[data-room-id="'+topic+'"]').addClass('active');

        // Room content
        $( ".room-container" ).hide();
        $('.room-container[data-room-id="'+topic+'"]').fadeIn(400);

        // Set the height as with flexbox model
        resizeMessages();

        // User list
        $( ".users-list" ).hide();
        $('.users-list[data-room-id="'+topic+'"]').fadeIn(400);

        // Remove un-read message badge
        $('.room-item[data-room-id="'+topic+'"] > .badge').fadeOut(400, function () {
            $('.room-item[data-room-id="'+topic+'"] > .badge').html(0);
        });
    }

    function scrollDown(e) {
        $(".messages").scrollTop(100000);
    }

    // Resize all .room-container > messages height in current document
    function resizeMessages() {
        $('.room-container').each(function () {
            if ('template' == $(this).data('roomId')
                || 'default' == $(this).data('roomId')) {
                return;
            }
            var containerHeight = $(this).innerHeight();
            var headerHeight = $(this).find('.header').outerHeight();
            var postboxHeight = $(this).find('.postbox').outerHeight();
            var messagesHeight = containerHeight - (headerHeight + postboxHeight); // 10 is .messages margin
            if (messagesHeight < 100) {
                messagesHeight = 100;
            }
            $(this).find('.messages').first().height(messagesHeight);
        });
    }

    function addUnreadMessageBadge(topic, num) {
        var current = parseInt($(('.room-item[data-room-id="'+topic+'"] > .badge')).html(), 10);
        current += num;
        $(('.room-item[data-room-id="'+topic+'"] > .badge')).html(current);
        $('.room-item[data-room-id="'+topic+'"] > .badge').show();
    }

    function userListAddUser(topic, user, notify) {
        // Check that user is not already in DOM
        if ($(".users-list[data-room-id='"+topic+"']").find(".user-item[data-user-id='"+user.id+"']").length > 0){
            return;
        }

        var newUserItem = $(".user-item[data-user-id='template']").first().clone(false);
        $(newUserItem).attr('data-user-id', user.id);
        $(newUserItem).css('display', 'block');
        $(newUserItem).find('.username').html(user.username);
        console.log([newUserItem]);
        /*var html = '<a href="#" class="user-item" data-user-id="'+user.id+'">'+user.username+'</a>';*/
        $(".users-list[data-room-id='"+topic+"'] > .list-group").append(newUserItem);
        console.log('add:'+user.id);

        userListSort(topic);

        if (undefined == notify || notify != false) {
            roomContainerAddApplicationMessage(topic, 'info', "User <strong>"+user.username+"</strong> has joined the room");
        }
    }

    function userListSort(topic) {
        var list = $(".users-list[data-room-id='"+topic+"'] > .list-group");
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

    function userListRemoveUser(topic, user) {
        $(".users-list[data-room-id='"+topic+"']").find(".user-item[data-user-id='"+user.id+"']").remove();
        roomContainerAddApplicationMessage(topic, 'info', "User <strong>"+user.username+"</strong> has left the room");
    }

    function roomContainerAddApplicationMessage(topic, type, message) {
        var dateText = $.format.date(new Date(), "HH:mm:ss");
        var html = '<p class="'+type+'"><span class="date"><span class="glyphicon glyphicon-time"></span> '+dateText+'</span> <span class="text">'+message+'</span></p>';
        $(".room-container[data-room-id='"+topic+"'] > .messages").append(html);
        scrollDown($(".room-container[data-room-id='"+topic+"'] > .messages"));
    }

    function roomContainerAddMessage(topic, message) {
        var dateText = $.format.date(new Date(message.time*1000), "HH:mm:ss");
        var messageHtml = message.message;
        // Multi-lines
        messageHtml = messageHtml.replace(/\n/g, '<br />');

        // Hyperlinks
        //URLs starting with http://, https://, or ftp://
        urlPattern = /(\b(https?|ftp)?:\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
        messageHtml = messageHtml.replace(urlPattern, '<a href="$1" target="_blank">$1</a>');
        // Smileys
        $(smileys).each(function (idx, smiley) {
            messageHtml = messageHtml.replace(smiley.symbol, '<span class="smiley emoticon-16px '+smiley.class+'">'+smiley.symbol+'</span>');
        });

        // P
        var html = '<p><span class="avatar"><img src="'+message.avatar+'" /></span><span class="username" data-user-id="'+message.user_id+'">'+message.username+'</span><span class="date"><span class="glyphicon glyphicon-time"></span> '+dateText+'</span><span class="message">'+messageHtml+'</span></p>';
        $(".room-container[data-room-id='"+topic+"'] > .messages").append(html);
        scrollDown($(".room-container[data-room-id='"+topic+"'] > .messages"));
    }

    function setRoomBaseline(topic, data)
    {
        var baseline = data.baseline;
        if ('' == baseline) {
            baseline = "&nbsp;";
        }
        $(".room-container[data-room-id='"+topic+"']").find('.baseline').html(baseline);

        if (undefined == data.notify || data.notify == true) {
            if (undefined == data.username) {
                data.username = '???';
            }
            roomContainerAddApplicationMessage(topic, 'info', "Channel topic was changed by <strong>"+data.username+"</strong> to: <em>"+baseline+"</em>");
        }
    }

    /*****************************************************
     * Chat re-usable functions
     *****************************************************/
    // Current user joins a room
    function joinRoom(topic) {
        // Test if this room is already loaded in this browser page
        if (-1 !== $.inArray(parseInt(topic), openedWindows)) {
            Debug('Room already opened (joinRoom): '+topic);
            focusOnWindow(topic);
            return false;
        }

        // Subscribe to room
        ChatServer.subscribe(topic);
    }

    // Current user leaves a room
    function leaveRoom(topic) {

        if (ChatServer.isRoomTopic(topic)) {
            // Subscribe to room
            ChatServer.unsubscribe(topic);
        }

        // IHM
        removeWindowDOM(topic);

        // Un-register room in already-opened-rooms list
        openedWindows.remove($.inArray(topic, openedWindows));
    }

    /*****************************************************
     * Interface binding
     *****************************************************/
    $(function() {

        $(window).on('beforeunload', function() {
            // only if at least one room is open
            if (openedWindows.length > 0) {
                // prevent user leave the page un-intentionnaly
                return "If you leave this page all the chatroom history will be lost.";
            }
        });

        // Emulate flexbox model for all browser
        $(window).resize(function() {
            resizeMessages();
        });

        var postMessageCallback = function (e) {
            var topic = $(e).data('roomId');
            var topicType = ChatServer.getTopicType(topic);
            var message = $('.input-message[data-room-id="'+topic+'"]').val();
            if (message == '') {
                return;
            }

            if (topicType == 'room') {
                data = {message: message};
                ChatServer.send(topic, data);
            }
            if (topicType == 'discussion') {
                var userId = topic.replace(ChatServer.topicTypes.discussion+"#", '');
                data = {with_user_id: userId, message: message};
                ChatServer.send(ChatServer.topicTypes.discussion, data);
            }

            // Empty the field
            $('.input-message[data-room-id="'+topic+'"]').val('').trigger('autosize.resize');
        };
        $(document).on('keypress', '.input-message', function (e) {
            var key;
            var isShift;
            if (window.event) {
                key = window.event.keyCode;
                isShift = window.event.shiftKey ? true : false;
            } else {
                key = e.which;
                isShift = e.shiftKey ? true : false;
            }
            if(!isShift && e.which == 13) {
                postMessageCallback(this);
                return false; // avoid adding a line break in field when submitting with "Enter"
            }
        });
        $(document).on('click', '.send-message', function () {
              postMessageCallback(this);
        });

        $(document).on('click', '#rooms-list > .room-item > .close', function () {
            var topic = $(this).closest(".room-item").data('roomId');
            leaveRoom(topic);
        });
        $(document).on('click', '.room-container > .header > .close', function () {
            var topic = $(this).closest(".room-container").data('roomId');
            leaveRoom(topic);
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

            ChatServer.create(roomName, function(data) {
                Debug(data);
                joinRoom(data.topic);
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
            if (undefined == focusedWindow || '' == focusedWindow) {
                return;
            }
            var roomHeader = $('.room-container[data-room-id="'+focusedWindow+'"] > .header');

            roomHeader.find('.room-baseline-text').hide();
            roomHeader.find('.room-baseline-form').show();
            var currentBaseline = $('.room-container[data-room-id="'+focusedWindow+'"]').find('.baseline').html();
            if ('&nbsp;' == currentBaseline) {
                currentBaseline = '';
            }
            roomHeader.find('.room-baseline-input').val(currentBaseline);
            roomHeader.find('.room-baseline-input').focus();
        });

        var changeBaselineCallback = function () {
            if (undefined == focusedWindow || '' == focusedWindow) {
                return;
            }
            var roomHeader = $('.room-container[data-room-id="'+focusedWindow+'"] > .header');
            var baseline = roomHeader.find('.room-baseline-input').val();

            // save
            ChatServer.changeBaseline(focusedWindow, baseline);

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
            if (undefined == focusedWindow || '' == focusedWindow) {
                return;
            }

            var roomHeader = $('.room-container[data-room-id="'+focusedWindow+'"] > .header');
            roomHeader.find('.room-baseline-form').hide();
            roomHeader.find('.room-baseline-text').show();
            roomHeader.find('.room-baseline-input').val('');
        });

        $("#search-room-link").click(function () {
            $("#room-search-modal").find(".room-search-submit").first().trigger('click');
            $("#room-search-modal").modal();
        });

        var searchRoomsCallback = function() {
            var inputModal = $("#room-search-modal").find(".room-search-input").first();
            var search = inputModal.val();

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
                    var html = '<li class="list-group-item search-room-item" data-room-id="'+this.topic+'"><h4 class="list-group-item-heading">'+this.name+'</h4> <p class="list-group-item-text">'+this.baseline+'</p></li>';
                    $(ul).append(html);

                    var topic = this.topic;
                    $(ul).find('li.search-room-item[data-room-id="'+this.topic+'"]').first().click(function() {
                        joinRoom(topic);
                        $("#room-search-modal").modal('hide');
                    });
                });
            });
        };

        $("#room-search-modal").find(".room-search-submit").first().click(searchRoomsCallback);
        $("#room-search-modal").find(".room-search-input").first().keyup(searchRoomsCallback);

        function userProfileCallback(o)
        {
            var userId = $(o).closest('.user-item').data('userId');
            if (undefined == userId || '' == userId || 0 == userId) {
                return;
            }

            $("#user-profile-modal").modal({
                remote: 'http://' + window.location.hostname + '/u/'+userId+'?modal=true'
            });
        }
        $(document).on('click', '#users > .users-list > .list-group > .user-item > .actions > .user-profile', function() {
            userProfileCallback(this);
        });
        $(document).on('dblclick', '.messages > p > .username', function() {
            userProfileCallback(this);
        });
        $('body').on('hidden.bs.modal', "#user-profile-modal", function () {
            $(this).removeData('bs.modal');
        });

        function discussionCallback(o)
        {
            var userItem = $(o).closest('.user-item');
            var userId = $(userItem).data('userId');
            if (undefined == userId || '' == userId || 0 == userId) {
                return;
            }

            var username = $(userItem).find('.username').html();
            var data = {id: userId, username: username};
            var discussionTopic = ChatServer.topicTypes.discussion+"#"+userId;
            newChatWindow(discussionTopic, data);
            focusOnWindow(discussionTopic);
        }
        $(document).on('click', '#users > .users-list > .list-group > .user-item > .actions > .user-discussion', function() {
            discussionCallback(this);
        });
        $(document).on('dblclick', '#users > .users-list > .list-group > .user-item > .username', function() {
            discussionCallback(this);
        });

    });

    /*****************************************************
     * Transport layer
     *****************************************************/
    $(function() {

        ChatServer = new ChatServerPrototype(true);

        $(ChatServer).bind('connect', function(e) {
            status.update('online');

            // Try to detect if a room was submitted in the URL (when user come from home for example)
            if(window.location.hash)
            {
                // Hash found
                var hash = window.location.hash.substring(1); // Puts hash in variable, and removes the # character
                var roomId = parseInt(hash.replace('room=', ''));
                joinRoom(ChatServer.topicTypes.room_prefix+roomId);
            }
        });

        $(ChatServer).bind('close', function(e) {
            status.update('offline');

            // To be sure that client will re-subscribe to any topic after re-connection
            openedWindows = [];
        });

        // After a successful subscription server informs client
        $(ChatServer).bind('subscribeSuccess', function(e, topic, room) {
            newChatWindow(topic, room);
            focusOnWindow(topic);
        });

        // After a successful subscription server informs client
        $(ChatServer).bind('subscribeError', function(e, topic, data) {
            alert(data.error);
        });

        // When server push room attendees
        $(ChatServer).bind('addRoomAttendee', function(e, roomId, data) {
            userListAddUser(roomId, data, false);
        });

        // When server indicate that someone enter in the room
        $(ChatServer).bind('userEnterInRoom', function(e, roomId, data) {
            userListAddUser(roomId, data);
        });

        // When server indicate that someone leave the room
        $(ChatServer).bind('userOutRoom', function(e, roomId, data) {
            userListRemoveUser(roomId, data);
        });

        $(ChatServer).bind('roomBaseline', function(e, roomId, data) {
            setRoomBaseline(roomId, data);
        });

        $(ChatServer).bind('pleaseJoinRoom', function(e, data) {
            joinRoom(data.topic);
        });

        $(ChatServer).bind('pleaseLeaveRoom', function(e, data) {
            leaveRoom(data.topic);
        });

        $(ChatServer).bind('message', function(e, topic, data) {
            // If message received on discussion and discussion window not already exists
            if (ChatServer.isDiscussionTopic(topic)) {
                topic = ChatServer.topicTypes.discussion+"#"+data.with_user_id;
                if (!isChatWindowExists(topic)) {
                    newChatWindow(topic, {user_id: data.with_user_id, username: data.username});
                }
            }
            roomContainerAddMessage(topic, data);
            if (focusedWindow != topic) {
                addUnreadMessageBadge(topic, 1);
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
