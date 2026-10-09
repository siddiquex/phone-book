import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  contactCreateSchema,
  contactListQuerySchema,
  contactIdsSchema,
  contactUpdateSchema,
  type ContactIds,
  type ContactListQuery,
  type ContactInput,
  type ContactPatch,
} from '@phone-book/db';
import { Owner } from '../owner.js';
import { ZodPipe } from '../zod.pipe.js';
import { ContactsService } from './contacts.service.js';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  list(
    @Owner() ownerId: string,
    @Query(new ZodPipe(contactListQuerySchema)) query: ContactListQuery,
  ) {
    return this.contacts.list(ownerId, query);
  }

  @Post()
  create(@Owner() ownerId: string, @Body(new ZodPipe(contactCreateSchema)) input: ContactInput) {
    return this.contacts.create(ownerId, input);
  }

  @Patch(':id')
  update(
    @Owner() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(contactUpdateSchema)) patch: ContactPatch,
  ) {
    return this.contacts.update(ownerId, id, patch);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMany(@Owner() ownerId: string, @Body(new ZodPipe(contactIdsSchema)) body: ContactIds) {
    return this.contacts.removeMany(ownerId, body.ids);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Owner() ownerId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.contacts.remove(ownerId, id);
  }
}
