<?php
namespace Server\Components;
use Ratchet\ConnectionInterface;
use Ratchet\Wamp\WampServerInterface;

class ChatRoom implements WampServerInterface
{

    /**
     * Room topics are used to broadcast room event to subscribed users:
     * - message
     * - a user enter in room
     * - a user left the room
     * - room 'topic (baseline)' change
     * - room was closed by owner
     */


    const CTRL_PREFIX = 'ctrl:';
    const CTRL_ROOMS  = 'ctrl:rooms';
    protected $rooms = array();
    protected $roomLookup = array();


    /**
     * A "control" topic is subscribed by each user that connect to the application
     * This topic is used to push application messages to client, for example when a user subscribe to a room topic
     * we return on the the control channel the room data and list of users
     */
    const CONTROL_TOPIC = "ws://chat.local/control" ;

    /**
     * List subscribers to control topic. In theory it should be "all users"
     *
     * @var array
     */
    protected $controlTopicUsers = array();

    /**
     * Room identification
     *
     * Each room has a unique digits ID named: 'id'
     * The room is also describe as a topic on WebSocket: 'topic'
     *
     * The topic is the 'id' prefixed with self::TOPIC_ROOM_PREFIX
     */
    const TOPIC_ROOM_PREFIX = "ws://chat.local/room#";

    /**
     * Existing rooms list
     *
     * array(
     *    id => array(
     *       'id' => int,
     *       'name' => string,
     *       'topic' => string,
     *    )
     *    ...
     * )
     *
     * @var array
     */
    protected $roomsList = array();

    /**
     * For each room the subscribed users
     *
     * array(
     *   id => SplObjectStorage(
     *        ConnectionInterface,
     *        ...
     *     )
     *   ...
     * )
     *
     * @var array
     */
    protected $userRoom = array();


    /**
     * Constructor
     */
    public function __construct()
    {
//        $this->rooms[static::CONTROL_TOPIC] = new \SplObjectStorage;
        $this->controlTopicUsers = new \SplObjectStorage;

        // TEST
        // We create two rooms
        $this->roomsList[1] = array('id' => 1, 'name' => 'TF1', 'topic' => 'topic room 1');
        $this->roomsList[2] = array('id' => 2, 'name' => 'France 2', 'topic' => 'topic room 2');
        $this->userRoom[1] = new \SplObjectStorage();
        $this->userRoom[2] = new \SplObjectStorage();
        // TEST
    }

    /**
     * {@inheritdoc}
     */
    public function onOpen(ConnectionInterface $conn) {
        /**
         * $conn->User->id
         * $conn->User->username
         */

        $conn->Chat        = new \StdClass;
        $conn->Chat->rooms = array();

        // TEST
        // We register the user in two stubbed rooms
        $this->userRoom['1']->attach($conn);
        $this->userRoom['2']->attach($conn);
        // TEST

//        $conn->Chat->name  = $conn->WAMP->sessionId;
//        if (isset($conn->WebSocket)) {
//            $conn->Chat->name = $this->escape($conn->WebSocket->request->getCookie('name'));
//
//            if (empty($conn->Chat->name)) {
//                $conn->Chat->name  = 'Anonymous ' . $conn->resourceId;
//            }
//        } else {
//            $conn->Chat->name  = 'Anonymous ' . $conn->resourceId;
//        }
    }

    /**
     * {@inheritdoc}
     */
    public function onClose(ConnectionInterface $conn)
    {
        foreach ($conn->Chat->rooms as $topic => $one)
        {
            $this->onUnSubscribe($conn, $topic);
        }
    }

