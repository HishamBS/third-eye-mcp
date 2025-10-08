import { Database } from 'bun:sqlite';
import * as schema from './schema.js';
export * from './schema.js';
export declare function getDbPath(): string;
export declare function createDb(dbPath?: string): {
    db: import("drizzle-orm/bun-sqlite").BunSQLiteDatabase<typeof schema> & {
        $client: any;
    };
    sqlite: any;
};
export declare function runMigrations(db: ReturnType<typeof createDb>['db'], sqlite: Database): void;
export declare function getDb(): {
    dbPath: string;
    db: import("drizzle-orm/bun-sqlite").BunSQLiteDatabase<typeof schema> & {
        $client: any;
    };
    sqlite: any;
};
export declare function closeDb(): void;
//# sourceMappingURL=index.d.ts.map