<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Catalog
 *
 * Public, read-only product endpoints consumed by the storefront.
 */
class ProductController extends Controller
{
    /**
     * List products
     *
     * Returns active products. Supports filtering and pagination.
     *
     * @unauthenticated
     * @queryParam category string Filter by category slug. Example: bouquets
     * @queryParam featured boolean Only featured products. Example: true
     * @queryParam search string Match against the product name. Example: rose
     * @queryParam per_page int Items per page (default 12). Example: 12
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::query()
            ->where('is_active', true)
            ->with('category:id,name,slug', 'categories:id,name,slug')
            ->withCount('variants');

        if ($slug = $request->query('category')) {
            $query->whereHas('categories', fn ($q) => $q->where('slug', $slug));
        }

        if ($request->boolean('featured')) {
            $query->where('is_featured', true);
        }

        if ($search = $request->query('search')) {
            $query->where('name', 'ilike', "%{$search}%");
        }

        $products = $query->latest()->paginate((int) $request->query('per_page', 12));

        return response()->json($products);
    }

    /**
     * Show product
     *
     * Fetch a single active product by its numeric id or its slug, so the
     * storefront can link to /product/:id while slug URLs keep working.
     *
     * @unauthenticated
     * @urlParam product string required The product id or slug. Example: red-rose-bouquet
     */
    public function show(string $product): JsonResponse
    {
        $model = Product::query()
            ->where('is_active', true)
            ->where(fn ($q) => $q->where('slug', $product)
                ->when(ctype_digit($product), fn ($q) => $q->orWhere('id', (int) $product)))
            ->firstOrFail();

        $model->load('category:id,name,slug', 'categories:id,name,slug', 'images', 'variants', 'related.category:id,name,slug');

        return response()->json(['data' => $model]);
    }
}
