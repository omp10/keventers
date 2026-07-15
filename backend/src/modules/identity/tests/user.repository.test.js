import { describe, it, expect, beforeEach } from 'vitest';

import { UserRepository } from '../repositories/user.repository.js';

/**
 * Repository test: verifies the UserRepository builds the correct queries
 * against its model (normalization + projection), using a fake Mongoose model.
 */
function makeFakeModel(doc) {
  const calls = { findOne: [], select: [] };
  const query = {
    select(projection) {
      calls.select.push(projection);
      return query;
    },
    session() {
      return query;
    },
    // Thenable so `await model.findOne(...)` resolves to the doc.
    then(resolve) {
      resolve(doc);
    },
  };
  const model = {
    calls,
    findOne(filter) {
      calls.findOne.push(filter);
      return query;
    },
  };
  return model;
}

describe('UserRepository', () => {
  let doc;
  let model;
  let repo;

  beforeEach(() => {
    doc = { email: 'a@b.com', passwordHash: 'h', toObject: () => ({ email: 'a@b.com', passwordHash: 'h' }) };
    model = makeFakeModel(doc);
    repo = new UserRepository(model);
  });

  it('lowercases the email in findByEmail and applies the soft-delete guard implicitly', async () => {
    await repo.findByEmail('A@B.com');
    expect(model.calls.findOne[0].email).toBe('a@b.com');
  });

  it('selects the hidden passwordHash in findByEmailForAuth', async () => {
    const result = await repo.findByEmailForAuth('A@B.com');
    expect(model.calls.findOne[0]).toEqual({ email: 'a@b.com', deletedAt: null });
    expect(model.calls.select).toContain('+passwordHash');
    expect(result.passwordHash).toBe('h');
  });
});
