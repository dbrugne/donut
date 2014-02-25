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
use App\User\User;

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
     * @var Discussion[]
     */
    protected $_discussions = array();

    /**
     * @var Room[]
     */
    protected $_rooms = array();

    /**
     * Opened $conn of a specific user account
     *
     * @var ConnectionInterface[]
     */
    protected $userDevices = array();

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
        $this->messageManager = new \App\Chat\MessageManager($app);

        echo "Current timestamp is: " . time() . "\n";
        echo "Current date/hour is: " . date('c') . "\n";
    }

    /**
     * {@inheritdoc}
     */
    public function onOpen(ConnectionInterface $conn) {
        $conn->closingConnection = false;

        // If not Bot only
        if ($conn->resourceId != -1) {
            if (!isset($this->userDevices[$conn->User->getId()]) || !($this->userDevices[$conn->User->getId()] instanceOf \SplObjectStorage)) {
                $this->userDevices[$conn->User->getId()] = new \SplObjectStorage;
            }
            $this->userDevices[$conn->User->getId()]->attach($conn);
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
        $subscribedRooms = $this->userRoomManager->findBy(array('user_id' => $conn->User->getId()));
        foreach ($subscribedRooms as $subscribedRoom)
        {
            $this->onUnSubscribe($conn, self::TOPIC_ROOM_PREFIX . $subscribedRoom->getRoomId());
        }

        // Unsubscribe from control topic
        $this->controlTopicUsers->detach($conn);

        // Remove from user device list
        $this->userDevices[$conn->User->getId()]->detach($conn);
        if ($this->userDevices[$conn->User->getId()]->count() < 1) {
            unset($this->userDevices[$conn->User->getId()]);
        }
    }

    /**
     * {@inheritdoc}
     */
    public function onError(ConnectionInterface $conn, \Exception $e)
    {
        $conn->close();
    }

    /**
     * {@inheritdoc}
     */
    function onCall(ConnectionInterface $conn, $id, $fn, array $params)
    {
        switch ($fn) {

            case 'searchForRooms':
                $search = $this->escape($params[0]);
                $roomList = array();
                $criteria = array('name' => array('like' => $search));
                foreach ($this->roomManager->findBy($criteria) as $room)
                {
                    $roomList[] = $room->getData();
                }

                return $conn->callResult($id, $roomList);
            break;

            case 'changeBaseline':
                $roomId = $this->escape($params[0]);
                $baseline = $this->escape($params[1]);
                if (null == $room = $this->getRoom($roomId)) {
                    return $conn->callError($id, "The room '{$roomId}' not already exist'");
                }

                // Save in database
                $this->roomManager->update(array('baseline' => $baseline), array('id' => $roomId));

                // Save in memory
                $room->setBaseline($baseline);

                // Push to users
                $this->broadcastToRoomUsers($roomId, array(
                    'action' => 'roomBaseline',
                    'data' => array(
                        'baseline' => $baseline,
                        'username' => $conn->User->getUsername(),
                    ),
                ));

                echo "Baseline of '{$roomId}' changed to '{$baseline}' by '{$conn->User->getId()}'\n";
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

                    // Return as created to client
                    return $conn->callResult($id, array('id' => $roomId, 'name' => $name));
                } else {
                    return $conn->callError($id, array('id' => $room->getId(), 'name' => $room->getName(), 'error' => 'Room already exists'));
                }
            break;

            case 'userIsInRooms':
                $roomList = array();
                $roomsListDatabase = $this->userRoomManager->findBy(array('user_id' => $conn->User->getId()));
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
        // @todo: remove Bot and replace by local welcome message

        /****************
         * CONTROL TOPIC
         ***************/
        if ($topic == self::CONTROL_TOPIC) {
            $this->controlTopicUsers->attach($conn);
            echo "{$conn->WAMP->sessionId} has just subscribed to {$topic}\n";
            return;
        }

        /****************
         * ONE TO ONE
         ***************/
        // @todo

        /****************
         * ROOM TOPIC
         ***************/
        // $topic is a valid rooms
        if (false === $roomId = $this->retrieveRoomIdFromTopic($topic)) {
            // @todo : handle that message on client side (or indicate error better)
            $conn->event($topic, array("Topic '{$topic}' not corresponds to room topic pattern"));
            return;
        }

        // Is this room exists?
        if (null == $room = $this->getRoom($roomId)) {
            // @todo : handle that message on client side (or indicate error better)
            $conn->event($topic, array("Room '{$topic}' not already exists (onSubscribe)"));
            return;
        }

        // Add user to room broadcast list
        $this->addUserRoom($conn, $roomId);

        // Inform other device that they should join to room!
        $this->broadcastToUserDevices($conn->User->getId(), array(
            'action' => 'joinRoomFromOtherDevice',
            'data' => array('room_id' => $roomId)
        ));

        // Push room data (on control topic)
        // @todo: bad thing, the client should be only responsible to createIhm after subscribing, remove this event!
        $conn->event($topic, array('action' => 'enterInRoom', 'data' => array(
            'name' => $room->getName(),
        )));

        // Push room baseline
        if (null != $room->getBaseline()) {
            $conn->event($topic, array('action' => 'roomBaseline', 'data' => array(
                'baseline' => $room->getBaseline(),
                'notify' => false,
            )));
        }

        // Push room users
        foreach ($room->getUsers() as $attendee) {
            $conn->event($topic, array(
                'action' => 'userInRoom',
                'data' => array(
                    'id' => $attendee->User->getId(),
                    'username' => $attendee->User->getUsername(),
                    'avatar' => $attendee->User->getAvatarUrl(20),
                )
            ));
        }

        // Push welcome message
        $tmpUser = new User("Room bot");
        $tmpUser->setId(0);
        $tmpUser->setEmail("bot@bot.com");
        $conn->event($topic, array(
            'action' => 'message',
            'data' => array(
                'user_id' => $tmpUser->getId(),
                'username' => $tmpUser->getUsername(),
                'avatar' => $tmpUser->getAvatarUrl(20),
                'message' => "Hi {$conn->User->getUsername()}, welcome on this chan. Please be polite and fair with others.",
                'time' => time(),
            ),
        ));

        // Notify everyone this user has joined the room
        $this->broadcastToRoomUsers($roomId, array(
            'action' => 'userEnterInRoom',
            'data' => array(
                'id' => $conn->User->getId(),
                'username' => $conn->User->getUsername(),
                'avatar' => $conn->User->getAvatarUrl(20),
            )
        ), $conn);

        echo "User '{$conn->User->getId()}' ({$conn->WAMP->sessionId}) has just subscribed to {$topic}\n";
    }

    /**
     * {@inheritdoc}
     */
    function onUnSubscribe(ConnectionInterface $conn, $topic)
    {
        // $topic is a valid rooms
        if (false === $roomId = $this->retrieveRoomIdFromTopic($topic)) {
            // @todo : handle that message on client side (or indicate error better)
            $conn->event($topic, array("Topic '{$topic}' not corresponds to room topic pattern"));
            return;
        }

        // Is this room exists?
        if (null == $room = $this->getRoom($roomId)) {
            // @todo : handle that message on client side (or indicate error better)
            $conn->event($topic, array("Room '{$topic}' not already exists (onUnSubscribe)"));
            return;
        }

        // Remove from room user list
        $this->removeUserRoom($conn, $roomId);

        // Inform other device that they should leave to room!
        $this->broadcastToUserDevices($conn->User->getId(), array(
            'action' => 'leaveRoomFromOtherDevice',
            'data' => array('room_id' => $roomId)
        ));

        // Notify everyone this guy has leaved the room
        $this->broadcastToRoomUsers($roomId, array(
            'action' => 'userOutRoom',
            'data' => array(
                'id' => $conn->User->getId(),
                'username' => $conn->User->getUsername(),
                'avatar' => $conn->User->getAvatarUrl(20),
            )
        ), $conn);

        // Room should be removed? (last user just leaved and not protected)
        if (count($room->getUsers()) < 1 && 1 != $room->getProtected()) {
            $this->removeRoom($roomId);
        }

        echo "{$conn->WAMP->sessionId} has just UN-subscribed to {$topic}\n";
    }

    /**
     * {@inheritdoc}
     */
    function onPublish(ConnectionInterface $conn, $topic, $event, array $exclude = array(), array $eligible = array())
    {
        $event = (string)$event;
        if (empty($event)) {
            echo "Empty event published by '{$conn->User->getId()}' on '{$topic}'\n";
            return;
        }
        $message = $this->escape($event);

        // $topic is a valid rooms
        if (false === $roomId = $this->retrieveRoomIdFromTopic($topic)) {
            // @todo : handle that message on client side (or indicate error better)
            $conn->event($topic, array("Topic '{$topic}' not corresponds to room topic pattern"));
            return;
        }

        // Is this room exists?
        if (null == $room = $this->getRoom($roomId)) {
            // @todo : handle that message on client side (or indicate error better)
            $conn->event($topic, array("Room '{$topic}' not already exists (onPublish)"));
            return;
        }

        // This room is not subscribed by user
        if (!$room->getUsers()->contains($conn)) {
            // @todo : handle that message on client side (or indicate error better)
            $conn->event($topic, array("User '{$conn->User->getId()}' has not subscribed to the room '{$roomId}'\n"));
            return;
        }

        // Archive message in database
        $this->messageManager->insert(array(
            'user_id' => $conn->User->getId(),
            'room_id' => $roomId,
            'username' => $conn->User->getUsername(),
            'message' => $message,
        ));

        $this->broadcastToRoomUsers($roomId, array(
            'action' => 'message',
            'data' => array(
                'user_id' => $conn->User->getId(),
                'username' => $conn->User->getUsername(),
                'avatar' => $conn->User->getAvatarUrl(20),
                'message' => $message,
                'time' => time(),
            ),
        ));
    }

    /**
     * Broadcast an event on control topic to all $conn of a particular user
     *
     * @param int $userId
     * @param mixed $event
     */
    protected function broadcastToUserDevices($userId, $event)
    {
        foreach ($this->userDevices[$userId] as $client) {
            $client->event(self::CONTROL_TOPIC, $event);
        }
    }

    /**
     * Broadcast an event to all users of a particular room
     *
     * @param int $roomId
     * @param mixed $event
     * @param ConnectionInterface $exclude The user connection to exclude from broadcast
     */
    protected function broadcastToRoomUsers($roomId, $event, ConnectionInterface $exclude = null)
    {
        $topic = self::TOPIC_ROOM_PREFIX . $roomId;
        foreach ($this->getRoom($roomId)->getUsers() as $conn) {
            if ($conn !== $exclude) {
                $conn->event($topic, $event);
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

    /**
     * Analyse $topic and return the corresponding room_id
     * or false if $topic is not well formed
     *
     * @param string $topic
     * @return int|false
     */
    protected function retrieveRoomIdFromTopic($topic)
    {
        $matches = array();
        $match = preg_match("@^".self::TOPIC_ROOM_PREFIX."([1-9]+[0-9]*)@", $topic, $matches);
        if ($match === false) {
            return false;
        } else if ($match == 0) {
            return null;
        }

        return $matches[1];
    }

    /**
     * Retrieve room in memory and return.
     * If not in memory retrieve in database.
     * If not in database return null.
     *
     * @param int $roomId
     * @return Room|null
     */
    protected function getRoom($roomId)
    {
        // is in memory
        if (!array_key_exists($roomId, $this->_rooms)) {
            // is in database
            if (null === $room = $this->roomManager->findOneBy(array('id' => $roomId))) {
                echo "Room '{$roomId}' not already exists (getRoom)\n";
                return null;
            }

            $this->_rooms[$roomId] = $room;
            $this->_rooms[$roomId]->setUsers(new \SplObjectStorage());
        }

        return $this->_rooms[$roomId];
    }

    /**
     * Remove room form memory and database.
     *
     * @param int $roomId
     */
    protected function removeRoom($roomId)
    {
        // database
        $this->roomManager->delete(array(
            'id' => $roomId,
            'protected' => 0, // additionnal protection
        ));

        // memory
        unset($this->_rooms[$roomId]);

        echo "Room {$roomId} was deleted\n";
    }

    /**
     * Add a new user room association
     *
     * @param $conn
     * @param $roomId
     */
    protected function addUserRoom($conn, $roomId)
    {
        $room = $this->getRoom($roomId);
        $userList = $room->getUsers();
        if ($userList->contains($conn)) {
            echo "User '{$conn->User->getId()}' already in the user list\n";
            return;
        }

        // Store user_room in database
        // (if not already exists, user could be in this room in another device/browser)
        $this->userRoomManager->insertOrUpdate(array(
            'room_id' => $roomId,
            'user_id' => $conn->User->getId(),
        ));

        $userList->attach($conn);
    }

    /**
     * Remove a user room association
     *
     * @param $conn
     * @param $roomId
     */
    protected function removeUserRoom($conn, $roomId)
    {
        $room = $this->getRoom($roomId);
        $userList = $room->getUsers();

        // Remove from database
        if ($conn->closingConnection !== true) {
            $this->userRoomManager->delete(array('user_id' => $conn->User->getId(), 'room_id' => $roomId));
        }

        if (!$userList->contains($conn)) {
            echo "User '{$conn->User->getId()}' NOT in the user list\n";
            return;
        }

        // Remove from memory
        $userList->detach($conn);
    }
}