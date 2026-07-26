<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * @group Admin · Categories
 *
 * Category management. Requires an authenticated user with the `admin` role.
 * @authenticated
 */
class AdminCategoryController extends Controller
{
    /**
     * List categories (admin)
     */
    public function index(): JsonResponse
    {
        return response()->json(['data' => Category::withCount('products')->orderBy('name')->get()]);
    }

    /**
     * Create category
     *
     * @bodyParam name string required Example: Wedding
     * @bodyParam description string Example: Arrangements for weddings.
     * @bodyParam is_active boolean Example: true
     */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validateData($request);
        $data['slug'] = $this->uniqueSlug($data['name']);

        return response()->json(['data' => Category::create($data)], 201);
    }

    /**
     * Show category (admin)
     *
     * @urlParam category int required Example: 1
     */
    public function show(Category $category): JsonResponse
    {
        return response()->json(['data' => $category->loadCount('products')]);
    }

    /**
     * Update category
     *
     * @urlParam category int required Example: 1
     */
    public function update(Request $request, Category $category): JsonResponse
    {
        $data = $this->validateData($request);

        if (isset($data['name']) && $data['name'] !== $category->name) {
            $data['slug'] = $this->uniqueSlug($data['name'], $category->id);
        }

        $category->update($data);

        return response()->json(['data' => $category]);
    }

    /**
     * Delete category
     *
     * @urlParam category int required Example: 1
     */
    public function destroy(Category $category): JsonResponse
    {
        $category->delete();

        return response()->json(['message' => 'Category deleted.']);
    }

    private function validateData(Request $request): array
    {
        return $request->validate([
            'name' => [$request->isMethod('post') ? 'required' : 'sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'image_path' => ['nullable', 'string', 'max:1000'],
            'show_on_home' => ['boolean'],
            'is_active' => ['boolean'],
        ]);
    }

    /**
     * Upload a category image
     *
     * @urlParam category int required Example: 1
     * @bodyParam image file required The category tile image.
     */
    public function uploadImage(Request $request, Category $category): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $path = $request->file('image')->store('categories', 'public');
        $category->update(['image_path' => Storage::disk('public')->url($path)]);

        return response()->json(['data' => $category]);
    }

    private function uniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $i = 1;

        while (Category::where('slug', $slug)->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = $base.'-'.(++$i);
        }

        return $slug;
    }
}
