<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Subject extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'code', 'icon', 'color', 'description'];

    public function quarters()
    {
        return $this->hasMany(Quarter::class);
    }

    public function classes()
    {
        return $this->hasMany(SchoolClass::class);
    }

    public function learningMaterials()
    {
        return $this->hasMany(LearningMaterial::class);
    }
}
