<?php

namespace Database\Factories;

use App\Models\SchoolClass;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class SchoolClassFactory extends Factory
{
    protected $model = SchoolClass::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->randomElement(['Math 101', 'Science 202', 'English 303', 'History 404']),
            'grade_level' => $this->faker->numberBetween(1, 12),
            'section' => $this->faker->randomElement(['A', 'B', 'C']),
            'school_year' => $this->faker->year(),
            'teacher_id' => User::factory(),
            'subject' => $this->faker->randomElement(['Mathematics', 'Science', 'English', 'History']),
            'is_active' => true,
        ];
    }
}