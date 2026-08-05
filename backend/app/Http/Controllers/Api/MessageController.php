<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class MessageController extends Controller
{
    public function conversations(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        // Check if messages table exists
        try {
            $hasMessagesTable = Schema::hasTable('messages');
        } catch (\Exception $e) {
            $hasMessagesTable = false;
        }

        if (!$hasMessagesTable) {
            return response()->json([]);
        }

        $conversations = DB::table('messages as m1')
            ->select(
                DB::raw('CASE WHEN m1.sender_id = ? THEN m1.receiver_id ELSE m1.sender_id END as other_user_id'),
                DB::raw('MAX(m1.created_at) as last_message_time'),
                DB::raw('COUNT(*) as message_count')
            )
            ->setBindings([$userId])
            ->where(function ($query) use ($userId) {
                $query->where('m1.sender_id', $userId)
                      ->orWhere('m1.receiver_id', $userId);
            })
            ->groupBy('other_user_id')
            ->orderBy('last_message_time', 'desc')
            ->get();

        // Load pinned conversation IDs
        $pinnedIds = DB::table('conversation_pins')
            ->where('user_id', $userId)
            ->pluck('other_user_id')
            ->toArray();

        $result = [];
        foreach ($conversations as $conv) {
            $otherUser = User::find($conv->other_user_id);
            if ($otherUser) {
                $result[] = [
                    'user' => [
                        'id' => $otherUser->id,
                        'name' => $otherUser->name,
                        'email' => $otherUser->email,
                        'avatar' => $otherUser->avatar,
                        'role' => $otherUser->role,
                    ],
                    'last_message_time' => $conv->last_message_time,
                    'message_count' => $conv->message_count,
                    'pinned' => in_array($otherUser->id, $pinnedIds),
                ];
            }
        }

        // Sort pinned first, then by last_message_time desc
        usort($result, function ($a, $b) {
            $aPin = $a['pinned'] ? 1 : 0;
            $bPin = $b['pinned'] ? 1 : 0;
            if ($aPin !== $bPin) return $bPin <=> $aPin;
            return strtotime($b['last_message_time']) <=> strtotime($a['last_message_time']);
        });

        return response()->json($result);
    }

    public function getMessages(Request $request, $userId): JsonResponse
    {
        $currentUserId = $request->user()->id;

        // Check if messages table exists
        try {
            $hasMessagesTable = Schema::hasTable('messages');
        } catch (\Exception $e) {
            $hasMessagesTable = false;
        }

        if (!$hasMessagesTable) {
            return response()->json([]);
        }

        $fields = ['id', 'sender_id', 'receiver_id', 'content', 'is_read', 'created_at'];

        // UNION ALL the two directions separately so each branch can use the
        // (sender_id, receiver_id, created_at) index (avoids the slow OR scan).
        $sent = DB::table('messages')
            ->select($fields)
            ->where('sender_id', $currentUserId)
            ->where('receiver_id', $userId);

        $messages = DB::table('messages')
            ->select($fields)
            ->where('sender_id', $userId)
            ->where('receiver_id', $currentUserId)
            ->unionAll($sent)
            ->orderBy('created_at', 'asc')
            ->limit(100)
            ->get();

        DB::table('messages')
            ->where('sender_id', $userId)
            ->where('receiver_id', $currentUserId)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json($messages);
    }

    public function send(Request $request): JsonResponse
    {
        // Check if messages table exists
        try {
            $hasMessagesTable = Schema::hasTable('messages');
        } catch (\Exception $e) {
            $hasMessagesTable = false;
        }

        if (!$hasMessagesTable) {
            return response()->json(['error' => 'Messaging system not available'], 503);
        }

        $validated = $request->validate([
            'receiver_id' => 'required|integer|exists:users,id',
            'content' => 'required|string|max:5000',
        ]);

        $senderId = $request->user()->id;
        $receiverId = $validated['receiver_id'];

        if ($senderId === $receiverId) {
            return response()->json(['error' => 'Cannot send message to yourself'], 400);
        }

        $messageId = DB::table('messages')->insertGetId([
            'sender_id' => $senderId,
            'receiver_id' => $receiverId,
            'content' => $validated['content'],
            'is_read' => false,
            'created_at' => now(),
        ]);

        $newMessage = DB::table('messages')
            ->where('id', $messageId)
            ->first([
                'id',
                'sender_id',
                'receiver_id',
                'content',
                'is_read',
                'created_at'
            ]);

        // Broadcast the new message via Reverb
        try {
            $messageModel = \App\Models\Message::find($messageId);
            if ($messageModel) {
                event(new \App\Events\MessageSent($messageModel));
            }
        } catch (\Throwable $e) {
            // Don't fail the request if broadcasting fails
            \Illuminate\Support\Facades\Log::warning('Message broadcast failed', ['error' => $e->getMessage()]);
        }

        return response()->json($newMessage, 201);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $count = DB::table('messages')
            ->where('receiver_id', $userId)
            ->where('is_read', false)
            ->count();

        return response()->json(['count' => $count]);
    }

    public function pinConversation(Request $request, $otherUserId): JsonResponse
    {
        $userId = $request->user()->id;

        DB::table('conversation_pins')->updateOrInsert(
            ['user_id' => $userId, 'other_user_id' => $otherUserId],
            ['pinned_at' => now(), 'created_at' => now(), 'updated_at' => now()]
        );

        return response()->json(['pinned' => true]);
    }

    public function unpinConversation(Request $request, $otherUserId): JsonResponse
    {
        $userId = $request->user()->id;

        DB::table('conversation_pins')
            ->where('user_id', $userId)
            ->where('other_user_id', $otherUserId)
            ->delete();

        return response()->json(['pinned' => false]);
    }

    public function pinMessage(Request $request, $messageId): JsonResponse
    {
        $userId = $request->user()->id;

        DB::table('pinned_messages')->updateOrInsert(
            ['user_id' => $userId, 'message_id' => $messageId],
            ['created_at' => now(), 'updated_at' => now()]
        );

        return response()->json(['pinned' => true]);
    }

    public function unpinMessage(Request $request, $messageId): JsonResponse
    {
        $userId = $request->user()->id;

        DB::table('pinned_messages')
            ->where('user_id', $userId)
            ->where('message_id', $messageId)
            ->delete();

        return response()->json(['pinned' => false]);
    }

    public function getPinnedMessages(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $pinned = DB::table('pinned_messages')
            ->where('user_id', $userId)
            ->join('messages', 'messages.id', '=', 'pinned_messages.message_id')
            ->select('messages.*', 'pinned_messages.id as pin_id', 'pinned_messages.created_at as pinned_at')
            ->orderBy('pinned_messages.created_at', 'desc')
            ->get();

        return response()->json($pinned);
    }
}
