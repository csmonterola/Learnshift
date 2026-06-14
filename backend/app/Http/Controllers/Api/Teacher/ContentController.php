<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\LearningMaterial;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ContentController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            LearningMaterial::where('teacher_id', $request->user()->id)
                ->with(['subject', 'topic'])
                ->latest()
                ->get()
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'title'      => 'required|string',
            'subject_id' => 'required|exists:subjects,id',
            'topic_id'   => 'nullable|exists:topics,id',
            'file'       => 'required|file|mimes:pdf,docx,pptx,doc,ppt|max:20480',
            'ai_sync'    => 'boolean',
        ]);

        $file = $request->file('file');
        $path = $file->store('materials', 'public');

        $material = LearningMaterial::create([
            'teacher_id' => $request->user()->id,
            'subject_id' => $request->subject_id,
            'topic_id'   => $request->topic_id,
            'title'      => $request->title,
            'file_path'  => $path,
            'file_name'  => $file->getClientOriginalName(),
            'file_type'  => strtoupper($file->getClientOriginalExtension()),
            'file_size'  => $file->getSize(),
            'ai_sync'    => $request->boolean('ai_sync'),
        ]);

        return response()->json($material->load(['subject', 'topic']), 201);
    }

    public function update(Request $request, LearningMaterial $material)
    {
        $this->authorize('update', $material);

        $material->update($request->only(['title', 'ai_sync', 'topic_id']));
        return response()->json($material->load(['subject', 'topic']));
    }

    public function destroy(LearningMaterial $material)
    {
        $this->authorize('delete', $material);

        Storage::disk('public')->delete($material->file_path);
        $material->delete();

        return response()->json(['message' => 'Material deleted.']);
    }
}
