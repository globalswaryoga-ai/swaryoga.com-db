/**
 * Retired: the former script registered source recordings as generated twins
 * and reported fabricated identity scores. No acceptance result is available
 * until a real 3D inference and identity-validation pipeline is implemented.
 */
console.error(
  'BLOCKED: No real-time 3D identity model or face-validation inference is configured. ' +
  'This script will not create or certify avatar outputs.',
);
process.exitCode = 1;
