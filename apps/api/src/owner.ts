import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { env } from './env.js';

const OWNER_COOKIE = 'owner_id';

const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000;
const OWNER_ID = z.uuid();

type OwningRequest = Request & { ownerId: string };

function readCookie(header: string | undefined): string | undefined {
  return header
    ?.split(';')
    .map((part) => part.trim().split('='))
    .find(([key]) => key === OWNER_COOKIE)
    ?.at(1);
}

// Identity by secret, not authentication: real auth replaces this file alone.
export function ownerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const sent = readCookie(req.headers.cookie);
  const ownerId = sent && OWNER_ID.safeParse(sent).success ? sent : randomUUID();

  if (ownerId !== sent) {
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

export const Owner = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string =>
    ctx.switchToHttp().getRequest<OwningRequest>().ownerId,
);
