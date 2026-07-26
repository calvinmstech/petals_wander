<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DeliveryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\Admin\AdminProductController;
use App\Http\Controllers\Api\Admin\AdminCategoryController;
use App\Http\Controllers\Api\Admin\AdminOrderController;
use App\Http\Controllers\Api\Admin\AdminCustomerController;
use App\Http\Controllers\Api\Admin\AdminSettingController;

/*
|--------------------------------------------------------------------------
| Public routes
|--------------------------------------------------------------------------
*/
Route::get('/health', fn () => response()->json(['status' => 'ok', 'service' => 'flower-shop-api']));

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{product}', [ProductController::class, 'show']);
Route::get('/settings/payment', [SettingController::class, 'payment']);
Route::get('/settings/home', [SettingController::class, 'home']);
Route::post('/delivery/quote', [DeliveryController::class, 'quote']);

// Guest checkout: these accept an optional Bearer token (the order is then tied
// to that account) and otherwise place/expose a guest order, which is guarded by
// the one-time `guest_token` handed back when it was placed.
Route::post('/orders', [OrderController::class, 'store']);
Route::get('/orders/{order}', [OrderController::class, 'show']);
Route::post('/orders/{order}/receipt', [OrderController::class, 'uploadReceipt']);

/*
|--------------------------------------------------------------------------
| Authenticated routes (any logged-in user)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/orders', [OrderController::class, 'index']);
});

/*
|--------------------------------------------------------------------------
| Admin routes (role: admin)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {
    Route::apiResource('products', AdminProductController::class);
    Route::post('products/{product}/images', [AdminProductController::class, 'uploadImages']);
    Route::delete('products/{product}/images/{image}', [AdminProductController::class, 'deleteImage']);
    Route::patch('products/{product}/images/{image}/default', [AdminProductController::class, 'setDefaultImage']);
    Route::apiResource('categories', AdminCategoryController::class);
    Route::post('categories/{category}/image', [AdminCategoryController::class, 'uploadImage']);
    Route::get('orders', [AdminOrderController::class, 'index']);
    Route::get('orders/{order}', [AdminOrderController::class, 'show']);
    Route::patch('orders/{order}', [AdminOrderController::class, 'update']);
    Route::get('dashboard', [AdminOrderController::class, 'dashboard']);
    Route::get('customers', [AdminCustomerController::class, 'index']);
    Route::get('customers/{user}', [AdminCustomerController::class, 'show']);
    Route::get('settings/payment', [AdminSettingController::class, 'show']);
    Route::put('settings/payment', [AdminSettingController::class, 'update']);
    Route::post('settings/payment/qr', [AdminSettingController::class, 'uploadPaymentQr']);
    Route::get('settings/home', [AdminSettingController::class, 'showHome']);
    Route::put('settings/home', [AdminSettingController::class, 'updateHome']);
    Route::post('settings/home/image', [AdminSettingController::class, 'uploadHomeImage']);
});
