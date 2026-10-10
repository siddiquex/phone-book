import {
  createParamDecorator,
  InternalServerErrorException,
  type ExecutionContext,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { env } from './env.js';

const OWNER_COOKIE = 'owner_id';

const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000;
const OWNER_ID = z.uuid();

type OwningRequest = Request & { ownerId: string };

function readCookie(header: string | undefined): string | undefined {
  const values = (header ?? '')
    .split(';')
    .map((part) => part.trim().split('='))
    .filter(([key]) => key === OWNER_COOKIE)
    .map(([, value]) => value ?? '');

  // A same-named cookie from another app on this host can arrive first; ours is the uuid.
  return values.find((value) => OWNER_ID.safeParse(value).success);
}

// Identity by secret, not authentication: real auth replaces this file alone.
export function ownerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existing = readCookie(req.headers.cookie);
  const ownerId = existing ?? randomUUID();

  if (!existing) {
    res.cookie(OWNER_COOKIE, ownerId, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
  }

  (req as OwningRequest).ownerId = ownerId;
  next();
}

export const Owner = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const ownerId = ctx.switchToHttp().getRequest<OwningRequest>().ownerId;
  // Reachable only when the middleware is not applied, which would otherwise read as an empty book.
  if (!ownerId) throw new InternalServerErrorException('No owner on the request');

  return ownerId;
});
