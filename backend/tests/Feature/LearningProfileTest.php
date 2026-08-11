<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Lesson;
use App\Models\LessonChatLog;
use App\Models\PracticeAttempt;
use App\Models\Quarter;
use App\Models\Question;
use App\Models\QuizResult;
use App\Models\SchoolClass;
use App\Models\StudentProfile;
use App\Models\Subject;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LearningProfileTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;
    private User $otherTeacher;
    private User $student;
    private User $otherStudent;

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

        $this->otherTeacher = User::create([
            'name' => 'Other Teacher',
            'email' => 'otherteacher@test.com',
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

        $class = SchoolClass::create([
            'name' => 'Class A',
            'teacher_id' => $this->teacher->id,
            'subject' => 'Mathematics',
            'grade_level' => '10',
            'section' => 'A',
            'school_year' => '2025-2026',
        ]);

        $class->students()->attach($this->student->id);

        // Other teacher's class with the other student (unauthorized pair).
        $otherClass = SchoolClass::create([
            'name' => 'Class B',
            'teacher_id' => $this->otherTeacher->id,
            'subject' => 'Science',
            'grade_level' => '10',
            'section' => 'B',
            'school_year' => '2025-2026',
        ]);
        $otherClass->students()->attach($this->otherStudent->id);
    }

    public function test_student_profile_requires_quiz_then_builds_from_self_report(): void
    {
        $this->actingAs($this->student, 'sanctum');

        $res = $this->getJson('/api/student/learning-profile');
        $res->assertStatus(200)
            ->assertJsonPath('needs_quiz', true)
            ->assertJsonPath('profile.recommended_difficulty', null);

        $submit = $this->postJson('/api/student/learning-profile/self-report', [
            'answers' => ['pacing' => 0, 'mastery_habit' => 1, 'difficulty_appetite' => 2, 'help_seeking' => 0, 'study_regularity' => 3],
        ]);
        $submit->assertStatus(200)
            ->assertJsonPath('self_report.pacing', 0.7)
            ->assertJsonPath('self_report.mastery_habit', 0.3);

        $after = $this->getJson('/api/student/learning-profile');
        $after->assertStatus(200)
            ->assertJsonPath('needs_quiz', false)
            ->assertJsonPath('profile.traits.pacing.source', 'self_report')
            ->assertJsonPath('profile.recommended_difficulty', 'Easy'); // difficulty_appetite => -0.7
    }

    public function test_teacher_single_guarded_by_ownership(): void
    {
        $this->actingAs($this->teacher, 'sanctum');

        // Authorized student.
        $this->getJson("/api/teacher/students/{$this->student->id}/learning-profile")->assertStatus(200)
            ->assertJsonPath('student_id', $this->student->id)
            ->assertJsonPath('has_data', false);

        // Own student, but by a teacher that does not own them => 403.
        $this->actingAs($this->otherTeacher, 'sanctum');
        $this->getJson("/api/teacher/students/{$this->student->id}/learning-profile")->assertStatus(403);
    }

    public function test_teacher_batch_filters_unowned_ids_server_side(): void
    {
        $this->actingAs($this->teacher, 'sanctum');

        // Ask for owned student 3 + the other teacher's student + a bogus id.
        $ids = $this->student->id . ',' . $this->otherStudent->id . ',99999,garbage';
        $res = $this->getJson("/api/teacher/students/learning-profiles?ids={$ids}");
        $res->assertStatus(200);

        $rows = $res->json();
        $this->assertCount(1, $rows, 'Unauthorized + garbage ids must be dropped server-side');
        $this->assertEquals($this->student->id, $rows[0]['student_id']);
        $this->assertArrayHasKey('has_data', $rows[0]);
        $this->assertArrayHasKey('profile', $rows[0]);
    }

    public function test_self_report_persists_and_merges_with_behavior(): void
    {
        StudentProfile::create([
            'student_id' => $this->student->id,
            'learning_profile' => [
                'self_report' => [
                    'pacing' => 0.7,
                    'mastery_habit' => 0.3,
                    'difficulty_appetite' => -0.7,
                    'help_seeking' => 0.7,
                    'study_regularity' => -0.9,
                ],
                'schema_version' => 1,
                'updated_at' => now()->toISOString(),
            ],
        ]);

        $this->actingAs($this->teacher, 'sanctum');
        $res = $this->getJson("/api/teacher/students/{$this->student->id}/learning-profile");
        $res->assertStatus(200)
            ->assertJsonPath('has_data', true)
            ->assertJsonPath('profile.traits.pacing.value', 0.7);
    }

    public function test_per_trait_source_mixing_for_partial_behavioral_data(): void
    {
        // Curriculum chain needed for the behavioral signal tables.
        $subject = Subject::create(['name' => 'Mathematics', 'code' => 'MATH']);
        $quarter = Quarter::create(['subject_id' => $subject->id, 'grade_level' => '10', 'quarter_number' => 1]);
        $topic = Topic::create(['quarter_id' => $quarter->id, 'title' => 'Algebra']);
        $lessonA = Lesson::create(['topic_id' => $topic->id, 'title' => 'Lesson A']);
        $lessonB = Lesson::create(['topic_id' => $topic->id, 'title' => 'Lesson B']);

        // pacing: 12 practice attempts with time_spent + total_questions (>=10).
        for ($i = 0; $i < 12; $i++) {
            PracticeAttempt::create([
                'student_id' => $this->student->id,
                'topic_id' => $topic->id,
                'score' => 70,
                'total_questions' => 10,
                'correct_answers' => 7,
                'answers' => [],
                'time_spent_seconds' => 120 + ($i * 5),
            ]);
        }

        // mastery_habit: 3 quizzes across 2 distinct lessons (>=3, >=2 lessons).
        QuizResult::create(['student_id' => $this->student->id, 'lesson_id' => $lessonA->id, 'attempt_number' => 1, 'score' => 50, 'total_questions' => 10, 'correct_answers' => 5, 'submitted_at' => now()]);
        QuizResult::create(['student_id' => $this->student->id, 'lesson_id' => $lessonA->id, 'attempt_number' => 2, 'score' => 90, 'total_questions' => 10, 'correct_answers' => 9, 'submitted_at' => now()]);
        QuizResult::create(['student_id' => $this->student->id, 'lesson_id' => $lessonB->id, 'attempt_number' => 1, 'score' => 80, 'total_questions' => 10, 'correct_answers' => 8, 'submitted_at' => now()]);

        // help_seeking: 6 AI-tutor chats (>=5).
        for ($i = 0; $i < 6; $i++) {
            LessonChatLog::create([
                'student_id' => $this->student->id,
                'lesson_id' => $lessonA->id,
                'question' => 'Q',
                'response' => 'A',
                'source' => 'ai',
                'confidence_score' => 80,
            ]);
        }

        // study_regularity: 6 active days within the trailing 14-day window (>=5).
        for ($i = 0; $i < 6; $i++) {
            $log = ActivityLog::create([
                'user_id' => $this->student->id,
                'action' => 'practice_completed',
            ]);
            $log->forceFill(['created_at' => now()->subDays($i)])->save();
        }

        // Self-report seed fills the gaps (difficulty_appetite has no behavior
        // signal here — no questions seeded with difficulty, so <2 levels).
        StudentProfile::create([
            'student_id' => $this->student->id,
            'learning_profile' => [
                'self_report' => [
                    'pacing' => 0.7,
                    'mastery_habit' => 0.3,
                    'difficulty_appetite' => -0.7,
                    'help_seeking' => 0.7,
                    'study_regularity' => -0.9,
                ],
                'schema_version' => 1,
                'updated_at' => now()->toISOString(),
            ],
        ]);

                $this->actingAs($this->teacher, 'sanctum');
        $res = $this->getJson("/api/teacher/students/{$this->student->id}/learning-profile");
        $res->assertStatus(200)->assertJsonPath('has_data', true);

        $traits = $res->json('profile.traits');
        // Behavior must win where thresholds are met.
        $this->assertSame('behavior', $traits['pacing']['source']);
        $this->assertSame('behavior', $traits['mastery_habit']['source']);
        $this->assertSame('behavior', $traits['help_seeking']['source']);
        $this->assertSame('behavior', $traits['study_regularity']['source']);
        // Self-report must fill the trait with no behavioral signal.
        $this->assertSame('self_report', $traits['difficulty_appetite']['source']);
        $this->assertSame(-0.7, $traits['difficulty_appetite']['value']);
        // recommended_difficulty now reflects the REAL behavioral appetite? No —
        // difficulty_appetite is still self_report here, so it stays Easy.
        $this->assertSame('Easy', $res->json('profile.recommended_difficulty'));

        // Batch endpoint must return the SAME trait values as the single
        // endpoint for this student (regression: activity `whereIn` vs `=`).
        $batch = $this->getJson("/api/teacher/students/learning-profiles?ids={$this->student->id}");
        $batch->assertStatus(200);
        $batchRow = collect($batch->json())->firstWhere('student_id', $this->student->id);
        $this->assertSame($traits, $batchRow['profile']['traits']);
    }

    public function test_difficulty_appetite_normalizes_answer_format(): void
    {
        // Curriculum chain for the practice signal tables.
        $subject = Subject::create(['name' => 'Mathematics', 'code' => 'MATH']);
        $quarter = Quarter::create(['subject_id' => $subject->id, 'grade_level' => '10', 'quarter_number' => 1]);
        $topic = Topic::create(['quarter_id' => $quarter->id, 'title' => 'Algebra']);

        // Questions whose correct_answer itself has irregular formatting.
        $easyA = Question::create([
            'topic_id' => $topic->id,
            'question_text' => 'Easy A',
            'options' => ['X', 'Y', 'Z', 'W'],
            'correct_answer' => 'A',
            'difficulty' => 'easy',
        ]);
        $easyB = Question::create([
            'topic_id' => $topic->id,
            'question_text' => 'Easy B',
            'options' => ['X', 'Y', 'Z', 'W'],
            'correct_answer' => ' B ',
            'difficulty' => 'easy',
        ]);
        $hardA = Question::create([
            'topic_id' => $topic->id,
            'question_text' => 'Hard A',
            'options' => ['X', 'Y', 'Z', 'W'],
            'correct_answer' => 'C',
            'difficulty' => 'hard',
        ]);
        $hardB = Question::create([
            'topic_id' => $topic->id,
            'question_text' => 'Hard B',
            'options' => ['X', 'Y', 'Z', 'W'],
            'correct_answer' => ' D ',
            'difficulty' => 'hard',
        ]);

        // 3 attempts x 4 answers = 12 samples (>=10), spanning 2 difficulty
        // levels. Easy answers are stored in a deliberately mismatched format:
        //   - ' a ' vs correct 'A'   (case AND whitespace differ on answer side)
        //   - 'b'  vs correct ' B '  (case differs, padding lives on the correct side)
        // Hard answers are definitively wrong. Pre-normalization the easy
        // answers would all be marked incorrect (acc_easy = 0), giving
        // value = 0; post-normalization acc_easy = 1 => value = -1.
        for ($i = 0; $i < 3; $i++) {
            PracticeAttempt::create([
                'student_id' => $this->student->id,
                'topic_id' => $topic->id,
                'score' => 50,
                'total_questions' => 4,
                'correct_answers' => 2,
                'answers' => [
                    $easyA->id => ' a ',
                    $easyB->id => 'b',
                    $hardA->id => 'z',
                    $hardB->id => 'z',
                ],
                'time_spent_seconds' => 600,
            ]);
        }

        $this->actingAs($this->teacher, 'sanctum');
        $res = $this->getJson("/api/teacher/students/{$this->student->id}/learning-profile");
        $res->assertStatus(200)->assertJsonPath('has_data', true);

        $appetite = $res->json('profile.traits.difficulty_appetite');
        $this->assertSame('behavior', $appetite['source']);
        // JSON serializes -1.0 as the integer -1, so compare numerically.
        $this->assertEquals(-1.0, $appetite['value']);
        $this->assertSame('Easy', $res->json('profile.recommended_difficulty'));
    }
}