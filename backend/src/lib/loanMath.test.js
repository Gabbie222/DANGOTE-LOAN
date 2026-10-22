import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateFlat,
  calculateReducing,
  calculateLoan,
  generateSchedule,
  computeMaxLoan,
  monthsBetween,
} from './loanMath.js';

describe('calculateFlat', () => {
  test('matches the plan\'s worked example: 12% p.a. flat, 12 months', () => {
    // Total interest = P * r * (n/12) = 1,000,000 * 0.12 * 1 = 120,000
    const { totalInterest, totalPayable, monthlyPayment } = calculateFlat(100_000_00, 12, 12);
    assert.equal(totalInterest, 12_000_00);
    assert.equal(totalPayable, 112_000_00);
    assert.equal(monthlyPayment, Math.round(112_000_00 / 12));
  });

  test('zero rate produces zero interest and even monthly split', () => {
    const { totalInterest, totalPayable, monthlyPayment } = calculateFlat(120_000_00, 0, 12);
    assert.equal(totalInterest, 0);
    assert.equal(totalPayable, 120_000_00);
    assert.equal(monthlyPayment, 10_000_00);
  });

  test('shorter tenure scales interest down proportionally', () => {
    const sixMonth = calculateFlat(100_000_00, 12, 6);
    const twelveMonth = calculateFlat(100_000_00, 12, 12);
    assert.equal(sixMonth.totalInterest, Math.round(twelveMonth.totalInterest / 2));
  });

  test('never returns a float — all outputs are integer kobo', () => {
    const result = calculateFlat(333_333, 13.7, 7);
    for (const value of Object.values(result)) {
      assert.equal(Number.isInteger(value), true, `expected integer kobo, got ${value}`);
    }
  });
});

describe('calculateReducing', () => {
  test('amortizes to a smaller total interest than flat rate for the same inputs', () => {
    const flat = calculateFlat(100_000_00, 12, 12);
    const reducing = calculateReducing(100_000_00, 12, 12);
    assert.ok(reducing.totalInterest < flat.totalInterest, 'reducing balance should always be cheaper than flat');
  });

  test('zero rate divides principal evenly with no interest', () => {
    const { totalInterest, monthlyPayment } = calculateReducing(120_000_00, 0, 12);
    assert.equal(totalInterest, 0);
    assert.equal(monthlyPayment, 10_000_00);
  });

  test('never returns a float — all outputs are integer kobo', () => {
    const result = calculateReducing(333_333, 13.7, 7);
    for (const value of Object.values(result)) {
      assert.equal(Number.isInteger(value), true, `expected integer kobo, got ${value}`);
    }
  });

  test('single-instalment loan repays exactly principal + one month of interest', () => {
    const { monthlyPayment, totalInterest } = calculateReducing(100_000_00, 12, 1);
    assert.equal(totalInterest, Math.round(100_000_00 * (12 / 100 / 12)));
    assert.equal(monthlyPayment, 100_000_00 + totalInterest);
  });
});

describe('calculateLoan dispatch', () => {
  test('routes FLAT and REDUCING to the matching calculator', () => {
    assert.deepEqual(calculateLoan(500_000, 10, 6, 'FLAT'), calculateFlat(500_000, 10, 6));
    assert.deepEqual(calculateLoan(500_000, 10, 6, 'REDUCING'), calculateReducing(500_000, 10, 6));
  });

  test('defaults to FLAT for any unrecognized method (fail safe, not fail open)', () => {
    assert.deepEqual(calculateLoan(500_000, 10, 6, 'SOMETHING_ELSE'), calculateFlat(500_000, 10, 6));
  });
});

describe('generateSchedule', () => {
  test('reducing-balance schedule: principal instalments sum exactly to the loan amount', () => {
    const principal = 1_000_000_00;
    const rows = generateSchedule(principal, 12, 12, 'REDUCING', new Date('2026-01-01'));
    const principalSum = rows.reduce((s, r) => s + r.principal, 0);
    assert.equal(principalSum, principal, 'a rounding drift here means the loan is never fully repaid, or overpaid');
  });

  test('reducing-balance schedule: interest total is within rounding tolerance of calculateLoan total', () => {
    const principal = 1_000_000_00;
    const rows = generateSchedule(principal, 12, 12, 'REDUCING', new Date('2026-01-01'));
    const interestSum = rows.reduce((s, r) => s + r.interest, 0);
    const { totalInterest } = calculateReducing(principal, 12, 12);
    // Per-instalment rounding can drift by at most 1 kobo per instalment.
    assert.ok(Math.abs(interestSum - totalInterest) <= rows.length, `drift ${interestSum - totalInterest} exceeds tolerance`);
  });

  test('flat schedule: principal instalments sum exactly to the loan amount', () => {
    const principal = 777_777_00;
    const rows = generateSchedule(principal, 10, 9, 'FLAT', new Date('2026-01-01'));
    const principalSum = rows.reduce((s, r) => s + r.principal, 0);
    assert.equal(principalSum, principal);
  });

  test('every instalment balance is non-negative and the final balance reaches zero', () => {
    const principal = 250_000_00;
    const rows = generateSchedule(principal, 15, 8, 'REDUCING', new Date('2026-03-15'));
    let balance = principal;
    for (const row of rows) {
      balance -= row.principal;
      assert.ok(balance >= 0, `balance went negative at instalment ${row.instalmentNo}`);
    }
    assert.equal(balance, 0);
  });

  test('due dates fall on consecutive months starting one month after disbursement', () => {
    const rows = generateSchedule(100_000_00, 10, 4, 'REDUCING', new Date('2026-01-15'));
    assert.equal(rows[0].dueDate.getMonth(), 1); // February (0-indexed)
    assert.equal(rows[3].dueDate.getMonth(), 4); // May
  });

  test('instalment numbers are 1-indexed and sequential', () => {
    const rows = generateSchedule(100_000_00, 10, 5, 'REDUCING', new Date('2026-01-01'));
    assert.deepEqual(rows.map((r) => r.instalmentNo), [1, 2, 3, 4, 5]);
  });
});

describe('computeMaxLoan', () => {
  test('caps at the lesser of product max and savings multiplier', () => {
    const max = computeMaxLoan({
      productMaxAmount: 2_000_000_00,
      savingsBalance: 100_000_00,
      multiplier: 2,
      existingOutstanding: 0,
    });
    assert.equal(max, 200_000_00); // savings cap (200k) is lower than product max (2M)
  });

  test('subtracts existing outstanding balance from the cap', () => {
    const max = computeMaxLoan({
      productMaxAmount: 2_000_000_00,
      savingsBalance: 100_000_00,
      multiplier: 2,
      existingOutstanding: 150_000_00,
    });
    assert.equal(max, 50_000_00);
  });

  test('never returns a negative number when outstanding exceeds the cap', () => {
    const max = computeMaxLoan({
      productMaxAmount: 2_000_000_00,
      savingsBalance: 10_000_00,
      multiplier: 2,
      existingOutstanding: 999_999_00,
    });
    assert.equal(max, 0);
  });
});

describe('monthsBetween', () => {
  test('counts whole calendar months elapsed, ignoring day-of-month', () => {
    assert.equal(monthsBetween(new Date('2024-01-31'), new Date('2024-03-01')), 2);
  });

  test('returns 0 for the same month regardless of day', () => {
    assert.equal(monthsBetween(new Date('2024-06-01'), new Date('2024-06-28')), 0);
  });

  test('handles year boundaries correctly', () => {
    assert.equal(monthsBetween(new Date('2023-11-01'), new Date('2024-02-01')), 3);
  });
});
