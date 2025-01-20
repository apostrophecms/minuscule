# @apostrophecms/minuscule

**A tiny Express wrapper for safe, rapid microservice development**

minuscule seeks to allow developers to write API routes more safely, with less cognitive load and less chance of accidental bugs.

Specifically, minuscule allows developers to **simply return a value** from route functions, including async functions, and automatically encodes that as a JSON response. Similarly, minuscule allows developers to **simply throw an exception** from both middleware functions and route functions, whether they are async or not. minuscule also provides conveniences to create errors with the status code of the developer's choice, as well as a default 500 error for other exceptions.

Contrast this with using Express directly. Express 4 requires the developer to manually manipulate the `res` object, adding extra cognitive load and introducing a risk that the developr will forget to handle `res`, producing a hung request. Express 5 improves on this situation by catching rejected promises, but still does not allow for automatic handling of the "happy path" (the success case).

Note that minuscule middleware is different from Express middleware. While Express middleware must invoke `next()`, minuscule middleware just returns normally to continue execution, or throws an exception to end the request with an error.

## "What about use cases like redirects, static server middleware, etc.?"

Currently minuscule does not address these edge cases, because they rarely come up in API development. However if you have a need to implement these you can just use Express middleware and routes for the purpose. We have not ruled out adding support for redirects, etc. in minuscule itself.

## "Do I have to use Express 5 with minuscule?"

No, Express 4 is fine. Express 5 is also supported.

## installation

```bash
npm install express@5
npm install @apostrophecms/minuscule
```

## usage

```javascript
import express from 'express';
import yup from 'yup';
import { WebError, minuscule } from '@apostrophecms/minuscule';

const app = minuscule(express());

// Allow traditional form submission format (if you want it)
app.use(express.urlencoded({ extended: false }));

// Allow JSON submissions (recommended)
app.use(express.json());

app.use(expectApiKey);

// Example yup schema, see yup documentation
const projectSchema = object({
  shortName: string().required(),
  longName: string(),
  prod: boolean()
});

// async GET API functions that just return a result

get('/projects/:projectId', expectProjectId, async (req, res, next) => {
  const result = await myDatabase.findOne({
    id: req.params.projectId
  });

  return res.send(result);
});

// async POST API functions with easy, safe validation

post('/projects', async (req, res, next) => {
  const project = await projectSchema.validate(req.body);
  await myDatabase.insertOne(project);

  return res.send(project);
});

// Global validation middleware as an async function

async function expectApiKey(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    throw new WebError(403, 'API key required');
  }

  const matches = header.match(/^ApiKey\s+(\S.*)$/i);
  if (matches[1] !== 'some-api-key') {
    throw new WebError(403, 'Invalid API key');
  }

  next();
}

// Route-specific validation middleware as an async function

async function expectProjectId(req, res, next) {
  if (!req.params.projectId.match(/^\w+/)) {
    throw new WebError(400, 'projectId must contain only letters, digits and underscores');
  }
  req.projectId = req.params.projectId;
  // Can also use "await." If no error is thrown execution continues

  next();
}

app.listen(3000);
```

## Other methods available

The usual REST methods are available

* delete
* get
* head
* options
* patch
* post
* put

Please refer to [Express 5.x Routing methods](https://expressjs.com/en/5x/api.html#routing-methods) for the complete list.
