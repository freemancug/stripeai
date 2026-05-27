import assert from 'node:assert/strict';
import test from 'node:test';
import { AccessControlService } from '../src/modules/access/access-control.service.js';

const authFor = (apiKey: string) => ['Bearer', apiKey].join(' ');

test('enforces per-tenant rpm independently', () => {
  const service = new AccessControlService({
    tenantApiKeysConfig: 'key-a|workspace_a|user_a|ak_a|1|2;key-b|workspace_b|user_b|ak_b|1|2',
    defaultRpmLimit: 120,
    defaultConcurrencyLimit: 20
  });

  assert.equal(service.authenticate('a1', authFor('key-a')).ok, true);
  assert.equal(service.acquireIsolation('a1').ok, true);
  service.release('a1');

  assert.equal(service.authenticate('a2', authFor('key-a')).ok, true);
  const secondA = service.acquireIsolation('a2');
  assert.equal(secondA.ok, false);
  service.release('a2');

  assert.equal(service.authenticate('b1', authFor('key-b')).ok, true);
  assert.equal(service.acquireIsolation('b1').ok, true);
  service.release('b1');
});

test('enforces per-tenant concurrency independently', () => {
  const service = new AccessControlService({
    tenantApiKeysConfig: 'key-a|workspace_a|user_a|ak_a|10|1;key-b|workspace_b|user_b|ak_b|10|1',
    defaultRpmLimit: 120,
    defaultConcurrencyLimit: 20
  });

  assert.equal(service.authenticate('a1', authFor('key-a')).ok, true);
  assert.equal(service.acquireIsolation('a1').ok, true);

  assert.equal(service.authenticate('a2', authFor('key-a')).ok, true);
  const blocked = service.acquireIsolation('a2');
  assert.equal(blocked.ok, false);
  service.release('a2');

  assert.equal(service.authenticate('b1', authFor('key-b')).ok, true);
  assert.equal(service.acquireIsolation('b1').ok, true);

  service.release('a1');
  service.release('b1');
});
