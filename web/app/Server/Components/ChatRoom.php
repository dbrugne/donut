<?php
namespace Server\Components;
use Ratchet\ConnectionInterface;
use Ratchet\Wamp\WampServerInterface;
use App\Chat\RoomManager;
use App\Chat\Room;
use App\Chat\UserRoomManager;
use App\Chat\UserRoom;
use App\Chat\MessageManager;
use App\Chat\Message;

class ChatRoom implements WampServerInterface
{

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
     * Current rooms list
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
     * Subscribed users of each room
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
     * Opened $conn of a specific user account
     *
     * array(
     *   user_id => SplObjectStorage(
     *        ConnectionInterface,
     *        ...
     *     )
     *   ...
     * )
     *
     * @var array
     */
    protected $userConn = array();

    /**
     * @var \App\Orm\EntityManager
     */
    protected $roomManager = null;

    /**
     * @var \App\Orm\EntityManager
     */
    protected $userRoomManager = null;

    /**
     * @var \App\Orm\EntityManager
     */
    protected $messageManager = null;

    /**
     * Constructor
     *
     * @param Application $app
     */
    public function __construct(\Silex\Application $app)
    {
        $this->controlTopicUsers = new \SplObjectStorage;
        $this->roomManager = new \App\Chat\RoomManager($app);
        $this->userRoomManager = new \App\Chat\UserRoomManager($app);
        $this->messageManager = new \App\Chat\messageManager($app);

        echo "Current timestamp is: " . time() . "\n";
        echo "Current date/hour is: " . date('c') . "\n";
    }

    /**
     * {@inheritdoc}
     */
    public function onOpen(ConnectionInterface $conn) {
        $conn->Chat        = new \StdClass;
        $conn->Chat->rooms = array();
        $conn->closingConnection = false;

        // If not Bot only
        if ($conn->resourceId != -1) {
            if (!isset($this->userConn[$conn->User->id]) || !($this->userConn[$conn->User->id] instanceOf \SplObjectStorage)) {
                $this->userConn[$conn->User->id] = new \SplObjectStorage;
            }
            $this->userConn[$conn->User->id]->attach($conn);
        }
    }

    /**
     * {@inheritdoc}
     */
    public function onClose(ConnectionInterface $conn)
    {
        // Avoid "user_room" deletion to allow user to refind his session from database on next visit
        $conn->closingConnection = true;

        // Unsubscribe from rooms
        foreach ($conn->Chat->rooms as $roomId => $topic)
        {
            $this->onUnSubscribe($conn, $topic);
        }

        // Unsubscribe from control topic
        $this->controlTopicUsers->detach($conn);

        // If not Bot only
        if ($conn->resourceId != -1) {
            $this->userConn[$conn->User->id]->detach($conn);
            if ($this->userConn[$conn->User->id]->count() < 1) {
                unset($this->userConn[$conn->User->id]);
            }
        }
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

            case 'changeBaseline':
                $roomId = $this->escape($params[0]);
                $baseline = $this->escape($params[1]);
                echo "Baseline change requested: room={$roomId} baseline={$baseline} \n";
                if (!isset($this->roomsList[$roomId])) {
                    return $conn->callError($id, "The room '{$roomId}' is not referenced in memory'");
                }
                if (null === $room = $this->roomManager->findOneBy(array('id' => $roomId))) {
                    return $conn->callError($id, "The room '{$roomId}' not already exist in database'");
                }

                // Save in database
                $this->roomManager->update(array('baseline' => $baseline), array('id' => $roomId));

                // Save in memory
                $this->roomsList[$roomId]->setBaseline($baseline);

                // Push to users
                $this->broadcast($roomId, array(
                    'action' => 'roomBaseline',
                    'data' => array(
                        'baseline' => $baseline,
                        'username' => $conn->User->username,
                    ),
                ));

                return $conn->callResult($id);
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

                    // Inform everyone that room was created (control topic)
                    foreach($this->controlTopicUsers as $connToNotify) {
                        $connToNotify->event(self::CONTROL_TOPIC, array(
                            'action' => 'newAvailableRoom',
                            'data' => array(
                                'id' => $roomId,
                                'name' => $name,
                            ),
                        ));
                    }

                    // Return as created to client
                    return $conn->callResult($id, array('id' => $roomId, 'name' => $name));
                } else {
                    return $conn->callError($id, array('id' => $room->getId(), 'name' => $room->getName(), 'error' => 'Room already exists'));
                }
            break;

