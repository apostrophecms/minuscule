"use strict";

const assert = require('assert');

const projectProps = {
  shortName: {
    validator: String,
    required: true
  },

  prod: Boolean,

  // Optional, but must be a string if present
  longName: String,

  // Optional, must be a string if present, and at least one
  // of longName and altName must be present (see below)
  altName: String,

  // Custom validator, only relevant if longName is present
  // (longName must be listed first)
  code: {
    error: 'must be a string and must match \w+',
    requires: [ 'longName' ],
    // Two validators in series
    validator: [
      String,
      (v) => {
        return v.match(/^\w+/);
      }
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
};

const projectValidators = [
  // We can also have validators that are not specific to a single field
  {
    validator({ longName, altName }) {
      return longName != null || altName != null;
    },
    error: 'At least one of longName and altName must be provided'
  }
];

describe('test minuscule', function() {
  let server;
  before(function() {
    const express = require('express');
    const { WebError, minuscule } = require('../index.js');
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
      patch,
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
        throw new WebError(404, 'project not found');
      }
      return result;
    });

    post('/projects', async req => {
      const project = validate(req.body, projectProps, projectValidators);
      // Simulate async work
      await pause(100);
      project.id = nextId.toString();
      nextId++;
      data.push(project);
      return project;
    });

    patch('/projects/:projectId', expectProjectId, async req => {
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
      const valid = validate(combined, projectProps, projectValidators);
      data[data.findIndex(datum => datum.id === req.projectId)] = valid;
      return valid;
    });

    async function expectProjectId(req) {
      if (!req.params.projectId.match(/^\w+/)) {
        throw new WebError(400, 'projectId must contain only letters, digits and underscores');
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
      prod: false,
      longName: 'test one',
      code: 'eligible-x999',
      bonusCode: 'cool-bonus'
    });
    assert.strictEqual(response.shortName, 'test1');
    assert.strictEqual(response.longName, 'test one');
    assert.strictEqual(response.code, 'eligible-x999');
  });

  it('cannot POST a new project if code has a bad data type', async function() {
    await assert.rejects(async function() {
      await fetchPost('http://localhost:3737/projects', {
        shortName: 'test2',
        prod: false,
        longName: 'test one',
        code: 999
      });
    });
  });

  it('cannot POST a new project with a bonusCode if code is not "eligible" (context access)', async function() {
    await assert.rejects(async function() {
      await fetchPost('http://localhost:3737/projects', {
        shortName: 'test3',
        prod: false,
        longName: 'test one',
        code: 'ineligible-5',
        bonusCode: 'sneaky'
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
    assert.strictEqual(response3.code, 'eligible-x999');
  });

  it('Get a 404 when fetching a project with a bogus id', async function() {
    await assert.rejects(fetchGet('http://localhost:3737/projects/madethisup'), {
      status: 404
    });
  });

  it('cannot POST a new project unless at least one of longName and altName is provided', async function() {
    await assert.rejects(async function() {
      await fetchPost('http://localhost:3737/projects', {
        shortName: 'test3',
        prod: false
      });
    });
    await fetchPost('http://localhost:3737/projects', {
      shortName: 'test3',
      prod: false,
      altName: 'alt name provided'
    });
    await fetchPost('http://localhost:3737/projects', {
      shortName: 'test3',
      prod: false,
      longName: 'long name provided'
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
