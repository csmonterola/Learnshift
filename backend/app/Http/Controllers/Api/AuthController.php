<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)
                    ->where('is_active', true)
                    ->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        ActivityLog::create([
            'user_id'    => $user->id,
            'action'     => 'login',
            'description'=> "{$user->name} logged in as {$user->role}",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'user'  => $user->load('studentProfile'),
            'token' => $token,
        ]);
    }

    public function signup(Request $request)
    {
        $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:6|confirmed',
            'role'     => 'required|in:student,teacher,parent,admin',
        ]);

        $user = User::create([
            'name'            => $request->name,
            'email'           => $request->email,
            'password'        => Hash::make($request->password),
            'role'            => $request->role,
            'is_active'       => true,
            'enrollment_code' => $request->role === 'student' ? \Illuminate\Support\Str::upper(\Illuminate\Support\Str::random(8)) : null,
        ]);

        // Create student profile if role is student
        if ($request->role === 'student') {
            StudentProfile::create([
                'student_id' => $user->id,
                'grade_level' => $request->grade_level,
                'section' => $request->section,
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        ActivityLog::create([
            'user_id'    => $user->id,
            'action'     => 'signup',
            'description'=> "{$user->name} signed up as {$user->role}",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'user'  => $user->load('studentProfile'),
            'token' => $token,
        ], 201);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load('studentProfile');
        return response()->json($user);
    }
}
