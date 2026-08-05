<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Message $message;

    public function __construct(Message $message)
    {
        $this->message = $message->load(['sender:id,name,avatar', 'receiver:id,name,avatar']);
    }

    public function broadcastOn(): PrivateChannel
    {
        // Broadcast to both sender and receiver
        return new PrivateChannel('messages.' . $this->message->sender_id . '.' . $this->message->receiver_id);
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'sender_id' => $this->message->sender_id,
            'receiver_id' => $this->message->receiver_id,
            'content' => $this->message->content,
            'is_read' => $this->message->is_read,
            'created_at' => $this->message->created_at,
            'sender' => $this->message->sender,
            'receiver' => $this->message->receiver,
        ];
    }
}