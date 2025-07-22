const { chromium } = require('playwright');

/**
 * 🎯 SIMPLE FOCUSED TEST - Identify specific issues
 */

class SimpleTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.serverUrl = 'http://localhost:7079';
    }

    async runSimpleTest() {
        console.log('🔍 SIMPLE FOCUSED TEST');
        console.log('======================');
        
        try {
            await this.setupBrowser();
            await this.testBasicConnection();
            await this.testSimpleRemoteControl();
            
        } catch (error) {
            console.error('❌ Simple test failed:', error.message);
        } finally {
            await this.cleanup();
        }
    }

    async setupBrowser() {
        console.log('🚀 Setting up browser...');
        
        this.browser = await chromium.launch({ 
            headless: false,
            slowMo: 1000
        });
        
        this.page = await this.browser.newPage();
        await this.page.setViewportSize({ width: 1920, height: 1080 });
        
        console.log('✅ Browser launched');
    }

    async testBasicConnection() {
        console.log('🌐 Testing basic connection...');
        
        try {
            await this.page.goto(this.serverUrl, { waitUntil: 'domcontentloaded' });
            await this.page.waitForTimeout(3000);
            
            const title = await this.page.title();
            console.log(`   📄 Page title: "${title}"`);
            
            // Check if main elements are present
            const autoFlowTitle = await this.page.$('text=AutoFlow');
            const connected = await this.page.$('text=connected');
            const chatInput = await this.page.$('textarea[placeholder*="message"]');
            const manualButton = await this.page.$('button:has-text("Manual")');
            
            console.log(`   📊 Elements found:`);
            console.log(`   - AutoFlow title: ${autoFlowTitle ? '✅' : '❌'}`);
            console.log(`   - Connected status: ${connected ? '✅' : '❌'}`);
            console.log(`   - Chat input: ${chatInput ? '✅' : '❌'}`);
            console.log(`   - Manual button: ${manualButton ? '✅' : '❌'}`);
            
            if (chatInput) {
                console.log('✅ Basic connection successful');
                return true;
            } else {
                console.log('❌ Chat input not found - connection issue');
                return false;
            }
            
        } catch (error) {
            console.log(`❌ Connection failed: ${error.message}`);
            return false;
        }
    }

    async testSimpleRemoteControl() {
        console.log('🎮 Testing simple remote control...');
        
        try {
            const chatInput = await this.page.$('textarea[placeholder*="message"]');
            
            if (!chatInput) {
                console.log('❌ No chat input available for remote control');
                return false;
            }

            // Test 1: Simple screenshot command
            console.log('   📸 Test 1: Take screenshot...');
            await chatInput.fill('Take a screenshot');
            await this.page.keyboard.press('Enter');
            await this.page.waitForTimeout(3000);
            
            const screenshots = await this.page.$$('img[src*="data:image"]');
            console.log(`   📊 Screenshots found: ${screenshots.length}`);
            
            // Test 2: Simple navigation
            console.log('   🌐 Test 2: Navigate to example.com...');
            await chatInput.fill('Navigate to https://example.com');
            await this.page.keyboard.press('Enter');
            await this.page.waitForTimeout(4000);
            
            // Check if still responsive
            const stillResponsive = await this.page.$('textarea[placeholder*="message"]');
            console.log(`   📱 Interface still responsive: ${stillResponsive ? '✅' : '❌'}`);
            
            // Test 3: Manual mode toggle
            console.log('   🎮 Test 3: Toggle manual mode...');
            const manualBtn = await this.page.$('button:has-text("Manual")');
            if (manualBtn) {
                await manualBtn.click();
                await this.page.waitForTimeout(2000);
                console.log('   ✅ Manual mode toggled');
            } else {
                console.log('   ❌ Manual button not found');
            }
            
            console.log('✅ Simple remote control tests completed');
            return true;
            
        } catch (error) {
            console.log(`❌ Remote control test failed: ${error.message}`);
            return false;
        }
    }

    async cleanup() {
        console.log('🧹 Cleaning up...');
        
        if (this.browser) {
            await this.browser.close();
        }
        
        console.log('✅ Cleanup completed');
    }
}

// Run the simple test
async function main() {
    const tester = new SimpleTest();
    await tester.runSimpleTest();
}

main().catch(console.error); 