    /**
     * {@inheritdoc}
     */
    function onCall(ConnectionInterface $conn, $id, $fn, array $params)
    {
        switch ($fn) {

//            case 'getUserRooms':
//                $roomList = array();
//                foreach ($this->userRoom as $roomId => $userRoomList)
//                {
//                    if ($userRoomList->contains($conn)) {
//                        $roomList[] = array('topic' => self::TOPIC_ROOM_PREFIX . $roomId);
//                    }
//                }
////                var_dump($roomList);
//                return $conn->callResult($id, $roomList);
//                break;

//            case 'createRoom':
//                $topic   = $this->escape($params[0]);
//                $created = false;
//
//                if (empty($topic)) {
//                    return $conn->callError($id, 'Room name can not be empty');
//                }
//
//                if (array_key_exists($topic, $this->roomList)) {
//                    $roomId = $this->roomList[$topic];
//                } else {
//                    $created = true;
//                    $roomId  = uniqid('room-');
////                    $this->broadcast(static::CONTROL_TOPIC, array($roomId, $topic, 1));
//                    $this->userRoom[$roomId] = new \SplObjectStorage;
//                    $this->roomList[$topic] = $roomId;
//                    return $conn->callResult($id, array('id' => $roomId, 'display' => $topic));
//                }
//
//                if ($created) {
//
//                } else {
//                    return $conn->callError($id, array('id' => $roomId, 'display' => $topic));
//                }
//            break;

            default:
                return $conn->callError($id, 'Unknown call');
            break;
        }
    }

    /**
     * {@inheritdoc}
     */
    function onSubscribe(ConnectionInterface $conn, $topic)
    {
        /****************
         * CONTROL TOPIC
         ***************/
        if ($topic == self::CONTROL_TOPIC) {
            $this->controlTopicUsers->attach($conn);

            // Send room data to user
            foreach ($this->userRoom as $roomId => $userRoomList)
            {
                if ($userRoomList->contains($conn)) {
                    // Return room data on CONTROL topic
                    $userList = array(
                        1 => array(
                            array('id' => 1, 'username'=> "damien"),
                            array('id' => 2, 'username'=> "david"),
                            array('id' => 3, 'username'=> "lili"),
                            array('id' => 3, 'username'=> "néné"),
                        ),
                        2 => array(
                            array('id' => 1, 'username'=> "damien"),
                            array('id' => 3, 'username'=> "lili"),
                        ),
                    );
                    $room = $this->roomsList[$roomId];
                    $room['users'] = $userList[$roomId];
                    $conn->event(self::CONTROL_TOPIC, array('action' => 'enterInRoom', 'data' => $room));
                }
            }

            echo "{$conn->WAMP->sessionId} has just subscribed to {$topic}\n";
            return;
        }

        /****************
         * ROOM TOPIC
         ***************/
        // $topic is valid
        if (!$this->topicIsRoom($topic)) {
            echo "Topic '{$topic}' not corresponds to room topic pattern\n";
            return;
        }
        $roomId = $this->findIdFromTopic($topic);

        // This room was not already created
        if (!array_key_exists($roomId, $this->roomsList)) {
            echo "Room '{$topic}' not already exists, please call 'createRoom' before\n";
            return;
        }

        // Add user to broadcast list
        echo "{$conn->WAMP->sessionId} has just subscribed to {$topic}\n";
        $this->userRoom[$roomId]->attach($conn);

//        // The JS subscribe to static::CONTROL_TOPIC just after having opened the Websocket
//        // So when subscription to static::CONTROL_TOPIC happen we send "room" list to browser
//        // List is sent as one $conn->event per opened room
//        if (static::CONTROL_TOPIC == $topic) {
//            foreach ($this->rooms as $roomTopic => $clientConnection) {
//                if (!$this->isControl($roomTopic)) {
//                    $conn->event(static::CONTROL_TOPIC, array($roomTopic, array_search($roomTopic, $this->roomLookup), 1));
//                }
//            }
//        }

//        /**
//         * When a user subscribe to as room, returns:
//         * - Room id
//         * - Room name
//         * - Room topic
//         * - Users list
//         */
//        $response = array(
//            'id' => 'ws://chat.local/room#1',
//            'name' => "TF1",
//            'topic' => "Ce soir c'est The Voice !!",
//            'users' => array(
//                array('id' => 1, 'username'=> "damien"),
//                array('id' => 2, 'username'=> "david"),
//                array('id' => 3, 'username'=> "lili"),
//            ),
//        );
//        $conn->event(static::CONTROL_TOPIC, $response);
//
//        // Notify everyone this guy has joined the room they're in
//        $this->broadcast($topic, array('joinRoom', $conn->WAMP->sessionId, $conn->User->username), $conn);
//
//        // List all the people already in the room to the person who just joined
//        foreach ($this->rooms[$topic] as $patron) {
//            $conn->event($topic, array('joinRoom', $patron->WAMP->sessionId, $patron->User->username));
//        }

//        $conn->Chat->rooms[$topic] = 1;
    }

