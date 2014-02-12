<?php
namespace Server\Components;
use Ratchet\ConnectionInterface;
use Ratchet\Wamp\WampServerInterface;
use App\Chat\RoomManager;
use App\Chat\Room;

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
     * @var \App\Orm\EntityManager
     */
    protected $roomManager = null;

    /**
     * Constructor
     *
     * @param Application $app
     */
    public function __construct(\Silex\Application $app)
    {
        $this->controlTopicUsers = new \SplObjectStorage;
        $this->roomManager = new \App\Chat\RoomManager($app);
    }

    /**
     * {@inheritdoc}
     */
    public function onOpen(ConnectionInterface $conn) {
        $conn->Chat        = new \StdClass;
        $conn->Chat->rooms = array();
    }

    /**
     * {@inheritdoc}
     */
    public function onClose(ConnectionInterface $conn)
    {
        foreach ($conn->Chat->rooms as $roomId => $topic)
        {
            $this->onUnSubscribe($conn, $topic);
        }

        $this->controlTopicUsers->detach($conn);
    }

    /**
     * {@inheritdoc}
     */
    function onCall(ConnectionInterface $conn, $id, $fn, array $params)
    {
        switch ($fn) {

            case 'availableRooms':
                $roomList = array();
                foreach ($this->roomManager->findBy() as $room)
                {
                    $roomList[] = $room->getData();
                }
                return $conn->callResult($id, $roomList);
            break;

            case 'createRoom':
                $name   = $this->escape($params[0]);
                $created = false;

                if (empty($name)) {
                    return $conn->callError($id, 'Room name can not be empty');
                }

                // Test if room not already exist in database
                if (null === $room = $this->roomManager->findOneBy(array('name' => $name))) {
                    // Create room in database
                    $roomId = $this->roomManager->insert(array(
                        'name' => $name,
                    ));
                    // Return as created to client
                    return $conn->callResult($id, array('id' => $roomId, 'name' => $name));
                } else {
                    return $conn->callError($id, array('id' => $room->getId(), 'name' => $room->getName(), 'error' => 'Room already exists'));
                }
            break;

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

            // @todo : it's the "remember my session" feature! Should be refactored in a RPC call that client can

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

        // Is this room already in memory?
        if (!array_key_exists($roomId, $this->roomsList)) {
            // Is this room exists in database?
            if (null === $room = $this->roomManager->findOneBy(array('id' => $roomId))) {
                echo "Room '{$topic}' not already exists, please call 'createRoom' before\n";
                return;
            }

            // Room data
            $this->roomsList[$roomId] = $room;
            // Room user list
            $this->userRoom[$roomId] = new \SplObjectStorage();
        }

        // Add user to broadcast list
        echo "{$conn->WAMP->sessionId} has just subscribed to {$topic}\n";
        $this->userRoom[$roomId]->attach($conn);

        // Register this room in user connection
        $conn->Chat->rooms[$roomId] = $topic;

        // Push room data (on control topic)
        $conn->event($topic, array('action' => 'enterInRoom', 'data' => array(
            'name' => $this->roomsList[$roomId]->getName(),
        )));

        // Push room users
        foreach ($this->userRoom[$roomId] as $attendee) {
            $conn->event($topic, array('action' => 'userInRoom', 'data' => array(
                'id' => $attendee->User->id,
                'username' => $attendee->User->username,
                'notify' => false, // false to not notify this user addition in message list
            )));
        }

        // Push room title
        $conn->event($topic, array('action' => 'roomTitle', 'data' => array(
            'title' => $this->roomsList[$roomId]->getTopic(),
        )));

        // Notify everyone this guy has joined the room
        $this->broadcast($roomId, array('action' => 'userInRoom', 'data' => array(
                'id' => $conn->User->id,
                'username' => $conn->User->username,
            ), $conn // exclude current user of this notification, he knows is in...
        ));
    }

    /**
     * {@inheritdoc}
     */
    function onUnSubscribe(ConnectionInterface $conn, $topic)
    {
        // $topic is valid
        if (!$this->topicIsRoom($topic)) {
            echo "Topic '{$topic}' not corresponds to room topic pattern\n";
            return;
        }
        $roomId = $this->findIdFromTopic($topic);

        // Remove from user room list
        unset($conn->Chat->rooms[$roomId]);

        // Remove from server room attendees list
        $this->userRoom[$roomId]->detach($conn);
        echo "{$conn->WAMP->sessionId} has just UN-subscribed to {$topic}\n";

        // Notify everyone this guy has leaved the room
        $this->broadcast($roomId, array('action' => 'userOutRoom', 'data' => array(
                'id' => $conn->User->id,
                'username' => $conn->User->username,
            ), $conn // exclude current user of this notification
        ));

//        if ($this->isControl($topic)) {
//            return;
//        }

//        if ($this->rooms[$topic]->count() == 0) {
//            unset($this->rooms[$topic], $this->roomLookup[array_search($topic, $this->roomLookup)]);
//            $this->broadcast(static::CONTROL_TOPIC, array($topic, 0));
//        } else {
//            $this->broadcast($topic, array('leftRoom', $conn->WAMP->sessionId));
//        }
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

        $message = $this->escape($event);

        $this->broadcast($roomId, array(
            'action' => 'message',
            'data' => array(
                'user_id' => $conn->User->id,
                'username' => $conn->User->username,
                'message' => $message,
                'time' => time(),
            ),
        ));
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
     * @param mixed $event
     * @param ConnectionInterface $exclude The user connection to exclude from broadcast
     */
    protected function broadcast($roomId, $event, ConnectionInterface $exclude = null)
    {
        $topic = self::TOPIC_ROOM_PREFIX . $roomId;

        // If at least one $conn registered
        foreach ($this->userRoom[$roomId] as $client) {
            if ($client !== $exclude) {
                $client->event($topic, $event);
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