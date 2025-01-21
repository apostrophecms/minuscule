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
npm install express
npm install body-parser
npm install @apostrophecms/minuscule
```

## usage

```javascript
const express = require('express');
const { WebError, minuscule } = require('@apostrophecms/minuscule');
const app = express();
const bodyParser = require('body-parser');
const yup = require('yup');

// Example yup schema, see yup documentation
const projectSchema = object({
  shortName: string().required(),
  longName: string(),
  prod: boolean()
});

// Allow traditional form submission format (if you want it)
app.use(bodyParser.urlencoded({ extended: false }));

// Allow JSON submissions (recommended)
app.use(bodyParser.json());

const {
  get,
  post,
  use
} = minuscule(app);

use(expectApiKey);

// async GET API functions that just return a result

get('/projects/:projectId', expectProjectId, async req => {
  const result = await myDatabase.findOne({
    id: req.params.projectId
  });
  // returning an object -> automatic JSON response via req.res
  return result;
});

// async POST API functions with easy, safe validation

post('/projects', async req => {
  const project = await projectSchema.validate(req.body);
  await myDatabase.insertOne(project);
  // returning an object -> automatic JSON response via req.res
  return project;
});

// Global validation middleware as an async function

async function expectApiKey(req) {
  const header = req.headers.authorization;
  if (!header) {
    throw new WebError(403, 'API key required');
  }
  const matches = header.match(/^ApiKey\s+(\S.*)$/i);
  if (matches[1] !== 'some-api-key') {
    throw new WebError(403, 'Invalid API key');
  }
}

// Route-specific validation middleware as an async function

async function expectProjectId(req) {
  if (!req.params.projectId.match(/^\w+/)) {
    throw new WebError(400, 'projectId must contain only letters, digits and underscores');
  }
  req.projectId = req.params.projectId;
  // Can also use "await." If no error is thrown execution continues
}

app.listen(3000);
```

## Other methods available

`patch`, `put` and `del` are available and wrap `app.patch`, `app.post` and `app.delete` the same way that `get` and `post` wrap `app.get` and `app.post`. `del` was named to avoid conflict with the `delete` keyword when importing.
