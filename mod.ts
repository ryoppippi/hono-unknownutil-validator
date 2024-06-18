import type {
  Context,
  Env,
  MiddlewareHandler,
  TypedResponse,
  ValidationTargets,
} from "@hono/hono";
import { validator } from "@hono/hono/validator";

import * as U from "@core/unknownutil";

// deno-lint-ignore ban-types
type Hook<T, E extends Env, P extends string, O = {}> = (
  result: Result<T>,
  c: Context<E, P>,
) =>
  | Response
  | Promise<Response>
  | void
  | Promise<Response | void>
  | TypedResponse<O>;

type Result<T = unknown> =
  | { data: T; success: true }
  | { data: T; success: false; error: Omit<U.AssertError, "cause"> };

// deno-lint-ignore no-explicit-any
type Schema<T = any> = U.Predicate<T>;
type OutputType<T> = T extends U.Predicate<infer O>
  ? undefined extends O ? never : O
  : never;

/**
 * Create a validator middleware with [unknownutil](https://github.com/jsr-core/unknownutil) schema.
 *
 * @example
 * ```ts
 * import { is } from 'unknownutil'
 * import { uValidator } from '@hono/unknownutil-validator'
 *
 * const isAuthor = is.ObjectOf({
 *  name: is.String,
 *  age: is.Number,
 * })
 *
 * type Author = U.PredicateType<typeof isAuthor>
 *
 * app.post('/author', uValidator('json', schema), (c) => {
 *  const data = c.req.valid('json')
 *  return c.json({
 *    success: true,
 *    message: `${data.name} is ${data.age}`,
 *  })
 * })
 * ```
 */
export const uValidator = <
  S extends Schema,
  O extends OutputType<S>,
  Target extends keyof ValidationTargets,
  E extends Env,
  P extends string,
  V extends {
    in: { [K in Target]: O };
    out: { [K in Target]: O };
  } = {
    in: { [K in Target]: O };
    out: { [K in Target]: O };
  },
>(
  target: Target,
  schema: S,
  hook?: Hook<O, E, P>,
): MiddlewareHandler<E, P, V> =>
  validator(target, (value, c) => {
    let result: Result<U.PredicateType<S>>;

    try {
      result = { data: U.ensure(value, schema), success: true };
    } catch (_error: unknown) {
      const error = _error as unknown as U.AssertError;
      result = {
        data: value,
        success: false,
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack,
        },
      };
    }

    if (hook) {
      const hookResult = hook(result, c);
      if (hookResult) {
        if (hookResult instanceof Response || hookResult instanceof Promise) {
          return hookResult;
        }
        if ("response" in hookResult) {
          return hookResult.response;
        }
      }
    }

    if (!result.success) {
      return c.json(result, 400);
    }

    return result.data;
  });
