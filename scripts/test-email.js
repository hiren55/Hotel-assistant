#!/usr/bin/env node
/**
 * Test Email Service
 *
 * Usage: node scripts/test-email.js your-email@example.com
 */

const path = require('path');
const fs = require('fs');

// Load .env file
const envPath = path.join(__dirname, '..', 'apps', 'api', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && match[1] && match[2] !== undefined) {
      process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  });
}

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEmail() {
  console.log('\n');
  log('='.repeat(60), 'cyan');
  log('  EMAIL SERVICE TEST', 'cyan');
  log('='.repeat(60), 'cyan');
  console.log('');

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';
  const toEmail = process.argv[2];

  // Check configuration
  log('Configuration:', 'yellow');
  console.log(`  API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET'}`);
  console.log(`  From: ${fromEmail}`);
  console.log(`  To: ${toEmail || 'NOT PROVIDED'}`);
  console.log('');

  if (!apiKey || apiKey === 're_xxxxxxxxxxxxxxxxxxxxxxxxxx' || apiKey === 're_your-resend-api-key') {
    log('[ERROR] RESEND_API_KEY not configured!', 'red');
    log('', 'reset');
    log('Steps to fix:', 'yellow');
    log('  1. Go to https://resend.com/api-keys', 'reset');
    log('  2. Create a new API key', 'reset');
    log('  3. Update RESEND_API_KEY in apps/api/.env', 'reset');
    process.exit(1);
  }

  if (!toEmail) {
    log('[ERROR] Please provide recipient email!', 'red');
    log('', 'reset');
    log('Usage: node scripts/test-email.js your-email@example.com', 'yellow');
    process.exit(1);
  }

  log('Sending test email...', 'yellow');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: 'Hotel Assistant - Test Email',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Email Service Test</h1>
            <p>This is a test email from Hotel Assistant API.</p>
            <p>If you received this email, your email service is configured correctly!</p>
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 14px;">
              Sent at: ${new Date().toISOString()}<br>
              From: ${fromEmail}
            </p>
          </div>
        `,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      log(`[ERROR] Failed to send email: ${data.message || response.status}`, 'red');
      console.log('Response:', JSON.stringify(data, null, 2));
      process.exit(1);
    }

    console.log('');
    log('[SUCCESS] Email sent successfully!', 'green');
    console.log(`  Message ID: ${data.id}`);
    console.log(`  To: ${toEmail}`);
    console.log('');
    log('Check your inbox (and spam folder) for the test email.', 'yellow');

  } catch (error) {
    log(`[ERROR] ${error.message}`, 'red');
    process.exit(1);
  }

  console.log('');
  log('='.repeat(60), 'cyan');
}

testEmail();
