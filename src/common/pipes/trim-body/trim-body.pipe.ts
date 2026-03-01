import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

type PlainObject = Record<string, unknown>;

@Injectable()
export class TrimBodyPipe implements PipeTransform {
  private isObj(obj: unknown): obj is PlainObject {
    return typeof obj === 'object' && obj !== null;
  }

  private trim(values: PlainObject): PlainObject {
    return Object.fromEntries(
      Object.entries(values).map(([key, val]) => {
        if (key === 'password') return [key, val];
        if (this.isObj(val)) return [key, this.trim(val)];
        if (typeof val === 'string') return [key, val.trim()];
        return [key, val];
      }),
    );
  }

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const { type } = metadata;
    if (this.isObj(value) && type === 'body') {
      return this.trim(value);
    }
    return value;
  }
}
