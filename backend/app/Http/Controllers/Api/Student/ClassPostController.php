<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\ClassPost;
use App\Models\PostComment;
use App\Models\SchoolClass;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class ClassPostController extends Controller
{
    /**
     * Verify the student is enrolled in the class.
     */
    private function authorizeEnrollment(Request $request, int $classId): SchoolClass
    {
        $student = $request->user();

        return SchoolClass::whereHas('students', fn ($q) => $q->where('users.id', $student->id))
            ->where('id', $classId)
            ->firstOrFail();
    }

    /**
     * GET /api/student/classes/{classId}/posts
     * Only published (and no longer scheduled) posts are visible to students.
     */
    public function index(Request $request, int $classId)
    {
        $this->authorizeEnrollment($request, $classId);

        $posts = ClassPost::where('class_id', $classId)
            ->published()
            ->with(['author:id,name,avatar', 'comments' => fn ($q) => $q->with('user:id,name,avatar')->orderBy('created_at')])
            ->withCount('comments')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($posts);
    }

    /**
     * POST /api/student/classes/{classId}/posts/{post}/comments
     * Students may comment on published posts only.
     */
    public function comment(Request $request, int $classId, int $postId)
    {
        $this->authorizeEnrollment($request, $classId);

        $post = ClassPost::where('id', $postId)
            ->where('class_id', $classId)
            ->published()
            ->firstOrFail();

        $validated = $request->validate(['body' => 'required|string']);

        $comment = PostComment::create([
            'post_id' => $post->id,
            'user_id' => $request->user()->id,
            'body' => $validated['body'],
        ]);

        $comment->load('user:id,name,avatar');

        return response()->json($comment, 201);
    }

    /**
     * Resolve a comment and verify the authenticated student authored it.
     */
    private function authorizeComment(Request $request, int $classId, int $postId, int $commentId): PostComment
    {
        $this->authorizeEnrollment($request, $classId);

        $post = ClassPost::where('id', $postId)
            ->where('class_id', $classId)
            ->published()
            ->firstOrFail();

        $comment = PostComment::where('id', $commentId)
            ->where('post_id', $post->id)
            ->firstOrFail();

        if ((int) $comment->user_id !== (int) $request->user()->id) {
            throw new AccessDeniedHttpException('You can only edit or delete your own comments.');
        }

        return $comment;
    }

    /**
     * PUT /api/student/classes/{classId}/posts/{post}/comments/{comment}
     */
    public function updateComment(Request $request, int $classId, int $postId, int $commentId)
    {
        $comment = $this->authorizeComment($request, $classId, $postId, $commentId);

        $validated = $request->validate(['body' => 'required|string']);

        $comment->update(['body' => $validated['body']]);
        $comment->load('user:id,name,avatar');

        return response()->json($comment);
    }

    /**
     * DELETE /api/student/classes/{classId}/posts/{post}/comments/{comment}
     */
    public function destroyComment(Request $request, int $classId, int $postId, int $commentId)
    {
        $comment = $this->authorizeComment($request, $classId, $postId, $commentId);
        $comment->delete();

        return response()->json(['message' => 'Comment deleted.']);
    }
}
