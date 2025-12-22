#!/usr/bin/env node

/**
 * Test script to validate date handling in schedule API
 * Run: node test-schedule-dates.js
 */

const toDateOrUndefined = (value) => {
  if (!value) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
};

const testCases = [
  {
    name: 'Empty string should return undefined',
    input: '',
    expected: undefined,
  },
  {
    name: 'Null should return undefined',
    input: null,
    expected: undefined,
  },
  {
    name: 'ISO date string should be parsed',
    input: '2025-01-15T00:00:00.000Z',
    expected: new Date('2025-01-15T00:00:00.000Z'),
  },
  {
    name: 'Date object should be returned',
    input: new Date('2025-01-15T00:00:00.000Z'),
    expected: new Date('2025-01-15T00:00:00.000Z'),
  },
  {
    name: 'Invalid date string should return undefined',
    input: 'invalid-date',
    expected: undefined,
  },
];

console.log('Testing toDateOrUndefined function:\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase) => {
  const result = toDateOrUndefined(testCase.input);
  let isPass = false;

  if (testCase.expected === undefined) {
    isPass = result === undefined;
  } else {
    isPass = result && result.getTime() === testCase.expected.getTime();
  }

  if (isPass) {
    console.log(`✓ ${testCase.name}`);
    passed++;
  } else {
    console.log(`✗ ${testCase.name}`);
    console.log(`  Input: ${JSON.stringify(testCase.input)}`);
    console.log(`  Expected: ${testCase.expected}`);
    console.log(`  Got: ${result}`);
    failed++;
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
