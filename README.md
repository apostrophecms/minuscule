# @apostrophecms/minuscule

A tiny Express wrapper for safe, rapid microservice development

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
// Allow traditional form submission format (if you want it)
app.use(bodyParser.urlencoded({ extended: false }));

// Allow JSON submissions (recommended)
app.use(bodyParser.json());

const {
  get,
  post,
  validate,
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
  const project = validate(req.body, {
    shortName: {
      validator: String,
      required: true
    },

    // Optional, but must be a string if present
    longName: String,

    // Optional, must be a string if present, and at least one
    // of longName and altName must be present (see below)
    altName: String,

    // Custom validator, only relevant if longName is present
    // (longName must be listed first)
    code: {
      error: 'must be a string and must match \w+',
      requires: longName,
      // May pass an array of validators
      validator: [
        String,
        v => v.match(/^\w+/);
      ]
    },

    bonusCode: {
      error: 'must be a string and "code" must start with eligible-',
      // May access previously validated properties
      validator: [
        String,
        (v, { code }) => code.startsWith('eligible-')
      ]
    }
  }, [
    // We can also have validators that are not specific to a single field.
    // "validator" must be a function and receives the result object.
    // "error" must be provided
    {
      validator({ longName, altName }) {
        return longName != null || altName != null;
      },
      error: 'At least one of longName and altName must be provided'
    }
  ]);
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
