import { describe, expect, it } from 'vitest';

import { transactionRepository } from '../repositories/transaction.repository.js';
import { toConfigDTO, toPaymentDTO } from '../dto/payment.dto.js';

describe('Transaction ledger — immutability guard (repository layer)', () => {
  it('rejects every update path so the financial ledger is append-only', async () => {
    await expect(transactionRepository.updateById('x', {})).rejects.toThrow(/immutable/i);
    await expect(transactionRepository.updateOne({}, {})).rejects.toThrow(/immutable/i);
    await expect(transactionRepository.updateWithVersion('x', 0, {})).rejects.toThrow(/immutable/i);
  });
});

describe('Config DTO — secret hygiene', () => {
  it('never exposes provider secrets, only a credentialsConfigured flag', () => {
    const dto = toConfigDTO({
      _id: 'cfg1',
      organizationId: 'org1',
      restaurantId: 'rest1',
      provider: 'razorpay',
      environment: 'live',
      merchantIdEnc: 'iv.tag.ct',
      secretKeyEnc: 'iv.tag.ct',
      webhookSecretEnc: 'iv.tag.ct',
      isActive: true,
      isDefault: true,
    });
    expect(dto.credentialsConfigured).toBe(true);
    // No encrypted or plaintext secret leaks through the DTO.
    const serialized = JSON.stringify(dto);
    expect(serialized).not.toContain('iv.tag.ct');
    expect(dto).not.toHaveProperty('secretKeyEnc');
    expect(dto).not.toHaveProperty('merchantIdEnc');
    expect(dto).not.toHaveProperty('webhookSecretEnc');
  });
});

describe('Payment DTO — shape', () => {
  it('exposes integer minor-unit amounts and no internal mongoose noise', () => {
    const dto = toPaymentDTO({ _id: 'p1', orderId: 'o1', amount: 100000, currency: 'INR', status: 'captured', refundedAmount: 0, version: 2 });
    expect(dto).toMatchObject({ id: 'p1', amount: 100000, refundedAmount: 0, status: 'captured', version: 2 });
    expect(Number.isInteger(dto.amount)).toBe(true);
  });
});
