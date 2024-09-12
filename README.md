# @apostrophecms/minuscule

A tiny Express wrapper for fast microservice development

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
app.use(bodyParser.urlencoded({ extended: false }))
// Allow JSON submissions (suggested)
app.use(bodyParser.json())

const {
  get,
  post,
  error,
  validate
} = minuscule(app);

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

async function expectProjectId(req) {
  console.log('-->', req.url, req.params);
  if (!req.params.projectId.match(/^\w+/)) {
    throw error(400, 'projectId must contain only letters, digits and underscores');
  }
  req.projectId = req.params.projectId;
  // Can also use "await." If no error is thrown execution continues
}

app.listen(3000);
```
