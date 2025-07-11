#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function setup() {
    console.log('🤖 Browser Automation System Setup');
    console.log('=====================================\n');
    
    const envPath = path.join(__dirname, '.env');
    
    if (fs.existsSync(envPath)) {
        const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
        if (overwrite.toLowerCase() !== 'y') {
            console.log('Setup cancelled.');
            rl.close();
            return;
        }
    }
    
    console.log('📝 Please provide the following configuration:\n');
    
    // Claude API Key
    const apiKey = await question('🔑 Enter your Claude API key (from https://console.anthropic.com/): ');
    if (!apiKey.trim()) {
        console.log('❌ Claude API key is required for enhanced natural language processing.');
        rl.close();
        return;
    }
    
    // Port
    const port = await question('🌐 Enter server port (default 7079): ') || '7079';
    
    // Debug mode
    const debug = await question('🔍 Enable debug mode? (y/N): ');
    const debugMode = debug.toLowerCase() === 'y';
    
    // Create .env file
    const envContent = `# Claude API Configuration
ANTHROPIC_API_KEY=${apiKey}

# Server Configuration
PORT=${port}
SCREENSHOT_QUALITY=60
SCREENSHOT_INTERVAL=2000

# Browser Configuration
BROWSER_HEADLESS=false
BROWSER_DEVTOOLS=false

# Debug Configuration
DEBUG_MODE=${debugMode}
LOG_LEVEL=${debugMode ? 'debug' : 'info'}
`;

    fs.writeFileSync(envPath, envContent);
    
    console.log('\n✅ Configuration saved to .env file');
    console.log('\n🚀 Setup complete! You can now run:');
    console.log('   npm start');
    console.log(`   Open http://localhost:${port} in your browser`);
    console.log('\n📖 For more information, see README.md');
    
    rl.close();
}

setup().catch(console.error); 