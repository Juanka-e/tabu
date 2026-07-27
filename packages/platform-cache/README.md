# Platform Cache

Owns Redis/Valkey connectivity and disposable coordination primitives.

Allowed responsibilities:

- Redis client lifecycle
- health and retry behavior
- environment-specific key construction
- cache, counter, lock, and coordination contracts

Business truth must remain in MySQL. Domain-specific economy or game rules do not
belong in this package.
