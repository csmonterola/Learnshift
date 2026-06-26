<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Quiz Parameters
    |--------------------------------------------------------------------------
    |
    | These values control quiz generation, submission limits, and mastery
    | thresholds for the LearnShift platform.
    |
    */

    'max_attempts' => (int) env('QUIZ_MAX_ATTEMPTS', 3),

    'pass_threshold' => (int) env('QUIZ_PASS_THRESHOLD', 70),

];
