import { Module } from '@nestjs/common';
import { createDb, type Db } from '@phone-book/db';
import { AppController } from './app.controller.js';
import { env } from './env.js';

const DB = Symbol('DB');

@Module({
  controllers: [AppController],
  providers: [{ provide: DB, useFactory: (): Db => createDb(env.DATABASE_URL) }],
})
export class AppModule {}
