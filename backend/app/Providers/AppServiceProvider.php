<?php

namespace App\Providers;

use App\Models\LearningMaterial;
use App\Observers\LearningMaterialObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        LearningMaterial::observe(LearningMaterialObserver::class);
    }
}
