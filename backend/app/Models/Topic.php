<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Topic extends Model
{
    use HasFactory;

    protected $fillable = ['quarter_id', 'class_id', 'title', 'description', 'order', 'order_index', 'lesson_count'];

    public function quarter()
    {
        return $this->belongsTo(Quarter::class);
    }

    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function lessons()
    {
        return $this->hasMany(Lesson::class)->orderBy('order');
    }

    public function questions()
    {
        return $this->hasMany(Question::class);
    }

    public function studentProgress()
    {
        return $this->hasMany(StudentTopicProgress::class);
    }
}
