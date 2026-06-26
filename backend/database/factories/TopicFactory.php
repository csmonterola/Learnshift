<?php

namespace Database\Factories;

use App\Models\Topic;
use App\Models\SchoolClass;
use Illuminate\Database\Eloquent\Factories\Factory;

class TopicFactory extends Factory
{
    protected $model = Topic::class;

    public function definition(): array
    {
        return [
            'class_id' => SchoolClass::factory(),
            'title' => $this->faker->sentence(3),
            'description' => $this->faker->paragraph(),
            'order' => $this->faker->numberBetween(1, 10),
            'order_index' => $this->faker->numberBetween(1, 10),
            'lesson_count' => 0,
        ];
    }
}