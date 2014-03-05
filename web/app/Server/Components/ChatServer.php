<?php

namespace Server\Components;
use Ratchet\ConnectionInterface;
use Ratchet\Wamp\WampServerInterface;
use Server\Chat;

class ChatServer implements WampServerInterface
{

    /**
     * @var \Silex\Application
     */
    protected $_app;

    /**
     * Opened connections
     *
     * @var int
     */
    protected $_openedConnection = 0;

    /**
     * Channel list, key is topic
     * Value could be Control, Discussion or Room object
     *
     * @var array
     */
    protected $_channels = array();

    /**
     * @param Application $app
     */
    public function __construct(\Silex\Application $app)
    {
        $this->_app = $app;
        $this->_app['monolog']->info("Current date/hour is: " . date('c') . " (timestamp: " . time() . ")");
        $this->_app['channels'] = new Chat\Channels($this->_app);
        $this->_app['users'] = new Chat\Users($this->_app);
    }

    /**
     * @param string
     * @return string
     */
    protected function escape($string)
    {
        return htmlspecialchars($string);
    }

    /**
     * {@inheritdoc}
     */
    public function onOpen(ConnectionInterface $conn)
    {
        $this->_openedConnection ++;
        $this->_app['users']->addConn($conn);

        $conn->subscribedRooms = array();

        $this->_app['monolog']->addInfo('onOpen', array('#open' => $this->_openedConnection, 'id' => $conn->resourceId, 'ip' => $conn->remoteAddress));
    }

    /**
     * {@inheritdoc}
     */
    public function onClose(ConnectionInterface $conn)
    {
        $this->_openedConnection --;
        $this->_app['users']->removeConn($conn);

        // Unsubscribe from static topics
        $this->_app['channels']->getControl()->unsubscribe($conn);
        $this->_app['channels']->getDiscussion()->unsubscribe($conn);

        // Unsubscribe from rooms
        foreach ($conn->subscribedRooms as $subscribedRoomTopic)
        {
            $entity = $this->_app['channels']->retrieveFromTopic($subscribedRoomTopic);
            $entity->unsubscribe($conn, true);

            // Room should be removed? (last user just leaved and not protected)
            if ($entity->shouldBeRemoved()) {
                // Database
                $entity->delete();
                // Memory
                $this->_app['channels']->remove($subscribedRoomTopic);
                unset($entity);
                $this->_app['monolog']->info("Room '{$subscribedRoomTopic}' was removed");
            }
        }

        $this->_app['monolog']->addInfo('onClose', array('#open' => $this->_openedConnection, 'id' => $conn->resourceId));
    }

    /**
     * {@inheritdoc}
     */
    public function onSubscribe(ConnectionInterface $conn, $topic)
    {
        // Which channel?
        $entity = $this->_app['channels']->retrieveFromTopic($topic);
        if (null === $entity) {
            $error = "Unable to subscribe to this topic '{$topic}', topic not exists or malformed";
            $conn->event($topic, array('action' => 'subscribeError', 'data' => array('message' => $error)));
            $this->_app['monolog']->error($error, array('user_id' => $conn->User->getId(), 'sessionId' => $conn->WAMP->sessionId));
            return;
        }

        // Subscribe
        $entity->subscribe($conn);
        $this->_app['monolog']->info("User '{$conn->User->getId()}' ({$conn->WAMP->sessionId}) has just subscribed to {$topic}");
    }

    /**
     * {@inheritdoc}
     */
    public function onUnSubscribe(ConnectionInterface $conn, $topic)
    {
        $entity = $this->_app['channels']->retrieveFromTopic($topic);
        if (null === $entity) {
            $error = "Unable to unsubscribe to this topic '{$topic}', topic not exists or malformed";
            $this->_app['monolog']->error($error, array('user_id' => $conn->User->getId(), 'sessionId' => $conn->WAMP->sessionId));
            return;
        }

        $entity->unsubscribe($conn);
        $this->_app['monolog']->addInfo("User '{$conn->User->getId()}' ({$conn->WAMP->sessionId}) has just unsubscribed from {$topic}");

        // Room should be removed? (last user just leaved and not protected)
        if ($entity instanceOf Chat\Room && $entity->shouldBeRemoved()) {
            // Database
            $entity->delete();
            // Memory
            unset($this->_app['channels'][$topic], $entity);
            $this->_app['monolog']->info("Room '{$topic}' was removed");
        }
    }

