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
const minuscule = require('@apostrophecms/minuscule');
const app = express();
const bodyParser = require('body-parser');
// Allow traditional form submission format
app.use(bodyParser.urlencoded({ extended: false }));
// Allow JSON submissions (suggested)
app.use(bodyParser.json());

const {
  get,
  post,
  error,
  validate,
  use
} = minuscule(app);

use(expectApiKey);

get('/projects/:projectId', expectProjectId, async req => {
  const result = await myDatabase.findOne({
    id: req.params.projectId
  });
  // returning an object -> automatic JSON response via req.res
  return result;
});

post('/projects', async req => {
  const project = validate(req.body, {
    shortName: {
      validator: String,
      required: true
    },

    // Optional, but must be a string if present
    longName: String,

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
  });
  await myDatabase.insertOne(project);
  // returning an object -> automatic JSON response via req.res
  return project;
});

// Global validation middleware as an async function

async function expectApiKey(req) {
  const header = req.headers.authorization;
  if (!header) {
    throw error(403, 'API key required');
  }
  const matches = header.match(/^ApiKey\s+(\S.*)$/i);
  if (matches[1] !== 'some-api-key') {
    throw error(403, 'Invalid API key');
  }
}

// Route-specific validation middleware as an async function

async function expectProjectId(req) {
  if (!req.params.projectId.match(/^\w+/)) {
    throw error(400, 'projectId must contain only letters, digits and underscores');
  }
  req.projectId = req.params.projectId;
  // Can also use "await." If no error is thrown execution continues
}

app.listen(3000);
```
