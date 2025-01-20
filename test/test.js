import assert from 'node:assert/strict';
import express from 'express';
import { object, string, boolean, number } from 'yup';
import { WebError, minuscule } from '../index.js';

const projectSchema = object({
  shortName: string().required(),
  longName: string(),
  prod: boolean()
});

describe('test minuscule', function() {
  let server;
  before(function() {
    const app = minuscule(express());
    // Allow traditional form submission format
    app.use(express.urlencoded({ extended: false }))
    // Allow JSON submissions (suggested)
    app.use(express.json());

    let nextId = 1;
    const data = [];

    app.get('/projects', async (req, res, next) => {
      // Simulate async work
      await pause(100);
      res.send({
        results: data
      });
    });

    app.get('/projects/:projectId', expectProjectId, async (req, res, next) => {
      // Simulate async work
      await pause(100);
      const result = data.find(datum => datum.id === req.projectId);
      if (!result) {
        throw new WebError(404, 'project not found');
      }
      return res.send(result);
    });

    app.post('/projects', async (req, res, next) => {
      const project = await projectSchema.validate(req.body);
      // Simulate async work
      await pause(100);
      project.id = nextId.toString();
      nextId++;
      data.push(project);
      return res.send(project);
    });

    app.patch('/projects/:projectId', expectProjectId, async (req, res, next) => {
      // Simulate async work
      await pause(100);
      const result = data.find(datum => datum.id === req.projectId);
      if (!result) {
        throw new WebError(404, 'project not found');
      }
      const combined = {
        ...result,
        ...req.body
      };
      const valid = await projectSchema.validate(combined);
      data[data.findIndex(datum => datum.id === req.projectId)] = valid;
      return res.send(valid);
    });

    async function expectProjectId(req, res, next) {
      if (!req.params.projectId.match(/^\w+/)) {
        throw new WebError(400, 'projectId must contain only letters, digits and underscores');
      }
      req.projectId = req.params.projectId;
      // Can also use "await." If no error is thrown execution continues

      next();
    }

    server = app.listen(3737);

    // Validates async support
    function pause(ms) {
      return new Promise((resolve) => setTimeout(() => resolve(), ms));
    }
  });

  after(function() {
    server.close(() => {});
  });

  it('can fetch the empty projects list', async function() {
    const response = await fetchGet('http://localhost:3737/projects');
    assert(Array.isArray(response.results));
    assert(response.results.length === 0);
  });

  it('can POST a new project', async function() {
    const response = await fetchPost('http://localhost:3737/projects', {
      shortName: 'test1',
      prod: false
    });
    assert.strictEqual(response.shortName, 'test1');
    assert.strictEqual(response.prod, false);
  });

  it('cannot POST a new project if prod is not a boolean', async function() {
    await assert.rejects(async function() {
      await fetchPost('http://localhost:3737/projects', {
        shortName: 'test2',
        prod: 'invalidValue'
      });
    });
  });

  it('can fetch the populated projects list and fetch a single project and patch a project', async function() {
    const response = await fetchGet('http://localhost:3737/projects');
    assert(Array.isArray(response.results));
    assert(response.results.length === 1);
    const project = response.results[0];
    assert(project.shortName === 'test1');
    const response2 = await fetchGet(`http://localhost:3737/projects/${project.id}`);
    assert((typeof response2) === 'object');
    assert(response2.shortName === 'test1');
    const response3 = await fetchPatch(`http://localhost:3737/projects/${project.id}`, {
      longName: 'test one2',
    });
    assert.strictEqual(response3.shortName, 'test1');
    assert.strictEqual(response3.longName, 'test one2');
    assert.strictEqual(response3.prod, false);
  });

  it('Get a 404 when fetching a project with a bogus id', async function() {
    await assert.rejects(fetchGet('http://localhost:3737/projects/madethisup'), {
      status: 404
    });
  });

});

async function fetchGet(url) {
  const res = await fetch(url);
  if (res.status >= 400) {
    const e = new Error('GET fetch error');
    e.status = res.status;
    throw e;
  }
  return res.json();
}

async function fetchPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (res.status >= 400) {
    const e = new Error('POST fetch error');
    e.status = res.status;
    throw e;
  }
  return res.json();
}

async function fetchPatch(url, body) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (res.status >= 400) {
    const e = new Error('PATCH fetch error');
    e.status = res.status;
    throw e;
  }
  return res.json();
}
