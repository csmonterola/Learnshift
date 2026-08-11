<?php

namespace Tests\Feature;

use App\Models\Lesson;
use App\Models\Quarter;
use App\Models\SchoolClass;
use App\Models\StudentProfile;
use App\Models\Subject;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class LearnerAdaptationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.mistral.api_key' => 'test-key']);
        config(['services.mistral.model' => 'mistral-small-latest']);
        config(['services.ai_provider_chat' => 'mistral']);
    }

    private function makeStudent(string $email): User
    {
        return User::factory()->create(['role' => 'student', 'email' => $email]);
    }

    private function seedStudentProfile(User $student, array $values): void
    {
        StudentProfile::create([
            'student_id' => $student->id,
            'learning_profile' => [
                'self_report' => [
                    'pacing' => $values['pacing'],
                    'mastery_habit' => $values['mastery_habit'],
                    'difficulty_appetite' => $values['difficulty_appetite'],
                    'help_seeking' => $values['help_seeking'],
                    'study_regularity' => $values['study_regularity'],
                ],
                'schema_version' => 1,
                'updated_at' => now()->toISOString(),
            ],
        ]);
    }

    private function seedLesson(User $teacher, User $student, string $subjectCode): Lesson
    {
        $class = SchoolClass::create([
            'name' => 'Class A',
            'teacher_id' => $teacher->id,
            'subject' => 'Mathematics',
            'grade_level' => '10',
            'section' => 'A',
            'school_year' => '2025-2026',
        ]);
        $class->students()->attach($student->id);

        $subject = Subject::create(['name' => 'Mathematics', 'code' => $subjectCode]);
        $quarter = Quarter::create(['subject_id' => $subject->id, 'grade_level' => '10', 'quarter_number' => 1]);
        $topic = Topic::create(['quarter_id' => $quarter->id, 'class_id' => $class->id, 'title' => 'Algebra']);
        return Lesson::create(['topic_id' => $topic->id, 'title' => 'Lesson A']);
    }

    public function test_tutor_prompts_differ_for_contrasting_students(): void
    {
        $hardLowHelp = $this->makeStudent('hard-lowhelp@test.com');
        $this->seedStudentProfile($hardLowHelp, [
            'pacing' => 0.7, 'mastery_habit' => 0.8, 'difficulty_appetite' => 0.7,
            'help_seeking' => -0.6, 'study_regularity' => 0.9,
        ]);

        $easyHighHelp = $this->makeStudent('easy-highhelp@test.com');
        $this->seedStudentProfile($easyHighHelp, [
            'pacing' => -0.7, 'mastery_habit' => -0.5, 'difficulty_appetite' => -0.7,
            'help_seeking' => 0.7, 'study_regularity' => -0.9,
        ]);

        $captured = [];

        Http::fake([
            'api.mistral.ai/*' => function ($request) use (&$captured) {
                if (str_contains($request->url(), '/chat/completions')) {
                    $captured[] = $request->data();
                }
                return Http::response([
                    'choices' => [['message' => ['content' => 'AI response']]],
                ]);
            },
        ]);

        $this->actingAs($hardLowHelp, 'sanctum')
            ->postJson('/api/student/chatbot/ask', ['question' => 'Explain photosynthesis.'])
            ->assertStatus(200);

        $this->actingAs($easyHighHelp, 'sanctum')
            ->postJson('/api/student/chatbot/ask', ['question' => 'Explain photosynthesis.'])
            ->assertStatus(200);

        $this->assertCount(2, $captured, 'Expected two chat-completion payloads.');
        $systemA = $captured[0]['messages'][0]['content'];
        $systemB = $captured[1]['messages'][0]['content'];

        $this->assertStringContainsString('helpful educational AI assistant', $systemA);
        $this->assertStringContainsString('helpful educational AI assistant', $systemB);
        $this->assertStringContainsString('LEARNER PROFILE', $systemA);
        $this->assertStringContainsString('LEARNER PROFILE', $systemB);
        $this->assertStringContainsString('prefers challenging material', $systemA);
        $this->assertStringContainsString('prefers easier material', $systemB);
        $this->assertStringContainsString('self-reliant and rarely asks for help', $systemA);
        $this->assertStringContainsString('readily asks for help', $systemB);
        $this->assertNotSame($systemA, $systemB);
    }

    public function test_cold_start_omits_difficulty_target_but_recommendation_includes_hard(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $cold = $this->makeStudent('cold@test.com');
        $recommended = $this->makeStudent('rec@test.com');
        $this->seedStudentProfile($recommended, [
            'pacing' => 0.7, 'mastery_habit' => 0.8, 'difficulty_appetite' => 0.7,
            'help_seeking' => 0.7, 'study_regularity' => 0.9,
        ]);

        $lessonCold = $this->seedLesson($teacher, $cold, 'MATH1');
        $lessonRec = $this->seedLesson($teacher, $recommended, 'MATH2');

        $captured = [];
        $validQuestions = json_encode([
            [
                'question' => 'What is 2+2?',
                'options' => ['A) 3', 'B) 4', 'C) 5', 'D) 6'],
                'correct_index' => 1,
                'explanation' => 'Basic addition.',
                'difficulty' => 'easy',
            ],
        ]);
        Http::fake([
            'api.mistral.ai/*' => function ($request) use (&$captured, $validQuestions) {
                if (str_contains($request->url(), '/chat/completions')) {
                    $captured[] = $request->data();
                    return Http::response([
                        'choices' => [['message' => ['content' => $validQuestions]]],
                    ]);
                }
                // Fail the embedding call so QuestionGenerator skips the RAG
                // DB query (no lesson_embeddings table in the test DB) and
                // proceeds with the chat call only.
                return Http::response('', 500);
            },
        ]);

        $this->actingAs($cold, 'sanctum')
            ->postJson("/api/student/lessons/{$lessonCold->id}/quiz/generate")
            ->assertStatus(200);

        $this->actingAs($recommended, 'sanctum')
            ->postJson("/api/student/lessons/{$lessonRec->id}/quiz/generate")
            ->assertStatus(200);

        $this->assertCount(2, $captured, 'Expected two quiz-generation payloads.');
        $systemCold = $captured[0]['messages'][0]['content'];
        $systemRec = $captured[1]['messages'][0]['content'];

        $this->assertStringNotContainsString('DIFFICULTY TARGET', $systemCold);
        $this->assertStringContainsString('DIFFICULTY TARGET: Hard', $systemRec);
    }
}