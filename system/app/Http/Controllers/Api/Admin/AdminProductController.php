<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * @group Admin · Products
 *
 * Catalog management. Requires an authenticated user with the `admin` role.
 * @authenticated
 */
class AdminProductController extends Controller
{
    /**
     * List products (admin)
     *
     * Includes inactive products. Supports `search`.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::query()
            ->with('category:id,name,slug', 'categories:id,name,slug')
            ->withCount('variants');

        if ($search = $request->query('search')) {
            $query->where('name', 'ilike', "%{$search}%");
        }

        if ($categoryId = $request->query('category_id')) {
            $query->whereHas('categories', fn ($q) => $q->where('categories.id', $categoryId));
        }

        return response()->json($query->latest()->paginate((int) $request->query('per_page', 20)));
    }

    /**
     * Create product
     *
     * @bodyParam name string required Example: Sunflower Bundle
     * @bodyParam category_id int Example: 1
     * @bodyParam description string Example: A cheerful bundle of sunflowers.
     * @bodyParam price number required Example: 79.90
     * @bodyParam stock int required Example: 25
     * @bodyParam image_path string Example: https://example.com/sunflower.jpg
     * @bodyParam is_active boolean Example: true
     * @bodyParam is_featured boolean Example: false
     * @bodyParam variants object[] Optional size variants. Example: [{"size":"Small","sku":"SF-S","price":38,"stock":20}]
     * @bodyParam related_ids int[] Ids of related products. Example: [2,3]
     */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validateData($request);
        $data['slug'] = $this->uniqueSlug($data['name']);

        $product = Product::create($data);
        $this->syncCategories($product, $request);
        $this->syncVariants($product, $request);
        $this->syncRelated($product, $request);

