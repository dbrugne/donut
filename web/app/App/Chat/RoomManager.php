<?php

namespace App\Chat;

use App\Orm\EntityManager;

class RoomManager extends EntityManager
{
    /** @var string */
    protected $table = 'rooms';

    /** @var string */
    protected $entityClass = "\\App\\Chat\\Room";

} 