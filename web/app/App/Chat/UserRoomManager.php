<?php

namespace App\Chat;

use App\Orm\EntityManager;

class UserRoomManager extends EntityManager
{
    /** @var string */
    protected $table = 'user_room';

    /** @var string */
    protected $entityClass = "\\App\\Chat\\UserRoom";

    /**
     * Return the online users list for a given room_id
     *
     * @param int $room_id
     * @return User[]
     */
    public function usersList($room_id)
    {
        $sql = "SELECT * FROM `{$this->table}` AS p LEFT JOIN `users` AS u ON u.`id` = p.`user_id` WHERE p.`room_id` = :room_id ORDER BY u.`username`";
        if (false === $result = $this->app['db']->fetchAll($sql, array('room_id' => $room_id))) {
            return array();
        } else {
            $array = array();
            foreach ($result as $data) {
                $array[] = $this->hydrateEntity($data);
            }

            return $array;
        }
    }

    /**
     * Return the rooms list for a given user_id
     *
     * @param int $user_id
     * @return Room[]
     */
    public function roomsList($user_id)
    {
        $sql = "SELECT * FROM `{$this->table}` AS p LEFT JOIN `rooms` AS r ON r.`id` = p.`room_id` WHERE p.`user_id` = :user_id ORDER BY r.`name`";
        if (false === $result = $this->app['db']->fetchAll($sql, array('user_id' => $user_id))) {
            return array();
        } else {
            $array = array();
            foreach ($result as $data) {
                $array[] = $this->hydrateEntity($data);
            }

            return $array;
        }
    }
} 