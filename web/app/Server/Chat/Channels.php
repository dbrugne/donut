<?php

namespace Server\Chat;

class Channels
{
    /**
     * Silex application
     *
     * @var Application
     */
    protected $_app;

    /**
     * @var array
     */
    protected $_channels = array();

    /**
     * @var array
     */
    protected $_topics;

    public function __construct(\Silex\Application $app)
    {
        $this->_app = $app;

        $this->_topics = array(
            'control'    => "ws://chat.local/control",
            'discussion' =>  "ws://chat.local/discussion",
            'room'    => "ws://chat.local/room#",
        );
    }

    /**
     * Determine, retrieve and return the channel object
     * Could be a Control, Discussion or a Room
     *
     * @param string $topic
     * @return Control|Room|Discussion|null
     */
    public function retrieveFromTopic($topic)
    {
        $matches = array(); // @todo: could be declared directly in function call?
        if (!isset($this->_channels[$topic])) {

            // Control
            if ($topic == $this->_topics['control']) {
                $this->_channels[$topic] = new Control($this->_app);

            // Discussion
            } else if ($topic == $this->_topics['discussion']) {
                $this->_channels[$topic] = new Discussion($this->_app);

            // Room
            } else if (preg_match(str_replace('#!#', $this->_topics['room'], "@^#!#([1-9]+[0-9]*)$@"), $topic, $matches)) {
                $entityId = $matches[1];
                if (null === $entity = $this->_app['room.manager']->findOneBy(array('id' => $entityId))) {
                    $this->_app['monolog']->error('retrieveFromTopic', array('topic' => $topic, 'error' => "Unable to find room '{$entityId}' in database"));
                    return null;
                }
                $entity->setApp($this->_app);
                $entity->setTopic($topic);
                $this->_channels[$topic] = $entity;

            // Error
            } else {
                $this->_app['monolog']->error('retrieveFromTopic', array('topic' => $topic, 'error' => 'Unable to establish topic channel type'));
                return null;
            }
        }

        return $this->_channels[$topic];
    }

    public function getControlTopic()
    {
        return $this->_topics['control'];
    }

    public function getDiscussionTopic()
    {
        return $this->_topics['discussion'];
    }

    public function getRoomTopic($roomId)
    {
        return $this->_topics['room'] . $roomId;
    }

    public function getControl()
    {
        return $this->retrieveFromTopic($this->getControlTopic());
    }

    public function getDiscussion()
    {
        return $this->retrieveFromTopic($this->getDiscussionTopic());
    }
}