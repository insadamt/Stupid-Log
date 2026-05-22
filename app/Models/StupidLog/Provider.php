<?php

namespace App\Models\StupidLog;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['key', 'name'])]
class Provider extends Model {}