        return response()->json(['data' => $product->load('categories:id,name,slug', 'variants', 'related:id,name')], 201);
    }

    /**
     * Show product (admin)
     *
     * @urlParam product int required Example: 1
     */
    public function show(Product $product): JsonResponse
    {
        return response()->json([
            'data' => $product->load('category:id,name,slug', 'categories:id,name,slug', 'images', 'variants', 'related:id,name,slug'),
        ]);
    }

    /**
     * Update product
     *
     * @urlParam product int required Example: 1
     */
    public function update(Request $request, Product $product): JsonResponse
    {
        $data = $this->validateData($request, $product->id);

        if (isset($data['name']) && $data['name'] !== $product->name) {
            $data['slug'] = $this->uniqueSlug($data['name'], $product->id);
        }

        $product->update($data);
        $this->syncCategories($product, $request);
        $this->syncVariants($product, $request);
        $this->syncRelated($product, $request);

        return response()->json(['data' => $product->load('categories:id,name,slug', 'variants', 'related:id,name')]);
    }

    /**
     * Delete product
     *
     * @urlParam product int required Example: 1
     */
    public function destroy(Product $product): JsonResponse
    {
        $product->delete();

        return response()->json(['message' => 'Product deleted.']);
    }

    /**
     * Replace the product's size variants when a `variants` array is supplied.
     */
    private function syncVariants(Product $product, Request $request): void
    {
        if (! $request->has('variants')) {
            return;
        }

        $variants = $request->validate([
            'variants' => ['array'],
            'variants.*.size' => ['required', 'string', 'max:50'],
            'variants.*.sku' => ['required', 'string', 'max:80'],
            'variants.*.price' => ['required', 'numeric', 'min:0'],
            'variants.*.stock' => ['required', 'integer', 'min:0'],
            'variants.*.is_active' => ['boolean'],
        ])['variants'];

        $product->variants()->delete();

        foreach ($variants as $i => $v) {
            $product->variants()->create([
                'size' => $v['size'],
                'sku' => $v['sku'],
                'price' => $v['price'],
                'stock' => $v['stock'],
                'is_active' => $v['is_active'] ?? true,
                'position' => $i,
            ]);
        }
    }

    /**
     * Sync the related-products pivot when `related_ids` is supplied.
     */
    private function syncRelated(Product $product, Request $request): void
    {
        if (! $request->has('related_ids')) {
            return;
        }

        $ids = collect($request->validate([
            'related_ids' => ['array'],
            'related_ids.*' => ['integer', 'exists:products,id'],
        ])['related_ids'])->reject(fn ($id) => (int) $id === $product->id)->values();

        $product->related()->sync($ids);
    }

    /**
     * Bind the product to multiple categories. The first id becomes the primary
     * category (products.category_id) used for the storefront card label.
     */
    private function syncCategories(Product $product, Request $request): void
    {
        if (! $request->has('category_ids')) {
            return;
        }

        $ids = collect($request->validate([
            'category_ids' => ['array'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
        ])['category_ids'])->map(fn ($id) => (int) $id)->unique()->values();

        $product->categories()->sync($ids);
        $product->forceFill(['category_id' => $ids->first()])->save();
    }

    /**
     * Upload one or more images for a product (multipart). The first image on a
     * product with no default becomes the default.
     *
     * @urlParam product int required Example: 1
     * @bodyParam images file[] required One or more image files.
     */
    public function uploadImages(Request $request, Product $product): JsonResponse
    {
        $request->validate([
            'images' => ['required', 'array', 'min:1'],
            'images.*' => ['file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $position = (int) ($product->images()->max('position') ?? -1) + 1;
        $hasDefault = $product->images()->where('is_default', true)->exists();

        foreach ($request->file('images') as $file) {
            $path = $file->store('products', 'public');
            $product->images()->create([
                'path' => Storage::disk('public')->url($path),
                'is_default' => ! $hasDefault,
                'position' => $position++,
            ]);
            $hasDefault = true;
        }

        $product->syncPrimaryImage();

        return response()->json(['data' => $product->load('images')]);
    }

    /**
     * Delete a product image. If it was the default, the next image is promoted.
     *
     * @urlParam product int required Example: 1
     * @urlParam image int required Example: 5
     */
    public function deleteImage(Product $product, ProductImage $image): JsonResponse
    {
        abort_unless($image->product_id === $product->id, 404);

        $this->deleteStoredFile($image->path);
        $wasDefault = $image->is_default;
        $image->delete();

        if ($wasDefault) {
            $next = $product->images()->first();
            $next?->update(['is_default' => true]);
        }

        $product->syncPrimaryImage();

        return response()->json(['data' => $product->load('images')]);
    }

    /**
     * Flag an image as the product's default (primary) image.
     *
     * @urlParam product int required Example: 1
     * @urlParam image int required Example: 5
     */
    public function setDefaultImage(Product $product, ProductImage $image): JsonResponse
    {
        abort_unless($image->product_id === $product->id, 404);

        $product->images()->update(['is_default' => false]);
        $image->update(['is_default' => true]);
        $product->syncPrimaryImage();

        return response()->json(['data' => $product->load('images')]);
    }

    /**
     * Remove a file previously written to the public disk (ignores bundled
     * /images/... seed assets that don't live on the disk).
     */
    private function deleteStoredFile(?string $url): void
    {
        if (! $url) {
            return;
        }
        $marker = '/storage/';
        $pos = strpos($url, $marker);
        if ($pos !== false) {
            Storage::disk('public')->delete(substr($url, $pos + strlen($marker)));
        }
    }

    private function validateData(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'name' => [$request->isMethod('post') ? 'required' : 'sometimes', 'string', 'max:255'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'description' => ['nullable', 'string'],
            'price' => [$request->isMethod('post') ? 'required' : 'sometimes', 'numeric', 'min:0'],
            'stock' => [$request->isMethod('post') ? 'required' : 'sometimes', 'integer', 'min:0'],
            'image_path' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['boolean'],
            'is_featured' => ['boolean'],
        ]);
    }

    private function uniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $i = 1;

        while (Product::where('slug', $slug)->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = $base.'-'.(++$i);
        }

        return $slug;
    }
}