    /**
     * {@inheritdoc}
     */
    public function onPublish(ConnectionInterface $conn, $topic, $event, array $exclude = array(), array $eligible = array())
    {
        $entity = $this->_app['channels']->retrieveFromTopic($topic);
        if (null === $entity) {
            // @todo : handle that message on client side (the publish callback should handle the error flag)
            $error = "Unable to publish to this topic '{$topic}', topic not exists or malformed";
            $conn->event($topic, array('action' => 'error', 'data' => array('message' => $error)));
            $this->_app['monolog']->error($error, array('user_id' => $conn->User->getId(), 'sessionId' => $conn->WAMP->sessionId));
            return;
        }

        $entity->publish($conn, $event, $exclude, $eligible);
        $this->_app['monolog']->info("User '{$conn->User->getId()}' ({$conn->WAMP->sessionId}) has just publish to {$topic}: '{$event['message']}'");
    }

    /**
     * {@inheritdoc}
     */
    public function onError(ConnectionInterface $conn, \Exception $e)
    {
        $this->_app['monolog']->error("onError: ({$e->getCode()}): {$e->getMessage()}", array('id' => $conn->resourceId, 'file' => $e->getFile(), 'line' => $e->getLine()));
        $conn->close();
    }

    /**
     * {@inheritdoc}
     */
    public function onCall(ConnectionInterface $conn, $id, $fn, array $params)
    {
        switch ($fn) {

            case 'searchForRooms':
                $this->_app['monolog']->info("searchRoom: {$params[0]}");
                $search = $this->escape($params[0]);
                $roomList = array();
                $criteria = array('name' => array('like' => $search));
                foreach ($this->_app['room.manager']->findBy($criteria) as $room) {
                    $roomData = $room->getData();
                    $roomData['topic'] = $this->_app['channels']->getRoomTopic($room->getId());
                    $roomData['count'] = $this->_app['channels']->countRoomUser($roomData['topic']);
                    $roomList[] = $roomData;
                }

                return $conn->callResult($id, $roomList);
            break;

            case 'searchForUsers':
                $this->_app['monolog']->info("searchForUsers: {$params[0]}");
                $search = $this->escape($params[0]);
                $userList = array();
                $criteria = array('username' => array('like' => $search));
                foreach ($this->_app['user.manager']->findBy($criteria) as $user) {
                    $userList[] = array(
                        'id' => $user->getId(),
                        'username' => $user->getUsername(),
                    );
                }

                return $conn->callResult($id, $userList);
                break;

            case 'changeBaseline':
                $entity = $this->_app['channels']->retrieveFromTopic($this->escape($params[0]));
                if ($entity instanceOf Chat\Room) {
                    $baseline = $this->escape($params[1]);
                    $entity->changeBaseline($baseline, $conn->User->getUsername());
                    $this->_app['monolog']->info("Baseline of '{$entity->getId()}' changed to '{$baseline}' by '{$conn->User->getId()}'");
                    return $conn->callResult($id);
                } else {
                    return $conn->callError($id, "The room topic '{$params[0]}' is not well formed");
                }
                break;

            case 'createRoom':
                $name   = $this->escape($params[0]);
                $created = false;

                if (empty($name)) {
                    return $conn->callError($id, 'Room name can not be empty');
                }

                // Test if room not already exist in database
                if (null === $room = $this->_app['room.manager']->findOneBy(array('name' => $name))) {
                    // Create room in database
                    $roomId = $this->_app['room.manager']->insert(array(
                        'name' => $name,
                    ));

                    // Return as created to client
                    return $conn->callResult($id, array('topic' => $this->_app['channels']->getRoomTopic($roomId), 'name' => $name));
                } else {
                    return $conn->callError($id, array('topic' => $this->_app['channels']->getRoomTopic($room->getId()), 'name' => $room->getName(), 'error' => 'Room already exists'));
                }
            break;

            default:
                return $conn->callError($id, 'Unknown call');
            break;

        }
    }

}