    /**
     * {@inheritdoc}
     */
    function onUnSubscribe(ConnectionInterface $conn, $topic) {
        unset($conn->Chat->rooms[$topic]);
        $this->rooms[$topic]->detach($conn);

        if ($this->isControl($topic)) {
            return;
        }

        if ($this->rooms[$topic]->count() == 0) {
            unset($this->rooms[$topic], $this->roomLookup[array_search($topic, $this->roomLookup)]);
            $this->broadcast(static::CONTROL_TOPIC, array($topic, 0));
        } else {
            $this->broadcast($topic, array('leftRoom', $conn->WAMP->sessionId));
        }
    }

    /**
     * {@inheritdoc}
     */
    function onPublish(ConnectionInterface $conn, $topic, $event, array $exclude = array(), array $eligible = array())
    {
        $event = (string)$event;
        if (empty($event)) {
            return;
        }

        // $topic is valid
        if (!$this->topicIsRoom($topic)) {
            echo "Topic '{$topic}' not corresponds to room topic pattern\n";
            return;
        }
        $roomId = $this->findIdFromTopic($topic);

        // This room was not already created
        if (!array_key_exists($roomId, $this->roomsList)) {
            echo "Room '{$topic}' not already exists, please call 'createRoom' before\n";
            return;
        }

        // This room is not subscribed by user
        // @todo
//        if (!array_key_exists($topic, $conn->Chat->rooms) || !array_key_exists($topic, $this->rooms) || $this->isControl($topic)) {
//            // error, can not publish to a room you're not subscribed to
//            // not sure how to handle error - WAMP spec doesn't specify
//            // for now, we're going to silently fail
//
//            return;
//        }

        $event = $this->escape($event);

        $this->broadcast($roomId, array('message', $conn->User->username, $event, time()));
    }

    /**
     * {@inheritdoc}
     */
    public function onError(ConnectionInterface $conn, \Exception $e) {
        $conn->close();
    }

    /**
     * Broadcast a message to subscribers
     *
     * @param int $id The ID of the room to broadcast for
     * @param mixed $msg
     * @param ConnectionInterface $exclude The user connection to exclude from broadcast
     */
    protected function broadcast($roomId, $msg, ConnectionInterface $exclude = null)
    {
        $topic = self::TOPIC_ROOM_PREFIX . $roomId;
        foreach ($this->userRoom[$roomId] as $client) {
            if ($client !== $exclude) {
                $client->event($topic, $msg);
            }
        }
    }

    /**
     * @param string
     * @return boolean
     */
    protected function isControl($room) {
        return (boolean)(substr($room, 0, strlen(static::CTRL_PREFIX)) == static::CTRL_PREFIX);
    }

    /**
     * @param string
     * @return string
     */
    protected function escape($string) {
        return htmlspecialchars($string);
    }

    /**
     * Check that $topic correspond to the room topic pattern.
     *
     * @param string $topic
     * @return bool
     */
    protected function topicIsRoom($topic)
    {
        $match = preg_match("@^".self::TOPIC_ROOM_PREFIX."[1-9]+[0-9]*@", $topic);
        if ($match === false) {
            echo "REGEX error: " . __LINE__ . "\n";
            return false;
        }

        return (bool)$match;
    }

    /**
     * Analyse $topic and return the corresponding room id
     *
     * @param string $topic
     * @return int|null
     */
    protected function findIdFromTopic($topic)
    {
        $matches = array();
        $match = preg_match("@^".self::TOPIC_ROOM_PREFIX."([1-9]+[0-9]*)@", $topic, $matches);
        if ($match === false) {
            echo "REGEX error: " . __LINE__ . "\n";
            return false;
        } else if ($match == 0) {
            return null;
        }

        return $matches[1];
    }
}