            case 'userIsInRooms':
                $roomList = array();
                $roomsListDatabase = $this->userRoomManager->findBy(array('user_id' => $conn->User->id));
                if (count($roomsListDatabase) > 0) {
                    foreach($roomsListDatabase as $room) {
                        $roomList[] = $room->getData();
                    }
                }
                return $conn->callResult($id, $roomList);
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

        // Store user_room in database (if not already exists, user could be in this room in another device/browser)
        $this->userRoomManager->insertOrUpdate(array(
            'room_id' => $roomId,
            'user_id' => $conn->User->id,
        ));

        // Inform other devices that they should join to room!
        if ($conn->resourceId != -1) {
            foreach ($this->userConn[$conn->User->id] as $connToNotify) {
                if ($conn != $connToNotify) {
                    $connToNotify->event(self::CONTROL_TOPIC, array('action' => 'joinRoomFromOtherDevice', 'data' => array('room_id' => $roomId)));
                }
            }
        }

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

        // Push room baseline
        if (null != $this->roomsList[$roomId]->getBaseline()) {
            $conn->event($topic, array('action' => 'roomBaseline', 'data' => array(
                'baseline' => $this->roomsList[$roomId]->getBaseline(),
                'notify' => false,
            )));
        }

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

        if ($conn->closingConnection !== true) {
            // Is user_room already exist in database (if not we have a problem Houston)
            if (null !== $room = $this->userRoomManager->findOneBy(array('user_id' => $conn->User->id, 'room_id' => $roomId))) {
                // Delete user_room in database
                $this->userRoomManager->delete(array('user_id' => $conn->User->id, 'room_id' => $roomId));
            }
        }

        // Inform other device that they should leave to room!
        foreach ($this->userConn[$conn->User->id] as $connToNotify) {
            if ($conn != $connToNotify) {
                $connToNotify->event(self::CONTROL_TOPIC, array('action' => 'leaveRoomFromOtherDevice', 'data' => array('room_id' => $roomId)));
            }
        }

        // Notify everyone this guy has leaved the room
        $this->broadcast($roomId, array('action' => 'userOutRoom', 'data' => array(
                'id' => $conn->User->id,
                'username' => $conn->User->username,
            ), $conn // exclude current user of this notification
        ));

        // If it was the last user in room and if room is not protected
        // The bot should be the last user
        // @todo : refactor $this->userRoom to be able to know how many "real" user remain
        if (1 != $this->roomsList[$roomId]->getProtected()
              && 1 >= $this->userRoom[$roomId]->count()){
            // Delete room in database
            $this->roomManager->delete(array('id' => $roomId));
            unset($this->userRoom[$roomId]);
            unset($this->roomsList[$roomId]);

            // Inform everyone that room was removed (control topic)
            foreach($this->controlTopicUsers as $connToNotify) {
                $connToNotify->event(self::CONTROL_TOPIC, array(
                    'action' => 'removeAvailableRoom',
                    'data' => array(
                        'id' => $roomId,
                    ),
                ));
            }

            echo "Room {$roomId} deleted\n";
        }

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
        if (!$this->userRoom[$roomId]->contains($conn)) {
            echo "User has not subscribed to this room '{$roomId}'\n";
            return;
        }

        $message = $this->escape($event);

        // Store message in database
        $this->messageManager->insert(array(
            'user_id' => $conn->User->id,
            'room_id' => $roomId,
            'username' => $conn->User->username,
            'message' => $message,
        ));

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
        return (boolean)(substr($room, 0, strlen(static::CONTROL_TOPIC)) == static::CONTROL_TOPIC);
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