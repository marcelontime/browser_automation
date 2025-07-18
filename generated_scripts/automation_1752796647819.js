const { chromium } = require('playwright');

/**
 * Variables for this automation:
 * CPF_NUMBER: Brazilian CPF document number (example: "000.000.000-00")
 * USER_PASSWORD: User login password (example: "********")
 */

async function automation1752796647819() {
  console.log('🚀 Starting automation: automation_1752796647819');

  // Browser setup
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Navigate to https://azut1-br-digital.azurewebsites.net/login
    await page.goto('https://azut1-br-digital.azurewebsites.net/login');
    await page.waitForLoadState('domcontentloaded');

    // Step 2: Fill cpf field with "${CPF_NUMBER}"
    await page.fill('input[name*="cpf" i], input[placeholder*="cpf" i]', '${CPF_NUMBER}');

    // Step 3: Fill password field with "${USER_PASSWORD}"
    await page.fill('input[type="password"], input[name*="senha" i]', '${USER_PASSWORD}');


    console.log('✅ Automation completed successfully');

  } catch (error) {
    console.error('❌ Automation failed:', error.message);
    throw error;
  } finally {
    // Cleanup
    await browser.close();
  }
}

// Execute the automation
automation1752796647819()
  .then(() => console.log('🎉 Automation finished'))
  .catch(console.error);
