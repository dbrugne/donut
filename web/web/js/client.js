var ChatClient = function(optDebug) {

    var ChatServer;
    var openedWindows = [];
    var focusedWindow = '';
    var pendingSubscriptions = []; // list the topic for who we wait the success callback
    var shouldBeFocused = ''; // indicate if this topic should be focused on success callback or not, emptied instantly after focus

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
        $("#rooms-list").append(newRoomItem);

        // Create room-container
        var newRoomContainer = $(".room-container[data-room-id='template']").clone(false);
        $(newRoomContainer).hide(); // to avoid all the room be displayed on same time if autofocus fails
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

        if (windowType == 'room') {
            // Create room users-list
            var newUsersList = $(".users-list[data-room-id='template']").clone(false);
            $(newUsersList).hide(); // to avoid all the room be displayed on same time if autofocus fails
            $(newUsersList).attr('data-room-id', topic);
            $("#users").append(newUsersList);
        }

        // Set the height as with flexbox model
        resizeMessages();
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

        // Room list
        $( ".room-item").removeClass('active');

        $('.room-item[data-room-id="'+topic+'"]').addClass('active');
        // Room content
        $( ".room-container" ).hide();

        $('.room-container[data-room-id="'+topic+'"]').fadeIn(400);
        // Set the height as with flexbox model
        resizeMessages();

        // User list
        $("#users").find(".users-list").hide();

        $('.users-list[data-room-id="'+topic+'"]').fadeIn(400);
        // Remove un-read message badge
        $('.room-item[data-room-id="'+topic+'"] > .badge').fadeOut(400, function () {
            $('.room-item[data-room-id="'+topic+'"] > .badge').html(0);
        });

        // Focus on input field
        $('.input-message[data-room-id="'+topic+'"]').focus();

        // Set URL hash
        if (ChatServer.isRoomTopic(topic)) {
            var hash = 'room='+topic.replace(ChatServer.topicTypes.room_prefix, '');
        } else {
            var hash = 'discussion='+topic.replace(ChatServer.topicTypes.discussion+'#', '');
        }
        window.location.hash = hash;

        // Store current window
        focusedWindow = topic;
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

        var newUserItem = $(".users-list[data-room-id='template'] > .list-group > .user-item[data-user-id='template']").first().clone(false);
        $(newUserItem).attr('data-user-id', user.id);
        $(newUserItem).css('display', 'block');
        $(newUserItem).find('.username').html(user.username);
        $(".users-list[data-room-id='"+topic+"'] > .list-group").append(newUserItem);

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
                data.username = '?';
            }
            roomContainerAddApplicationMessage(topic, 'info', "Channel topic was changed by <strong>"+data.username+"</strong> to: <em>"+baseline+"</em>");
        }
    }

    function addOnlineUser(data)
    {
        // Hide default item
        $('#online-users-list > [data-user-id="default"]').hide();

        // Create new item
        var newUserItem = $('#online-users-list > [data-user-id="template"]').clone();
        $(newUserItem).attr('data-user-id', data.user_id);
        $(newUserItem).find('.username').html(data.username);
        $(newUserItem).find('.avatar > img').attr('src', data.avatar);
        $('#online-users-list').append(newUserItem);
    }

    function removeOnlineUser(data)
    {
        $('#online-users-list > [data-user-id="'+data.user_id+'"]').remove();

        // If last, shows default again
        if ($("#online-users-list > .user-item[data-user-id!='default'][data-user-id!='template']").length < 1) {
            $('#online-users-list > [data-user-id="default"]').show();
        }
    }

    /*****************************************************
     * Chat re-usable functions
     *****************************************************/
    // Current user joins a room
    function joinRoom(topic) {
        // Test if this room is already loaded in this browser page
        if ($.inArray(topic, openedWindows) !== -1) {
            Debug('Room already opened: '+topic);
            return false;
        }

        // Register room in already-subscribed list
        // Note: should be here (early) to avoid re-subscription when topic is listed only after subscription callback
        // and IHM creation
        openedWindows.push(topic);

        // Subscribe to room
        pendingSubscriptions.push(topic);
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

        $(document).on('click', '#rooms-list > .room-item', function (e) {
            e.preventDefault();
            var topic = $(this).data('roomId');
            focusOnWindow(topic);
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

        $('#create-room-toggle').click(function(e) {
            e.preventDefault();
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
                shouldBeFocused = data.topic;
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

        $("#search-room-link").click(function (e) {
            e.preventDefault();
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
                    return;
                }

                // Fill list with result
                $(roomList).each(function() {
                    var html = '<li class="list-group-item search-room-item" data-room-id="'+this.topic+'"><h4 class="list-group-item-heading">'+this.name+'</h4> <p class="list-group-item-text">'+this.baseline+'</p></li>';
                    $(ul).append(html);

                    var topic = this.topic;
                    $(ul).find('li.search-room-item[data-room-id="'+this.topic+'"]').first().click(function() {
                        shouldBeFocused = topic;
                        joinRoom(topic);
                        $("#room-search-modal").modal('hide');
                    });
                });
            });
        };
        $("#room-search-modal").find(".room-search-submit").first().click(searchRoomsCallback);
        $("#room-search-modal").find(".room-search-input").first().keyup(searchRoomsCallback);

        $("#search-user-link").click(function (e) {
            e.preventDefault();
            $("#user-search-modal").find(".user-search-submit").first().trigger('click');
            $("#user-search-modal").modal();
        });
        var searchUsersCallback = function() {
            var inputModal = $("#user-search-modal").find(".user-search-input").first();
            var search = inputModal.val();

            ChatServer.searchForUsers(search, function(userList) {
                var ul =  $("#user-search-modal").find("ul.search-users-list").first();

                // Empty list
                $(ul).children('li').remove();

                // No result
                if (userList.length < 1) {
                    var html = '<li><span class="no-result">No result</span></li>';
                    $(ul).append(html);
                    return;
                }

                // Fill list with results
                $(userList).each(function() {
                    var html = '<li class="list-group-item user-item" data-user-id="'+this.id+'"><span class="username">'+this.username+'</span></li>';
                    $(ul).append(html);
                    var id = this.id;
                    $(ul).find('li.user-item[data-user-id="'+this.id+'"]').first().click(function() {
                        userProfileCallback(this);
                        $("#user-search-modal").modal('hide');
                    });
                });
            });
        };
        $("#user-search-modal").find(".user-search-submit").first().click(searchUsersCallback);
        $("#user-search-modal").find(".user-search-input").first().keyup(searchUsersCallback);

        var userProfileCallback = function(o)
        {
            var userId = $(o).closest('.user-item').data('userId');
            if (undefined == userId || '' == userId || 0 == userId) {
                return;
            }

            $("#user-profile-modal").modal({
                remote: 'http://' + window.location.hostname + '/u/'+userId+'?modal=true'
            });
        }
        $(document).on('click', '#users > .users-list > .list-group > .user-item > .actions > .user-profile', function(e) {
            e.preventDefault();
            userProfileCallback(this);
        });
        $(document).on('dblclick', '.messages > p > .username', function(e) {
            e.preventDefault();
            userProfileCallback(this);
        });
        $('body').on('hidden.bs.modal', "#user-profile-modal", function () {
            $(this).removeData('bs.modal');
        });

        var discussionCallback = function(o)
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
        $(document).on('click', '#users > .users-list > .list-group > .user-item > .actions > .user-discussion', function(e) {
            e.preventDefault();
            discussionCallback(this);
        });
        $(document).on('click', '#users > .users-list > .list-group > .user-item > .username', function(e) {
            e.preventDefault(); // a click event is fired before a dblclick event
        });
        $(document).on('dblclick', '#users > .users-list > .list-group > .user-item > .username', function(e) {
            e.preventDefault();
            discussionCallback(this);
        });

        $(document).on('click', '#online-users-list > .user-item', function(e) {
            e.preventDefault();
            userProfileCallback(this);
        });

        // Smileys management
        $(document).on('click', '.smileys-message', function(e) {
            var topic = $(this).data('roomId');
            var popin = $('.smileys-popin-message[data-room-id="'+topic+'"]');

            var position = $(this).position();
            var newTop = position.top - $(popin).outerHeight();

            var newLeft = (position.left + ($(this).outerWidth()/2)) - ($(popin).outerWidth()/2);
            $(popin).css('top', newTop);
            $(popin).css('left', newLeft);

            $(popin).toggle();
        });
        $(document).on('click', '.smileys > li', function(e) {
            var topic = $(this).closest('.smileys-popin-message').data('roomId');
            var symbol = $(this).data('symbol');

            $(".input-message[data-room-id='"+topic+"']").insertAtCaret(symbol);
            $('.smileys-popin-message[data-room-id="'+topic+'"]').hide();
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
            if (window.location.hash) {
                // Hash found
                var hash = window.location.hash.substring(1); // Puts hash in variable, and removes the # character
                if (hash.indexOf('room=') !== -1) {
                    var topic = ChatServer.topicTypes.room_prefix+hash.replace('room=', '');
                    shouldBeFocused = topic;
                    joinRoom(topic);
                }
                if (hash.indexOf('discussion=') !== -1) {
                    var topic = ChatServer.topicTypes.discussion+'#'+hash.replace('discussion=', '');
                    newChatWindow(topic, {username: '...'}); // @todo: bug, left username
                }
            }
        });

        $(ChatServer).bind('close', function(e) {
            status.update('offline');

            // To be sure that client will re-subscribe to any topic after re-connection
            openedWindows = [];
        });

        // After a successful subscription server informs client
        $(ChatServer).bind('subscribeSuccess', function(e, topic, room) {
            pendingSubscriptions.remove($.inArray(topic, pendingSubscriptions));
            newChatWindow(topic, room);
            if (shouldBeFocused == topic) {
                shouldBeFocused = '';
                focusOnWindow(topic);
                // @todo: improve, if no room focused after end of "initialization", focus one
            }
        });

        // After an error during subscription
        $(ChatServer).bind('subscribeError', function(e, topic, data) {
            pendingSubscriptions.remove($.inArray(topic, pendingSubscriptions));
            Debug(['subscribeError', data]);
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

        $(ChatServer).bind('newOnlineUser', function(e, data) {
            addOnlineUser(data);
        });

        $(ChatServer).bind('removeOnlineUser', function(e, data) {
            removeOnlineUser(data);
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
