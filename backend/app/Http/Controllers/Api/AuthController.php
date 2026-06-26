<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
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

        // Revoke old tokens and issue a new one
        $user->tokens()->delete();
        $token = $user->createToken('auth_token')->plainTextToken;

        ActivityLog::create([
            'user_id'    => $user->id,
            'action'     => 'login',
            'description'=> "{$user->name} logged in as {$user->role}",
            'ip_address' => $request->ip(),
        ]);

        // Return the token in an HttpOnly cookie and the user in the JSON body
        return response()->json([
            'user'  => $user->load('studentProfile'),
        ])->cookie(
            'auth_token',        // name
            $token,              // value
            60 * 24 * 7,         // minutes (7 days)
            '/',                 // path
            null,                // domain
            config('app.env') === 'production', // secure
            true                 // httpOnly
        );
    }

    public function signup(Request $request)
    {
        abort(403, 'Public registration is disabled. Accounts can only be created by an administrator.');
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        // Clear the auth cookie
        return response()->json(['message' => 'Logged out successfully.'])
            ->cookie('auth_token', '', -1, '/');
    }

    public function me(Request $request)
    {
        $user = $request->user()->load('studentProfile');
        return response()->json($user);
    }

    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $request->email)->first();

        if ($user) {
            ActivityLog::create([
                'user_id'     => $user->id,
                'action'      => 'password_reset_requested',
                'description' => "Password reset requested for {$user->email}",
                'ip_address'  => $request->ip(),
            ]);
        }

        return response()->json(['message' => 'If an account with that email exists, a reset link has been sent.']);
    }

    /**
     * POST /api/auth/reset-password
     *
     * Accepts: token, email, password, password_confirmation
     * Returns 200 on success, 422 on invalid/expired token.
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token'                 => 'required|string',
            'email'                 => 'required|email',
            'password'              => 'required|string|min:8|confirmed',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                ])->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json(['message' => __($status)]);
        }

        return response()->json(['message' => __($status)], 422);
    }
}
