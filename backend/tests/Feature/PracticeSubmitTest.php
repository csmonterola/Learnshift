<?php

namespace Tests\Feature;

use App\Models\Lesson;
use App\Models\PracticeAttempt;
use App\Models\Quarter;
use App\Models\Question;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PracticeSubmitTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;
    private User $student;
    private User $otherStudent;
    private SchoolClass $class;
    private Topic $topic;

    protected function setUp(): void
    {
        parent::setUp();

        $this->teacher = User::create([
            'name' => 'Teacher',
            'email' => 'teacher@test.com',
            'email_verified_at' => now(),
            'password' => bcrypt('password'),
            'role' => 'teacher',
        ]);

        $this->student = User::create([
            'name' => 'Student',
            'email' => 'student@test.com',
            'email_verified_at' => now(),
            'password' => bcrypt('password'),
            'role' => 'student',
        ]);

        $this->otherStudent = User::create([
            'name' => 'Other Student',
            'email' => 'otherstudent@test.com',
            'email_verified_at' => now(),
            'password' => bcrypt('password'),
            'role' => 'student',
        ]);

        $this->class = SchoolClass::create([
            'name' => 'Class A',
            'teacher_id' => $this->teacher->id,
            'subject' => 'Mathematics',
            'grade_level' => '10',
            'section' => 'A',
            'school_year' => '2025-2026',
        ]);
        $this->class->students()->attach($this->student->id);

        $subject = Subject::create(['name' => 'Mathematics', 'code' => 'MATH']);
        $quarter = Quarter::create(['subject_id' => $subject->id, 'grade_level' => '10', 'quarter_number' => 1]);
        $this->topic = Topic::create([
            'quarter_id' => $quarter->id,
            'class_id' => $this->class->id,
            'title' => 'Algebra',
        ]);
    }

    private function aiQuestions(int $count): array
    {
        $questions = [];
        for ($i = 0; $i < $count; $i++) {
            $questions[] = [
                'index' => $i,
                'question' => "Question $i",
                'options' => ['A', 'B', 'C', 'D'],
                'correct_index' => $i % 4,
                'explanation' => 'Why',
                'difficulty' => $i % 2 === 0 ? 'easy' : 'hard',
            ];
        }
        return $questions;
    }

    private function answersFor(array $questions, callable $pick): array
    {
        $answers = [];
        foreach ($questions as $i => $q) {
            $answers[$i] = $pick($i, $q);
        }
        return $answers;
    }

    public function test_standalone_submit_persists_question_meta_and_feeds_profile(): void
    {
        $this->actingAs($this->student, 'sanctum');

        $questions = $this->aiQuestions(10);
        // Easy questions answered correctly, hard ones deliberately wrong =>
        // value = clamp(0 - 1) = -1 => "Easy".
        $answers = $this->answersFor($questions, function (int $i, array $q) {
            return $i % 2 === 0 ? $q['correct_index'] : (($q['correct_index'] + 1) % 4);
        });

        $res = $this->postJson('/api/student/practice/submit', [
            'topic_id' => $this->topic->id,
            'answers' => $answers,
            'questions' => $questions,
            'time_spent_seconds' => 600,
        ]);
        $res->assertStatus(200)->assertJsonPath('score', 50);

        $attempt = PracticeAttempt::where('student_id', $this->student->id)->first();
        $this->assertNotNull($attempt);
        $this->assertNotNull($attempt->question_meta);
        $this->assertCount(10, $attempt->question_meta);
        $this->assertTrue($attempt->question_meta[0]['correct']);
        $this->assertFalse($attempt->question_meta[1]['correct']);
        $this->assertSame('easy', $attempt->question_meta[0]['difficulty']);
        $this->assertSame('hard', $attempt->question_meta[1]['difficulty']);

        // The learning profile must now derive difficulty_appetite from behavior.
        $profile = $this->getJson('/api/student/learning-profile');
        $profile->assertStatus(200);
        $appetite = $profile->json('profile.traits.difficulty_appetite');
        $this->assertSame('behavior', $appetite['source']);
        $this->assertEquals(-1.0, $appetite['value']);
        $this->assertSame('Easy', $profile->json('profile.recommended_difficulty'));
    }

    public function test_legacy_topic_submit_still_scores_banked_questions(): void
    {
        $easy = Question::create([
            'topic_id' => $this->topic->id,
            'question_text' => 'Easy',
            'options' => ['X', 'Y', 'Z', 'W'],
            'correct_answer' => 'A',
            'difficulty' => 'easy',
        ]);
        $hard = Question::create([
            'topic_id' => $this->topic->id,
            'question_text' => 'Hard',
            'options' => ['X', 'Y', 'Z', 'W'],
            'correct_answer' => ' B ',
            'difficulty' => 'hard',
        ]);

        $this->actingAs($this->student, 'sanctum');

        $res = $this->postJson('/api/student/practice/submit', [
            'topic_id' => $this->topic->id,
            'answers' => [
                $easy->id => 'a',   // normalized match for 'A'
                $hard->id => 'z',   // wrong
            ],
            'time_spent_seconds' => 60,
        ]);
        $res->assertStatus(200)->assertJsonPath('score', 50);

        $attempt = PracticeAttempt::where('student_id', $this->student->id)->first();
        $this->assertNotNull($attempt);
        $this->assertNull($attempt->question_meta);
        $this->assertSame(1, $attempt->correct_answers);
    }

    public function test_lesson_practice_submit_persists_attempt_with_meta(): void
    {
        $lesson = Lesson::create(['topic_id' => $this->topic->id, 'title' => 'Lesson A']);
        $questions = $this->aiQuestions(5);

        $this->actingAs($this->student, 'sanctum');

        $res = $this->postJson("/api/student/lessons/{$lesson->id}/practice/submit", [
            'answers' => [0, 1, 2, 3, 1],
            'questions' => $questions,
            'time_spent_seconds' => 300,
        ]);
        $res->assertStatus(200)->assertJsonPath('score', 80);

        $attempt = PracticeAttempt::where('student_id', $this->student->id)->first();
        $this->assertNotNull($attempt);
        $this->assertSame($this->topic->id, $attempt->topic_id);
        $this->assertCount(5, $attempt->question_meta);
        $this->assertTrue($attempt->question_meta[0]['correct']);
        $this->assertFalse($attempt->question_meta[4]['correct']);
        $this->assertSame('hard', $attempt->question_meta[1]['difficulty']);
    }

    public function test_standalone_submit_rejects_unenrolled_student(): void
    {
        $this->actingAs($this->otherStudent, 'sanctum');

        $questions = $this->aiQuestions(5);
        $answers = $this->answersFor($questions, fn ($i, $q) => $q['correct_index']);

        $this->postJson('/api/student/practice/submit', [
            'topic_id' => $this->topic->id,
            'answers' => $answers,
            'questions' => $questions,
        ])->assertStatus(403);

        $this->assertDatabaseMissing('practice_attempts', ['student_id' => $this->otherStudent->id]);
    }

    public function test_lesson_practice_submit_rejects_unenrolled_student(): void
    {
        $lesson = Lesson::create(['topic_id' => $this->topic->id, 'title' => 'Lesson A']);

        $this->actingAs($this->otherStudent, 'sanctum');

        $this->postJson("/api/student/lessons/{$lesson->id}/practice/submit", [
            'answers' => [0, 1, 2, 3, 0],
            'questions' => $this->aiQuestions(5),
        ])->assertStatus(403);

        $this->assertDatabaseMissing('practice_attempts', ['student_id' => $this->otherStudent->id]);
    }
}
