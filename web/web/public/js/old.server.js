ChatServerPrototype = function(optDebug) {
    var onError = function(error) {
        Debug('Error: ' + error);
    }

    var Debug = function(msg) {
        if (api.debug) {
            console.log(msg);
        }
    }

    var api = {

        topicTypes: {
            control: "ws://chat.local/control",
            discussion: "ws://chat.local/discussion",
            room_prefix: "ws://chat.local/room#"
        }
        , getTopicType: function(topic) {
            if (topic == this.topicTypes.control) {
                return 'control';
            } else if (topic.indexOf(this.topicTypes.discussion) != -1) {
                return 'discussion';
            } else if (topic.indexOf(this.topicTypes.room_prefix) != -1) {
                return 'room';
            }
        }
        , isControlTopic: function(topic) {
            return this.getTopicType(topic) == 'control';
        }
        , isRoomTopic: function(topic) {
            return this.getTopicType(topic) == 'room';
        }
        , isDiscussionTopic: function(topic) {
            return this.getTopicType(topic) == 'discussion';
        }

        , events: [
            /**
             * The user has connected to the server
             * @event connected
             */
            'connect'

            /**
             * The user has disconnected from the server
             * @event disconnect
             */
          , 'disconnect'

            /**
             * Subscription to channel was accepted
             * @event subscribeSuccess
             * @param array
             */
          , 'subscribeSuccess'

            /**
             * Subscription to channel was refused
             * @event subscribeError
             * @param array
             */
            , 'subscribeError'

            /**
             * A new room has been created by another user
             * @event openRoom
             * @param string Room name
             */
          , 'openRoom'

            /**
             * A room has been closed
             * @event closeRoom
             * @param string Room name
             */
          , 'closeRoom'

            /**
             * Another use has left one of the rooms this user is in
             * @event leftRoom
             * @param string Room name
             * @param string Unique ID of the person who left
             */
          , 'leftRoom'

            /**
             * A message has been received in one of the chat rooms
             * @event message
             * @param string Room the message is sent to
             * @param string Unique ID of the person who sent the message
             * @param string Message received
             */
          , 'message'

         /**
          * Server notify that a user is to add as room attendee
          * @event addRoomAttendee
          * @param int roomId
          * @param Object data
          */
          , 'addRoomAttendee'

        /**
         * Server notify that a user just arrived in the room
         * @event userEnterInRoom
         * @param int roomId
         * @param Object data
         */
            , 'userEnterInRoom'

        /**
         * Server notify that a user is to display as room attendee
         * @event userOutRoom
         * @param int roomId
         * @param Object data
         */
            , 'userOutRoom'

         /**
          * The server inform the client that a room baseline was changed
          * @event roomBaseline
          * @param int roomId
          * @param Object data
          */
          , 'roomBaseline'

        /**
         * Fired when the server ask to client to join this room (the user is reconnecting or the room was opened
         * on another device)
         *
         * @event pleaseJoinRoom
         * @param Object data
         */
            , 'pleaseJoinRoom'

        /**
         * Fired when the server ask to client to leave this room (room closed on another device or room deletion)
         *
         * @event pleaseLeaveRoom
         * @param Object data
         */
            , 'pleaseLeaveRoom'

        /**
         * Fired when a new user is online
         *
         * @event newOnlineUser
         * @param Object data
         */
            , 'newOnlineUser'

        /**
         * Fired when a user goes offline
         *
         * @event removeOnlineUser
         * @param Object data
         */
            , 'removeOnlineUser'
        ]

      , debug: optDebug | false

      , subscribe: function(topic) {
            sess.subscribe(topic, function(topic, event) {
                Debug([event.action, topic, event.data]);
                $(api).trigger(event.action, [topic, event.data]);
            });
        }

      , unsubscribe: function(topic) {
            sess.unsubscribe(topic);
        }

      , send: function(topic, msg) {
            // Message can not be longer than 140 characters
            sess.publish(topic, msg);
        }

      , end: function() {
            sess.close();
        }

      , create: function(name, callback) {
            sess.call('createRoom', name).then(function(data) {
                callback(data);
            }, function(args) {
                callback(data);
            });
        }

      , changeBaseline: function(roomId, baseline) {
            sess.call('changeBaseline', roomId, baseline).then(
                function() { }
                , function() { alert('Error changeBaseline!!'); }
            );
        }

      , searchForRooms: function(search, callback) {
            sess.call('searchForRooms', search).then(
                function(roomList) {
                    callback(roomList);
                }
                , function() { alert('Error searchForRooms!!'); }
            );
        }

        , searchForUsers: function(search, callback) {
            sess.call('searchForUsers', search).then(
                function(userList) {
                    callback(userList);
                }
                , function() { alert('Error searchForUsers!!'); }
            );
        }

      , sessionId: ''

      , userId: '' // @todo: fill on connect and use for avoiding self-discussion or other things

    }

    ab._debugrpc    = api.debug;
    ab._debugpubsub = api.debug;
    ab._debugws     = api.debug;

    // web_socket.js configuration
    WEB_SOCKET_SWF_LOCATION = "/js/WebSocketMain.swf";
    if (api.debug) {
        WEB_SOCKET_DEBUG = true;
    }

    var sess;
    ab.connect(
        'ws://' + window.location.hostname + ':8080/chat'
      , function(session) {
            sess = session;
            api.sessionId = sess._session_id;

            // Subscribe to control topic
            sess.subscribe(api.topicTypes.control, function(topic, event) {
                $(api).trigger(event.action, event.data);
            });

            // Subscribe to discussion topic
            sess.subscribe(api.topicTypes.discussion, function(topic, event) {
                $(api).trigger(event.action, [topic, event.data]);
            });

            $(api).trigger('connect');
        }
      , function(code, reason, detail) {
            sess = null;
            Debug(['Connection closed', code, reason, detail]);
            $(api).trigger('close');
        }
      , {
            'skipSubprotocolCheck': true,
            'maxRetries': 60,
            'retryDelay': 3500
        }
    );

    // Store user_id on api
    $(api).bind('userId', function(e, data) {
        api.userId = data.user_id;
    });

    return api;
};