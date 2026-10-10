import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { ownerMiddleware } from '../owner.js';
import { ContactsController } from './contacts.controller.js';
import { ContactsService } from './contacts.service.js';

@Module({
  controllers: [ContactsController],
  providers: [ContactsService],
})
export class ContactsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ownerMiddleware).forRoutes(ContactsController);
  }
}
