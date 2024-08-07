import { test } from "@cross/test";
import { assertEquals, assertFalse, assertNotEquals } from "@std/assert";
import type { IsExact } from "type-testing";

import { Hono } from "@hono/hono";
import type { StatusCode } from "@hono/hono/utils/http-status";

import * as U from "@core/unknownutil";
import { uValidator } from "./mod.ts";

type ExtractSchema<T> = T extends Hono<infer _, infer S> ? S : never;

const isAuthor = U.is.ObjectOf({
  name: U.is.String,
  age: U.is.Number,
});

type Author = U.PredicateType<typeof isAuthor>;

const isItem = U.is.ObjectOf({
  id: U.is.Number,
  title: U.is.String,
});

type Item = U.PredicateType<typeof isItem>;
function generateApp() {
  const app = new Hono();

  const route = app.post("/author", uValidator("json", isAuthor), (c) => {
    const data = c.req.valid("json");
    return c.json({
      success: true,
      message: `${data.name} is ${data.age}`,
    });
  });

  type Actual = ExtractSchema<typeof route>;
  type Expected = {
    "/author": {
      $post: {
        input: {
          json: Author;
        };
        output: {
          success: boolean;
          message: string;
        };
        outputFormat: "json";
        status: StatusCode;
      };
    };
  };

  type verify = IsExact<Expected, Actual> extends true ? true : never;

  return app;
}

test("Should return 200 response", async () => {
  const app = generateApp();
  const req = new Request("http://localhost/author", {
    body: JSON.stringify(
      {
        name: "Superman",
        age: 20,
      } as const satisfies Author,
    ),
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const res = await app.request(req);
  assertNotEquals(res, null);
  assertEquals(res.status, 200);
  assertEquals(await res.json(), {
    success: true,
    message: "Superman is 20",
  });
});

test("Should return 400 response", async () => {
  const app = generateApp();
  const req = new Request("http://localhost/author", {
    body: JSON.stringify({
      name: "Superman",
      age: "20",
    }),
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const res = await app.request(req);

  assertNotEquals(res, null);
  assertEquals(res.status, 400);

  const data = (await res.json()) as { success: boolean };
  assertFalse(data["success"]);
});

function generateAppWithHook() {
  const app = new Hono();

  app.post(
    "/post",
    uValidator("json", isItem, (result, c) => {
      if (!result.success) {
        return c.text(`${result.data.id} is invalid!`, 400);
      }
      const data = result.data;
      return c.text(`${data.id} is valid!`);
    }),
    (c) => {
      const data = c.req.valid("json");
      return c.json({
        success: true,
        message: `${data.id} is ${data.title}`,
      });
    },
  );

  return app;
}

test("[With Hook]: Should return 200 response", async () => {
  const app = generateAppWithHook();
  const req = new Request("http://localhost/post", {
    body: JSON.stringify(
      {
        id: 123,
        title: "Hello",
      } as const satisfies Item,
    ),
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const res = await app.request(req);
  assertNotEquals(res, null);
  assertEquals(res.status, 200);
  assertEquals(await res.text(), "123 is valid!");
});

test("[With Hook]: Should return 400 response", async () => {
  const app = generateAppWithHook();
  const req = new Request("http://localhost/post", {
    body: JSON.stringify({
      id: "123",
      title: "Hello",
    }),
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const res = await app.request(req);
  assertNotEquals(res, null);
  assertEquals(res.status, 400);
  assertEquals(await res.text(), "123 is invalid!");
});
