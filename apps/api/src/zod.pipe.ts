import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

// The schemas are zod, not class-validator, so Nest's ValidationPipe can't be used.
export class ZodPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown): unknown {
    const parsed = this.schema.safeParse(value);

    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues.map((issue) => {
          const field = issue.path.join('.');
          return field ? `${field}: ${issue.message}` : issue.message;
        }),
      );
    }

    return parsed.data;
  }
}
