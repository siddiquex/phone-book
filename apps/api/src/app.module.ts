import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { ContactsController } from './contacts/contacts.controller.js';
import { ContactsModule } from './contacts/contacts.module.js';
import { DatabaseModule } from './database.module.js';
import { ownerMiddleware } from './owner.js';

@Module({
  imports: [DatabaseModule, ContactsModule],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  // Only the contacts routes carry an owner; /health stays open to infrastructure probes.
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ownerMiddleware).forRoutes(ContactsController);
  }
}
