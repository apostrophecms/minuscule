"use strict";

const assert = require('assert');

describe('test minuscule', function() {
  let server;
  before(function() {
    const express = require('express');
    const minuscule = require('../index.js');
    const app = express();
    const bodyParser = require('body-parser');
    // Allow traditional form submission format
    app.use(bodyParser.urlencoded({ extended: false }))
    // Allow JSON submissions (suggested)
    app.use(bodyParser.json());

    let nextId = 1;

    const data = [];

    const {
      get,
      post,
      error,
      validate
    } = minuscule(app);

    get('/projects', async req => {
      // Simulate async work
      await pause(100);
      return {
        results: data
      };
    });

    get('/projects/:projectId', expectProjectId, async req => {
      // Simulate async work
      await pause(100);
      const result = data.find(datum => datum.id === req.projectId);
      if (!result) {
        throw error(404, 'project not found');
      }
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
          requires: [ 'longName' ],
          validator(v) {
            return v.match(/^\w+/);
          }
        }
      });
      // Simulate async work
      await pause(100);
      project.id = nextId.toString();
      nextId++;
      data.push(project);
      return project;
    });

    async function expectProjectId(req) {
      if (!req.params.projectId.match(/^\w+/)) {
        throw error(400, 'projectId must contain only letters, digits and underscores');
      }
      req.projectId = req.params.projectId;
      // Can also use "await." If no error is thrown execution continues
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
      longName: 'test one',
      code: 'x999'
    });
    assert.strictEqual(response.shortName, 'test1');
    assert.strictEqual(response.longName, 'test one');
    assert.strictEqual(response.code, 'x999');
  });

  it('can fetch the populated projects list and fetch a single project', async function() {
    const response = await fetchGet('http://localhost:3737/projects');
    assert(Array.isArray(response.results));
    assert(response.results.length === 1);
    assert(response.results[0].shortName === 'test1');
    const response2 = await fetchGet(`http://localhost:3737/projects/${response.results[0].id}`);
    assert((typeof response2) === 'object');
    assert(response2.shortName === 'test1');
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
    throw res;
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
    throw res;
  }
  return res.json();
}
