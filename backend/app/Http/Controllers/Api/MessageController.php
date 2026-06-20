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
                ];
            }
        }

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

        $messages = DB::table('messages')
            ->where(function ($query) use ($currentUserId, $userId) {
                $query->where('sender_id', $currentUserId)
                      ->where('receiver_id', $userId);
            })
            ->orWhere(function ($query) use ($currentUserId, $userId) {
                $query->where('sender_id', $userId)
                      ->where('receiver_id', $currentUserId);
            })
            ->orderBy('created_at', 'asc')
            ->limit(100)
            ->get([
                'id',
                'sender_id',
                'receiver_id',
                'content',
                'is_read',
                'created_at'
            ]);

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
}
