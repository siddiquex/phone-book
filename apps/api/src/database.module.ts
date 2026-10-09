import { Global, Inject, Module, type OnModuleDestroy } from '@nestjs/common';
import { createDb, type Db } from '@phone-book/db';
import { env } from './env.js';

export const DB = Symbol('DB');

// One pool per process, shared by every feature module that injects the token.
@Global()
@Module({
  providers: [{ provide: DB, useFactory: (): Db => createDb(env.DATABASE_URL) }],
  exports: [DB],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(DB) private readonly db: Db) {}

  // Without this the pool's idle sockets outlive the HTTP server and stall SIGTERM.
  onModuleDestroy(): Promise<void> {
    return this.db.$client.end();
  }
}
