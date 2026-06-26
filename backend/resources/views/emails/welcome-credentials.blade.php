<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to LearnShift</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; }
        .container { max-width: 480px; margin: 0 auto; padding: 24px; }
        .header { text-align: center; padding: 24px 0; border-bottom: 2px solid #e5e7eb; }
        .logo { font-size: 24px; font-weight: 700; color: #4f46e5; }
        .content { padding: 24px 0; }
        .credentials { background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0; }
        .credential-row { display: flex; justify-content: space-between; padding: 8px 0; }
        .label { font-weight: 600; color: #6b7280; }
        .value { font-family: monospace; color: #1f2937; }
        .footer { text-align: center; font-size: 12px; color: #9ca3af; padding-top: 24px; border-top: 1px solid #e5e7eb; }
        .button { display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; margin-top: 16px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">LearnShift</div>
        </div>
        <div class="content">
            <h1>Welcome, {{ $user->name }}!</h1>
            <p>Your account has been created on the LearnShift platform. You can log in using the credentials below.</p>

            <div class="credentials">
                <div class="credential-row">
                    <span class="label">Email</span>
                    <span class="value">{{ $user->email }}</span>
                </div>
                <div class="credential-row">
                    <span class="label">Temporary Password</span>
                    <span class="value">{{ $plainPassword }}</span>
                </div>
            </div>

            <p style="color: #dc2626; font-size: 14px;">
                <strong>⚠️ Security Notice:</strong> Please change your password after your first login.
            </p>

            <div style="text-align: center;">
                <a href="{{ config('app.url') ?? '#' }}" class="button">Go to LearnShift</a>
            </div>
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} LearnShift. All rights reserved.
        </div>
    </div>
</body>
</html>
