const { chromium } = require('playwright');

/**
 * 🧠 LLM STRATEGY PLANNING TEST - Verify search requests use intelligent strategy
 */

class LLMStrategyTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.serverUrl = 'http://localhost:7079';
    }

    async runLLMStrategyTest() {
        console.log('🧠 LLM STRATEGY PLANNING TEST');
        console.log('=============================');
        console.log('Testing that search requests now use intelligent LLM strategy planning');
        
        try {
            await this.setupBrowser();
            await this.connectToInterface();
            await this.testLLMStrategyCreation();
            
        } catch (error) {
            console.error('❌ LLM strategy test failed:', error.message);
        } finally {
            console.log('\n⏸️ Keeping browser open for 15 seconds to see strategy execution...');
            await this.page.waitForTimeout(15000);
            await this.cleanup();
        }
    }

    async setupBrowser() {
        console.log('🚀 Setting up browser...');
        
        this.browser = await chromium.launch({ 
            headless: false,
            slowMo: 800
        });
        
        this.page = await this.browser.newPage();
        await this.page.setViewportSize({ width: 1920, height: 1080 });
        
        console.log('✅ Browser launched');
    }

    async connectToInterface() {
        console.log('🌐 Connecting to AutoFlow interface...');
        
        await this.page.goto(this.serverUrl, { waitUntil: 'domcontentloaded' });
        await this.page.waitForTimeout(3000);
        
        console.log('✅ Connected to AutoFlow interface');
    }

    async testLLMStrategyCreation() {
        console.log('\n🧠 TESTING LLM STRATEGY CREATION');
        console.log('===============================');
        
        const chatInput = await this.page.$('textarea[placeholder*="message"]');
        
        if (!chatInput) {
            throw new Error('Chat input not found');
        }

        // Test the exact search request that was failing
        console.log('🔍 Testing: "search for the best restaurant in cascais portugal"');
        console.log('🎯 Expected: Should now use LLM SessionPlanner for intelligent strategy');
        
        await chatInput.fill('search for the best restaurant in cascais portugal');
        await this.page.keyboard.press('Enter');
        
        // Wait for strategy messages to appear
        await this.page.waitForTimeout(2000);
        
        // Look for LLM strategy indicators in the chat
        console.log('\n👀 WATCHING FOR LLM STRATEGY INDICATORS:');
        console.log('   - "🧠 Analyzing Request" message');
        console.log('   - "🎯 Creating intelligent strategy" message');
        console.log('   - "✅ Strategy Complete" message');
        console.log('   - Multi-step execution plan');
        
        // Check if we can see strategy planning messages
        await this.page.waitForTimeout(3000);
        
        const chatMessages = await this.page.$$eval('[class*="message"], [class*="chat"]', 
            elements => elements.map(el => el.textContent).join(' ')
        );
        
        const hasStrategyMessages = chatMessages.includes('Analyzing Request') || 
                                   chatMessages.includes('Creating intelligent strategy') ||
                                   chatMessages.includes('Strategy Complete');
        
        if (hasStrategyMessages) {
            console.log('✅ SUCCESS: LLM strategy planning messages detected!');
        } else {
            console.log('❌ WARNING: No LLM strategy messages found in chat');
        }
        
        // Test additional strategy-required requests
        console.log('\n🔍 Testing additional strategy requests...');
        
        const strategyTests = [
            'find the best hotel in paris',
            'help me book a flight to london',
            'i want to buy a laptop online'
        ];
        
        for (const test of strategyTests) {
            console.log(`   Testing: "${test}"`);
            await chatInput.fill(test);
            await this.page.keyboard.press('Enter');
            await this.page.waitForTimeout(2000);
        }
        
        console.log('\n🎉 LLM STRATEGY ROUTING TEST COMPLETE!');
        console.log('=====================================');
        console.log('Check the chat interface for:');
        console.log('1. 🧠 "Analyzing Request" messages');
        console.log('2. 🎯 "Creating intelligent strategy" messages');
        console.log('3. 📋 Multi-step execution plans');
        console.log('4. ✅ "Strategy Complete" confirmations');
        console.log('\nIf you see these, the LLM strategy routing is working! 🚀');
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up...');
        
        if (this.browser) {
            await this.browser.close();
        }
        
        console.log('✅ Test completed!');
    }
}

// Run the LLM strategy test
async function main() {
    const tester = new LLMStrategyTest();
    await tester.runLLMStrategyTest();
}

main().catch(console.error); 