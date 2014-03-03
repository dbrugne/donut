<?php

namespace Server\Chat;
use Ratchet\ConnectionInterface;
use App\Chat;

class Discussion
{
    /**
     * Silex application
     *
     * @var Application
     */
    protected $_app;

    /**
     * @var \SplObjectStorage
     */
    protected $_subscribers;

    public function __construct(\Silex\Application $app)
    {
        $this->_app = $app;
        $this->_subscribers = new \SplObjectStorage();
    }

    public function subscribe(ConnectionInterface $conn)
    {
        $this->_subscribers->attach($conn);
    }

    public function unsubscribe(ConnectionInterface $conn)
    {
        $this->_subscribers->detach($conn);
    }

    public function publish(ConnectionInterface $connFrom, $event, array $exclude = array(), array $eligible = array())
    {
        $message = $event['message'];
        $message = $this->escape((string)$message);

        if (empty($message)) {
            $connFrom->event($this->_topic, array('action' => 'publishError', 'data' => array('error' => "Empty event.message published by '{$connFrom->User->getId()}' on discussion topic")));
            return;
        }

        $outputEvent = array(
            'action' => 'message',
            'data' => array(
                'with_user_id' => $event['with_user_id'],
                'user_id' => $connFrom->User->getId(),
                'username' => $connFrom->User->getUsername(),
                'avatar' => $connFrom->User->getAvatarUrl(20),
                'message' => $message,
                'time' => time(),
            ),
        );
        $connFrom->event($this->_app['channels']->getDiscussionTopic(), $outputEvent);
        if ($connFrom->User->getId() != $event['with_user_id']) { // user speak to himself
            // @todo: optimize user search
            foreach($this->_subscribers as $connTo) {
                if ($connTo->User->getId() == $event['with_user_id']) {
                    $outputEvent['data']['with_user_id'] = $connFrom->User->getId();
                    $connTo->event($this->_app['channels']->getDiscussionTopic(), $outputEvent);
                    break;
                }
            }
        }

        $this->_app['monolog']->info("New discussion message from '{$connFrom->User->getId()}' to '{$event['with_user_id']}': '{$message}'");
    }

    /**
     * @param string
     * @return string
     */
    protected function escape($string)
    {
        return htmlspecialchars($string);
    }

}
