
// Simple cache. Not sure if it'll be effective or useful in practice.
// We add some reporting metrics to help evalute its use in production

export class MemoryCache<TKey, TValue> {
    private cache: Map<TKey, TValue> = new Map<TKey, TValue>();
    private cacheHits = 0;
    private cacheMisses = 0;
    private evictions = 0;

    constructor(private maxEntries: number, private name: string) {
    }

    set(key: TKey, value: TValue) {
        this.cache.set(key, value);
        if (this.cache.size > this.maxEntries) {
            console.warn(`Memory cache ${this.name} reached max entries. Performing evictions.`);
            this.evict();
        }

        if (this.cache.size % 100 === 0) {
            this.report();
        }
    }

    get(key: TKey): TValue|undefined {
        const value = this.cache.get(key);
        if (value) {
            this.cacheHits++;
        } else {
            this.cacheMisses++;
        }

        // report every 100 queries
        if ((this.cacheHits + this.cacheMisses) % 100 == 0) {
            this.report();
        }

        return value;
    }

    get size() {
        return this.cache.size;
    }

    private evict() {
        // simple eviction for now, remove 10% arbitrary entries
        const numToEvict = 0.1 * this.maxEntries;
        const keysToRemove = [];
        let i = 0;
        for (const key of this.cache.keys()) {
            i++;
            if (i >= numToEvict) {
                continue;
            }

            keysToRemove.push(key);
        }

        for (const key of keysToRemove) {
            this.cache.delete(key);
        }

        this.evictions++;
    }

    private report() {
        console.log(`Cache ${this.name} report: size ${this.cache.size}, hits: ${this.cacheHits}, misses: ${this.cacheMisses}, evictions: ${this.evictions}`);
    }
}