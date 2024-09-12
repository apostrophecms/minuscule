# @apostrophecms/minuscule

A tiny Express wrapper for fast microservice development

## installation

```bash
npm install express
npm install @apostrophecms/minuscule
```

## usage

```javascript
const express = require('express');
const minuscule = require('@apostrophecms/minuscule');
const app = express();
app.listen(3000);

const {
  use,
  get,
  post,
  error,
  validate
} = minuscule(app);

get('/projects/:projectId', expectProjectId, async req => {
  const results = await myDatabase.find({
    projectId: req.params.projectId
  });
  // returning an object -> automatic JSON response via req.res
  return {
    results
  };
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
      requires: longName,
      validator(v) {
        return v.match(/^\w+/);
      }
    }
  });
  await myDatabase.insertOne(project);
  // returning an object -> automatic JSON response via req.res
  return project;
});

async function expectProjectId(async) {
  if (!req.params.projectId.matches(/^\w+/)) {
    throw error(400, 'projectId must contain only letters, digits and underscores');
  }
  req.params = req.params.projectId;
  // Can also use "await." If no error is thrown execution continues
}
```
