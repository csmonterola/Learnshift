<?php

namespace Database\Factories;

use App\Models\LearningMaterial;
use App\Models\User;
use App\Models\Lesson;
use Illuminate\Database\Eloquent\Factories\Factory;

class LearningMaterialFactory extends Factory
{
    protected $model = LearningMaterial::class;

    public function definition(): array
    {
        $fileTypes = ['PDF', 'DOCX', 'PPTX', 'DOC', 'PPT', 'TXT'];
        $fileType = $this->faker->randomElement($fileTypes);
        $fileName = $this->faker->word() . '.' . strtolower($fileType);
        
        return [
            'teacher_id' => User::factory(),
            'lesson_id' => Lesson::factory(),
            'title' => $this->faker->sentence(3),
            'file_path' => 'lessons/1/materials/' . $fileName,
            'file_name' => $fileName,
            'file_type' => $fileType,
            'file_size' => $this->faker->numberBetween(1000, 50000),
            'ai_sync' => $this->faker->boolean(),
            'ingestion_status' => $this->faker->randomElement(['pending', 'processing', 'indexed', 'failed']),
        ];
    }
}