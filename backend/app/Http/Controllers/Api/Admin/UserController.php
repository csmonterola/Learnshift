<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;

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

        if ($request->role === 'admin' && User::where('role', 'admin')->exists()) {
            return response()->json(['message' => 'Only one admin account is allowed.'], 403);
        }

        $user = User::create([
            'name'            => $request->name,
            'email'           => $request->email,
            'password'        => Hash::make($request->password),
            'role'            => $request->role,
            'enrollment_code' => in_array($request->role, ['student', 'parent']) ? Str::upper(Str::random(8)) : null,
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

        if ($request->has('role') && $request->role === 'admin' && !$user->isAdmin() && User::where('role', 'admin')->exists()) {
            return response()->json(['message' => 'Only one admin account is allowed.'], 403);
        }

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
            if ($data['role'] === 'admin' && User::where('role', 'admin')->exists()) {
                return response()->json(['message' => 'Only one admin account is allowed. Skipping admin creation.'], 403);
            }

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

    /**
     * Upload a CSV or XLSX file to bulk create accounts.
     */
    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,xlsx,xls,txt|max:10240',
        ]);

        $file = $request->file('file');
        $extension = $file->getClientOriginalExtension();
        $rows = [];

        if (in_array($extension, ['xlsx', 'xls'])) {
            if (!class_exists(IOFactory::class)) {
                return response()->json([
                    'message' => 'PhpSpreadsheet is not installed. Run: composer require phpoffice/phpspreadsheet',
                ], 500);
            }
            $spreadsheet = IOFactory::load($file->getPathname());
            $worksheet = $spreadsheet->getActiveSheet();
            $dataRows = $worksheet->toArray();
            $headerRow = array_shift($dataRows);
            $headers = array_map('strtolower', array_map('trim', $headerRow));
            $rows = $this->mapRowsFromHeaders($dataRows, $headers);
        } else {
            $handle = fopen($file->getPathname(), 'r');
            $headerRow = fgetcsv($handle);
            $headers = array_map('strtolower', array_map('trim', $headerRow));
            while (($line = fgetcsv($handle)) !== false) {
                $row = [];
                foreach ($headers as $idx => $header) {
                    $row[$header] = $line[$idx] ?? '';
                }
                $rows[] = $row;
            }
            fclose($handle);
        }

        // Detect name columns: try "name" first, then fall back to firstname/lastname
        $usesFirstLast = false;
        $nameKey = 'name';
        if (!empty($rows) && !isset($rows[0]['name'])) {
            $keys = array_keys($rows[0]);
            if (in_array('firstname', $keys) || in_array('first_name', $keys) || in_array('first name', $keys)) {
                $usesFirstLast = true;
            }
        }

        $created = [];
        $errors = [];

        foreach ($rows as $idx => $row) {
            if ($usesFirstLast) {
                $firstname = trim($row['firstname'] ?? $row['first_name'] ?? $row['first name'] ?? '');
                $lastname  = trim($row['lastname'] ?? $row['last_name'] ?? $row['last name'] ?? '');
                $name      = trim($firstname . ' ' . $lastname);
            } else {
                $name = trim($row['name'] ?? '');
            }

            $email = trim($row['email'] ?? '');
            $role  = strtolower(trim($row['role'] ?? 'student'));

            if (empty($name) && empty($email)) {
                continue;
            }

            if (empty($name) || empty($email)) {
                $errors[] = "Row " . ($idx + 2) . ": Missing required fields (name, email).";
                continue;
            }

            if (!in_array($role, ['student', 'teacher', 'parent', 'admin'])) {
                $role = 'student';
            }

            if ($role === 'admin' && User::where('role', 'admin')->exists()) {
                $errors[] = "Row " . ($idx + 2) . ": Cannot create admin. Only one admin account is allowed.";
                continue;
            }

            if (User::where('email', $email)->exists()) {
                $errors[] = "Row " . ($idx + 2) . ": Email {$email} already exists.";
                continue;
            }

            $password = Str::random(10);

            $user = User::create([
                'name'            => $name,
                'email'           => $email,
                'password'        => Hash::make($password),
                'role'            => $role,
                'enrollment_code' => in_array($role, ['student', 'parent']) ? Str::upper(Str::random(8)) : null,
            ]);

            if ($user->role === 'student') {
                StudentProfile::create(['student_id' => $user->id]);
            }

            $created[] = array_merge($user->toArray(), ['plain_password' => $password]);
        }

        if (!empty($created)) {
            ActivityLog::create([
                'user_id'     => $request->user()->id,
                'action'      => 'bulk_accounts_created',
                'description' => "Bulk created " . count($created) . " accounts via file upload.",
            ]);
        }

        return response()->json([
            'created' => $created,
            'errors'  => $errors,
            'total_created' => count($created),
            'total_errors'  => count($errors),
        ], empty($created) && !empty($errors) ? 422 : 201);
    }

    private function mapRowsFromHeaders(array $dataRows, array $headers): array
    {
        $rows = [];
        foreach ($dataRows as $dataRow) {
            $row = [];
            foreach ($headers as $idx => $header) {
                $row[$header] = $dataRow[$idx] ?? '';
            }
            if (!empty(array_filter($row))) {
                $rows[] = $row;
            }
        }
        return $rows;
    }
}