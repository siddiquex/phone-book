import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { ContactsModule } from './contacts/contacts.module.js';
import { DatabaseModule } from './database.module.js';

@Module({
  imports: [DatabaseModule, ContactsModule],
  controllers: [AppController],
})
export class AppModule {}
