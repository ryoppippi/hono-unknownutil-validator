# Unknownutil validator middleware for Hono

[![JSR](https://jsr.io/badges/@ryoppippi/hono-unknownutil-validator)](https://jsr.io/@ryoppippi/hono-unknownutil-validator)
[![JSR](https://jsr.io/badges/@ryoppippi/hono-unknownutil-validator/score)](https://jsr.io/@ryoppippi/hono-unknownutil-validator)


The type validator middleware using [unknownutil](https://github.com/lambdalisue/deno-unknownutil) for [Hono](https://honojs.dev) applications.
You can write a schema with unknownutil and check the type of the incoming values.

## Usage

```ts
import { is } from '@core/unknownutil'
import { Hono } from '@hono/hono'
import { uValidator } from '@ryoppippi/hono-unknownutil-validator'

const schema = is.ObjectOf({
  name: is.String,
  age: is.Number,
})

app.post('/author', uValidator('json', schema), (c) => {
  const data = c.req.valid('json')
  return c.json({
    success: true,
    message: `${data.name} is ${data.age}`,
  })
})
```

Hook:

```ts
app.post(
  '/post',
  uValidator('json', schema, (result, c) => {
    if (result.error) {
      return c.text('Invalid!', 400)
    }
  })
  //...
)
```

## Author

Ryotaro "Justin" Kimura <https://github.com/ryoppippi>

## License

MIT
