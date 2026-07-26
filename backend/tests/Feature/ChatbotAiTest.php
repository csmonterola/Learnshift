<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ChatbotAiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.mistral.api_key' => 'test-key']);
        config(['services.mistral.model' => 'mistral-small-latest']);
        config(['services.ai_provider_chat' => 'mistral']);
    }

    public function test_chatbot_returns_json_response_on_success(): void
    {
        Http::fake([
            'api.mistral.ai/*' => Http::response([
                'choices' => [
                    ['message' => ['content' => 'Hello from AI!']],
                ],
            ]),
        ]);

        $user = User::factory()->create(['role' => 'student']);
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
        ])->postJson('/api/student/chatbot/ask', [
            'question' => 'What is calculus?',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'response' => 'Hello from AI!',
            'confidence_score' => 90,
        ]);
        $response->assertJsonStructure(['response', 'confidence_score', 'log_id']);
    }

    public function test_chatbot_returns_error_when_ai_fails(): void
    {
        Http::fake([
            'api.mistral.ai/*' => Http::response('', 500),
        ]);

        $user = User::factory()->create(['role' => 'student']);
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
        ])->postJson('/api/student/chatbot/ask', [
            'question' => 'What is calculus?',
        ]);

        $response->assertStatus(502);
        $response->assertJson([
            'error' => 'AI service temporarily unavailable. Please try again.',
        ]);
    }

    public function test_chatbot_requires_authentication(): void
    {
        $response = $this->postJson('/api/student/chatbot/ask', [
            'question' => 'Hi',
        ]);
        $response->assertStatus(401);
    }

    public function test_chatbot_validates_question_required(): void
    {
        $user = User::factory()->create(['role' => 'student']);
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
        ])->postJson('/api/student/chatbot/ask', []);

        $response->assertStatus(422);
    }
}
