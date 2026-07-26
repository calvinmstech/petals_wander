<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Catalog
 *
 * Public, read-only catalog endpoints consumed by the storefront.
 */
class CategoryController extends Controller
{
    /**
     * List categories
     *
     * @unauthenticated
     * @queryParam home boolean Only categories flagged to show on the home page. Example: true
     */
    public function index(Request $request): JsonResponse
    {
        $categories = Category::where('is_active', true)
            ->when($request->boolean('home'), fn ($q) => $q->where('show_on_home', true))
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'description', 'image_path', 'show_on_home']);

        return response()->json(['data' => $categories]);
    }
}
