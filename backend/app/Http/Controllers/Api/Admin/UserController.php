<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::query();

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }
        if ($request->has('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('email', 'like', '%' . $request->search . '%');
            });
        }

        return response()->json(
            $query->with('studentProfile')->paginate(20)
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role'     => 'required|in:student,teacher,parent,admin',
        ]);

        $user = User::create([
            'name'             => $request->name,
            'email'            => $request->email,
            'password'         => Hash::make($request->password),
            'role'             => $request->role,
            'enrollment_code'  => in_array($request->role, ['student', 'parent']) ? Str::upper(Str::random(8)) : null,
        ]);

        if ($user->role === 'student') {
            StudentProfile::create(['student_id' => $user->id]);
        }

        ActivityLog::create([
            'user_id'     => $request->user()->id,
            'action'      => 'account_created',
            'description' => "Created {$user->role} account for {$user->name}",
        ]);

        return response()->json($user, 201);
    }

    public function show(User $user)
    {
        return response()->json($user->load(['studentProfile', 'enrolledClasses.subject']));
    }

    public function update(Request $request, User $user)
    {
        $request->validate([
            'name'      => 'sometimes|string|max:255',
            'email'     => 'sometimes|email|unique:users,email,' . $user->id,
            'is_active' => 'sometimes|boolean',
            'role'      => 'sometimes|in:student,teacher,parent,admin',
        ]);

        $user->update($request->only(['name', 'email', 'is_active', 'role']));

        return response()->json($user);
    }

    public function destroy(User $user)
    {
        $user->delete();
        return response()->json(['message' => 'User deleted.']);
    }

    /**
     * Bulk generate accounts from CSV data.
     */
    public function bulkCreate(Request $request)
    {
        $request->validate([
            'users'         => 'required|array|min:1',
            'users.*.name'  => 'required|string',
            'users.*.email' => 'required|email',
            'users.*.role'  => 'required|in:student,teacher,parent,admin',
        ]);

        $created = [];
        foreach ($request->users as $data) {
            $password = Str::random(10);
            $user = User::create([
                'name'            => $data['name'],
                'email'           => $data['email'],
                'password'        => Hash::make($password),
                'role'            => $data['role'],
                'enrollment_code' => in_array($data['role'], ['student', 'parent']) ? Str::upper(Str::random(8)) : null,
            ]);

            if ($user->role === 'student') {
                StudentProfile::create(['student_id' => $user->id]);
            }

            $created[] = array_merge($user->toArray(), ['plain_password' => $password]);
        }

        return response()->json(['created' => $created], 201);
    }
}
