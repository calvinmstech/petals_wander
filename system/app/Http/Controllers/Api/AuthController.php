<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * @group Authentication
 *
 * Register, log in, and manage the current session. Login returns a Bearer
 * token (Laravel Sanctum) plus the user's roles. Storefront and admin share
 * this endpoint — authorization is decided by role.
 */
class AuthController extends Controller
{
    /**
     * Register
     *
     * Create a new customer account and return an API token.
     *
     * @unauthenticated
     * @bodyParam name string required The user's full name. Example: Jane Doe
     * @bodyParam email string required Unique email. Example: jane@example.com
     * @bodyParam password string required Min 8 chars. Example: password123
     */
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $user = User::create($data);
        $user->assignRole('customer');

        $token = $user->createToken('storefront')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user->only('id', 'name', 'email'),
            'roles' => $user->getRoleNames(),
        ], 201);
    }

    /**
     * Login
     *
     * Authenticate with email + password. Works for both customers and admins.
     *
     * @unauthenticated
     * @bodyParam email string required Example: admin@flowershop.test
     * @bodyParam password string required Example: password
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user->only('id', 'name', 'email'),
            'roles' => $user->getRoleNames(),
        ]);
    }

    /**
     * Current user
     *
     * Return the authenticated user and their roles.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => $user->only('id', 'name', 'email'),
            'roles' => $user->getRoleNames(),
        ]);
    }

    /**
     * Logout
     *
     * Revoke the token used for the current request.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }
}
