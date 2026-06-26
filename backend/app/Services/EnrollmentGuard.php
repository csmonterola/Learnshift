<?php

namespace App\Services;

use App\Models\Lesson;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class EnrollmentGuard
{
    /**
     * Check whether a student is enrolled in the class that owns the given lesson.
     *
     * Traverses: lesson → topic → schoolClass → students pivot.
     */
    public function isEnrolled(User $student, Lesson $lesson): bool
    {
        return $lesson->topic->schoolClass->students()
            ->where('users.id', $student->id)
            ->exists();
    }

    /**
     * Return a 403 JSON response if the student is not enrolled, or null if enrolled.
     */
    public function denyIfNotEnrolled(User $student, Lesson $lesson): ?JsonResponse
    {
        if (!$this->isEnrolled($student, $lesson)) {
            return response()->json(
                ['error' => 'You are not enrolled in this class.'],
                403
            );
        }

        return null;
    }
}
