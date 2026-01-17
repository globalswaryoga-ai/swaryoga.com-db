/**
 * Secrets Validator - Ensures all required secrets are set and valid
 * Prevents app startup if secrets are missing or using placeholder values
 */

interface SecretConfig {
  name: string;
  envVar: string;
  required: boolean;
  validate?: (value: string) => boolean;
  minLength?: number;
}

const SECRETS: SecretConfig[] = [
  // Database
  {
    name: 'MongoDB URI (Main)',
    envVar: 'MONGODB_URI_MAIN',
    required: true,
    validate: (v) => v.startsWith('mongodb+srv://') || v.startsWith('mongodb://'),
    minLength: 20,
  },
  {
    name: 'MongoDB CRM DB Name',
    envVar: 'MONGODB_CRM_DB_NAME',
    required: true,
    minLength: 1,
  },
  // JWT
  {
    name: 'JWT Secret',
    envVar: 'JWT_SECRET',
    required: true,
    minLength: 32,
  },
  // AWS
  {
    name: 'AWS Access Key',
    envVar: 'AWS_ACCESS_KEY_ID',
    required: true,
    minLength: 20,
  },
  {
    name: 'AWS Secret Access Key',
    envVar: 'AWS_SECRET_ACCESS_KEY',
    required: true,
    minLength: 40,
    validate: (v) => !v.includes('PLACEHOLDER') && !v.includes('your-'),
  },
  {
    name: 'AWS Region',
    envVar: 'AWS_REGION',
    required: true,
    validate: (v) => /^[a-z]{2}-[a-z]+-\d$/.test(v),
  },
  // Cashfree
  {
    name: 'Cashfree Client ID',
    envVar: 'CASHFREE_CLIENT_ID',
    required: true,
    minLength: 10,
    validate: (v) => !v.includes('PLACEHOLDER'),
  },
  {
    name: 'Cashfree Client Secret',
    envVar: 'CASHFREE_CLIENT_SECRET',
    required: true,
    minLength: 50,
    validate: (v) => v.startsWith('cfsk_') || v.startsWith('cfsk_ma_'),
  },
  // WhatsApp
  {
    name: 'WhatsApp Phone Number ID',
    envVar: 'WHATSAPP_PHONE_NUMBER_ID',
    required: true,
    minLength: 10,
    validate: (v) => /^\d+$/.test(v),
  },
  {
    name: 'WhatsApp Access Token',
    envVar: 'WHATSAPP_ACCESS_TOKEN',
    required: true,
    minLength: 100,
    validate: (v) => v.startsWith('EAAZA') || v.startsWith('EA'),
  },
  {
    name: 'WhatsApp Webhook Verify Token',
    envVar: 'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
    required: true,
    minLength: 5,
    validate: (v) => !v.includes('PLACEHOLDER'),
  },
  {
    name: 'Meta App Secret',
    envVar: 'META_APP_SECRET',
    required: true,
    minLength: 30,
    validate: (v) => /^[a-f0-9]+$/.test(v),
  },
  // Bridge
  {
    name: 'WhatsApp Bridge Secret',
    envVar: 'WHATSAPP_BRIDGE_SECRET',
    required: true,
    minLength: 10,
    validate: (v) => !v.includes('PLACEHOLDER'),
  },
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  secrets: {
    name: string;
    status: 'OK' | 'MISSING' | 'INVALID';
    message?: string;
  }[];
}

export function validateSecrets(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const secrets: ValidationResult['secrets'] = [];

  for (const secret of SECRETS) {
    const value = process.env[secret.envVar];
    
    // Check if required secret is missing
    if (secret.required && !value) {
      errors.push(`❌ Missing required secret: ${secret.name} (${secret.envVar})`);
      secrets.push({
        name: secret.name,
        status: 'MISSING',
        message: `Not set`,
      });
      continue;
    }

    // Skip validation if not required and not set
    if (!secret.required && !value) {
      secrets.push({
        name: secret.name,
        status: 'OK',
        message: 'Not required',
      });
      continue;
    }

    // Validate minimum length
    if (secret.minLength && value && value.length < secret.minLength) {
      errors.push(`❌ ${secret.name}: Value too short (min ${secret.minLength} chars, got ${value.length})`);
      secrets.push({
        name: secret.name,
        status: 'INVALID',
        message: `Too short (${value.length}/${secret.minLength} chars)`,
      });
      continue;
    }

    // Custom validation
    if (secret.validate && value && !secret.validate(value)) {
      errors.push(`❌ ${secret.name}: Invalid format or value`);
      secrets.push({
        name: secret.name,
        status: 'INVALID',
        message: 'Invalid format',
      });
      continue;
    }

    // All checks passed
    secrets.push({
      name: secret.name,
      status: 'OK',
      message: value ? `Set (${value.substring(0, 10)}...)` : 'Not set',
    });
  }

  // Check for placeholder values in all env vars
  const allEnvVars = Object.entries(process.env);
  for (const [key, value] of allEnvVars) {
    if (value && typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      if (
        lowerValue.includes('placeholder') ||
        lowerValue.includes('your-') ||
        lowerValue.includes('change-this') ||
        lowerValue.includes('xxx-xxx')
      ) {
        warnings.push(`⚠️  ${key} contains placeholder value`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    secrets,
  };
}

export function assertSecretsValid(): void {
  const result = validateSecrets();
  
  // Log validation status
  console.log('\n🔐 SECRETS VALIDATION REPORT');
  console.log('═'.repeat(60));
  
  for (const secret of result.secrets) {
    const icon = secret.status === 'OK' ? '✅' : '❌';
    console.log(`${icon} ${secret.name}: ${secret.message}`);
  }
  
  if (result.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    for (const warning of result.warnings) {
      console.log(`   ${warning}`);
    }
  }
  
  console.log('═'.repeat(60));

  // Fail if any errors
  if (!result.valid) {
    console.error('\n❌ SECRETS VALIDATION FAILED');
    console.error('Please set all required environment variables in .env.local or .env.production\n');
    
    for (const error of result.errors) {
      console.error(`   ${error}`);
    }
    
    console.error('\n🔗 SETUP GUIDE: See SECURITY_HARDENING_JAN17.md');
    process.exit(1);
  }

  console.log('✅ All secrets validated successfully!\n');
}

export function getSecretStatus(): ValidationResult {
  return validateSecrets();
}
