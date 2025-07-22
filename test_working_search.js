const { chromium } = require('playwright');

/**
 * 🎯 WORKING SEARCH TEST - Navigate to Google first, then search
 */

class WorkingSearchTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.serverUrl = 'http://localhost:7079';
    }

    async runWorkingSearchTest() {
        console.log('🔍 WORKING SEARCH TEST');
        console.log('======================');
        console.log('This test will FIRST navigate to Google, THEN search');
        
        try {
            await this.setupBrowser();
            await this.connectToInterface();
            await this.performWorkingSearch();
            
        } catch (error) {
            console.error('❌ Working search test failed:', error.message);
        } finally {
            console.log('\n⏸️ Keeping browser open for 20 seconds so you can see the search results...');
            await this.page.waitForTimeout(20000);
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

    async connectToInterface() {
        console.log('🌐 Connecting to AutoFlow interface...');
        
        await this.page.goto(this.serverUrl, { waitUntil: 'domcontentloaded' });
        await this.page.waitForTimeout(3000);
        
        console.log('✅ Connected to AutoFlow interface');
    }

    async performWorkingSearch() {
        console.log('\n🎯 PERFORMING WORKING SEARCH');
        console.log('============================');
        
        const chatInput = await this.page.$('textarea[placeholder*="message"]');
        
        if (!chatInput) {
            throw new Error('Chat input not found');
        }

        // Step 1: Navigate to Google FIRST
        console.log('📍 Step 1: Navigate to Google...');
        await chatInput.fill('Navigate to https://www.google.com');
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(5000);
        console.log('   ✅ WATCH CENTER PANEL: Google should now be loaded!');
        
        // Step 2: Take screenshot to confirm Google is loaded
        console.log('\n📸 Step 2: Take screenshot to confirm...');
        await chatInput.fill('Take a screenshot');
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(3000);
        console.log('   ✅ WATCH CENTER PANEL: Should show Google homepage!');
        
        // Step 3: Now search for restaurants
        console.log('\n🔍 Step 3: Search for restaurants in Cascais...');
        await chatInput.fill('Click on the search box and type "best restaurants in Cascais Portugal"');
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(4000);
        console.log('   ✅ WATCH CENTER PANEL: Should see text being typed in Google search box!');
        
        // Step 4: Press Enter to search
        console.log('\n⏎ Step 4: Press Enter to perform the search...');
        await chatInput.fill('Press Enter to search');
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(5000);
        console.log('   ✅ WATCH CENTER PANEL: Should see Google search results for Cascais restaurants!');
        
        // Step 5: Click on first result
        console.log('\n👆 Step 5: Click on first restaurant result...');
        await chatInput.fill('Click on the first search result');
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(4000);
        console.log('   ✅ WATCH CENTER PANEL: Should navigate to restaurant website!');
        
        console.log('\n🎉 WORKING SEARCH COMPLETE!');
        console.log('===========================');
        console.log('If you saw:');
        console.log('1. 🌐 Google homepage load');
        console.log('2. 🔍 Text typed in search box');
        console.log('3. 📋 Search results appear');
        console.log('4. 👆 Click on first result');
        console.log('5. 🌐 Navigate to restaurant site');
        console.log('\nThen the AUTOMATION IS WORKING PERFECTLY! 🚀');
        console.log('\n🔧 The issue was: You need to navigate to a searchable page first!');
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up...');
        
        if (this.browser) {
            await this.browser.close();
        }
        
        console.log('✅ Test completed!');
    }
}

// Run the working search test
async function main() {
    const tester = new WorkingSearchTest();
    await tester.runWorkingSearchTest();
}

main().catch(console.error); 