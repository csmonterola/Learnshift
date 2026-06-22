<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class SettingsController extends Controller
{
    /**
     * GET /api/settings
     * Return the current user's settings.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        return response()->json([
            'user' => $user->only([
                'id', 'name', 'email', 'avatar', 'role',
                'timezone', 'language', 'email_notifications', 'theme',
            ]),
            'profile' => $user->studentProfile ? $user->studentProfile->only([
                'grade_level', 'section',
            ]) : null,
        ]);
    }

    /**
     * PUT /api/settings/profile
     * Update name, email, avatar, and role-specific fields.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $rules = [
            'name'        => 'required|string|max:255',
            'email'       => 'required|email|unique:users,email,' . $user->id,
            'avatar'      => 'nullable|url|max:500',
        ];

        if ($user->isStudent()) {
            $rules['grade_level'] = 'nullable|string|max:50';
            $rules['section']     = 'nullable|string|max:50';
        }

        $data = $request->validate($rules);

        $user->update([
            'name'  => $data['name'],
            'email' => $data['email'],
            'avatar' => $data['avatar'] ?? $user->avatar,
        ]);

        if ($user->isStudent()) {
            $user->studentProfile()->updateOrCreate(
                ['student_id' => $user->id],
                [
                    'grade_level' => $data['grade_level'] ?? $user->studentProfile->grade_level ?? null,
                    'section'     => $data['section'] ?? $user->studentProfile->section ?? null,
                ]
            );
        }

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user'    => $user->only([
                'id', 'name', 'email', 'avatar', 'role',
                'timezone', 'language', 'email_notifications', 'theme',
            ]),
        ]);
    }

    /**
     * PUT /api/settings/password
     * Change password after verifying current password.
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => ['required', 'string'],
            'password'         => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The provided password does not match your current password.'],
            ]);
        }

        $user->update([
            'password' => Hash::make($request->password),
        ]);

        return response()->json(['message' => 'Password changed successfully.']);
    }

    /**
     * PUT /api/settings/preferences
     * Update timezone, language, notifications, theme.
     */
    public function updatePreferences(Request $request): JsonResponse
    {
        $request->validate([
            'timezone'            => 'nullable|string|max:50',
            'language'            => 'nullable|string|max:10',
            'email_notifications' => 'boolean',
            'theme'               => 'nullable|in:light,dark',
        ]);

        $user = $request->user();
        $user->update($request->only(['timezone', 'language', 'email_notifications', 'theme']));

        return response()->json([
            'message' => 'Preferences updated successfully.',
            'user'    => $user->only([
                'id', 'timezone', 'language', 'email_notifications', 'theme',
            ]),
        ]);
    }

    /**
     * DELETE /api/settings/account
     * Deactivate the user account (soft delete alternative).
     */
    public function destroy(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->update(['is_active' => false]);
        $user->currentAccessToken()->delete();

        return response()->json(['message' => 'Account deactivated successfully.']);
    }
}