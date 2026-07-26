# Introduction

REST API for the Flower Shop platform. Powers both the storefront and the admin backend. Authentication uses Bearer tokens (Laravel Sanctum); admin endpoints additionally require the `admin` role.

<aside>
    <strong>Base URL</strong>: <code>http://localhost:8014</code>
</aside>

    Storefront and admin clients share one login (`POST /api/auth/login`) and are
    authorized by **role**. Send the returned token as `Authorization: Bearer <token>`.

    <aside>Seeded accounts (dev): admin@petalwanders.test / password (admin),
    customer@petalwanders.test / password (customer).</aside>

