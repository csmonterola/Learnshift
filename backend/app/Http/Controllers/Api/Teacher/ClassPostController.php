<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\ClassPost;
use App\Models\PostComment;
use App\Models\SchoolClass;
use Illuminate\Http\Request;

class ClassPostController extends Controller
{
    /**
     * Resolve the class and verify it belongs to the authenticated teacher.
     */
    private function authorizeClass(Request $request, int $classId): SchoolClass
    {
        return SchoolClass::where('id', $classId)
            ->where('teacher_id', $request->user()->id)
            ->firstOrFail();
    }

    /**
     * Resolve a post and verify its class belongs to the authenticated teacher.
     */
    private function authorizePost(Request $request, int $classId, int $postId): ClassPost
    {
        $this->authorizeClass($request, $classId);

        return ClassPost::where('id', $postId)
            ->where('class_id', $classId)
            ->firstOrFail();
    }

    /**
     * GET /api/teacher/classes/{classId}/posts
     * All posts (draft, scheduled, published) for the class, newest first.
     */
    public function index(Request $request, int $classId)
    {
        $this->authorizeClass($request, $classId);

        $posts = ClassPost::where('class_id', $classId)
            ->with(['author:id,name,avatar', 'comments' => fn ($q) => $q->with('user:id,name,avatar')->orderBy('created_at')])
            ->withCount('comments')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($posts);
    }

    /**
     * POST /api/teacher/classes/{classId}/posts
     */
    public function store(Request $request, int $classId)
    {
        $this->authorizeClass($request, $classId);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'body' => 'required|string',
            'status' => 'sometimes|in:draft,scheduled,published',
            'scheduled_at' => 'nullable|date',
        ]);

        $status = $validated['status'] ?? 'draft';
        $scheduledAt = $validated['scheduled_at'] ?? null;

        $post = ClassPost::create([
            'class_id' => $classId,
            'author_id' => $request->user()->id,
            'title' => $validated['title'],
            'body' => $validated['body'],
            'status' => $status,
            'scheduled_at' => $scheduledAt,
            'published_at' => $status === 'published' ? now() : null,
        ]);

        return response()->json($post, 201);
    }

    /**
     * PUT /api/teacher/classes/{classId}/posts/{post}
     */
    public function update(Request $request, int $classId, int $postId)
    {
        $post = $this->authorizePost($request, $classId, $postId);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'body' => 'sometimes|string',
            'status' => 'sometimes|in:draft,scheduled,published',
            'scheduled_at' => 'nullable|date',
        ]);

        $post->fill($validated);

        // Recompute published_at so a post moving into 'published' becomes
        // visible immediately, and a post leaving 'published' is hidden.
        if (array_key_exists('status', $validated) || array_key_exists('scheduled_at', $validated)) {
            $post->published_at = $post->status === 'published' ? now() : null;
        }

        $post->save();

        return response()->json($post);
    }

    /**
     * DELETE /api/teacher/classes/{classId}/posts/{post}
     */
    public function destroy(Request $request, int $classId, int $postId)
    {
        $post = $this->authorizePost($request, $classId, $postId);
        $post->delete();

        return response()->json(['message' => 'Post deleted.']);
    }

    /**
     * POST /api/teacher/classes/{classId}/posts/{post}/comments
     */
    public function comment(Request $request, int $classId, int $postId)
    {
        $post = $this->authorizePost($request, $classId, $postId);

        $validated = $request->validate(['body' => 'required|string']);

        $comment = PostComment::create([
            'post_id' => $post->id,
            'user_id' => $request->user()->id,
            'body' => $validated['body'],
        ]);

        $comment->load('user:id,name,avatar');

        return response()->json($comment, 201);
    }
}
