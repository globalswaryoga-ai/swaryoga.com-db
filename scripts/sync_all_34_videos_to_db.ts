console.error(
  'BLOCKED: This retired script registers unverified placeholder paths as completed avatar outputs. ' +
  'It will not write Bunny SQL records. Register only videos produced and verified by the real inference pipeline.',
);
process.exitCode = 1;
