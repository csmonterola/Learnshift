<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use App\Models\SchoolClass;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $totalStudents = User::where('role', 'student')->count();
        $totalTeachers = User::where('role', 'teacher')->count();
        $totalClasses  = SchoolClass::count();

        $recentActivities = ActivityLog::with('user')
            ->latest()
            ->take(5)
            ->get()
            ->map(fn($log) => [
                'id'          => $log->id,
                'user_name'   => $log->user?->name ?? 'System',
                'action'      => $log->action,
                'description' => $log->description,
                'created_at'  => $log->created_at?->diffForHumans(),
            ]);

        return response()->json([
            'total_students'    => $totalStudents,
            'total_teachers'    => $totalTeachers,
            'total_classes'     => $totalClasses,
            'recent_activities' => $recentActivities,
        ]);
    }

    /**
     * GET /api/admin/activity-logs
     * Paginated, searchable, filterable activity logs.
     */
    public function activityLogs(Request $request)
    {
        $query = ActivityLog::with('user');

        // Filter by action type
        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        // Search by user name or description
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhereHas('user', fn($u) => $u->where('name', 'like', "%{$search}%"));
            });
        }

        // Date range
        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->to);
        }

        $logs = $query->latest()
            ->paginate($request->per_page ?? 20)
            ->through(fn($log) => [
                'id'          => $log->id,
                'user_name'   => $log->user?->name ?? 'System',
                'action'      => $log->action,
                'description' => $log->description,
                'created_at'  => $log->created_at?->toDateTimeString(),
                'human_time'  => $log->created_at?->diffForHumans(),
            ]);

        return response()->json($logs);
    }
}