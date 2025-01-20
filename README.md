# @apostrophecms/minuscule

A tiny Express wrapper for safe, rapid microservice development

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
