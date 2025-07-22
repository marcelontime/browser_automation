const { chromium } = require('playwright');

/**
 * 🎯 VISUAL PROOF TEST - Show clear evidence of remote control working
 */

class VisualTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.serverUrl = 'http://localhost:7079';
    }

    async runVisualTest() {
        console.log('👁️ VISUAL PROOF TEST');
        console.log('===================');
        console.log('This test will show CLEAR EVIDENCE that remote control is working');
        
        try {
            await this.setupBrowser();
            await this.connectToInterface();
            await this.demonstrateRemoteControl();
            
        } catch (error) {
            console.error('❌ Visual test failed:', error.message);
        } finally {
            console.log('\n⏸️ Keeping browser open for 30 seconds so you can see the results...');
            await this.page.waitForTimeout(30000);
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
        
        console.log('✅ Browser launched - you should see it open');
    }

    async connectToInterface() {
        console.log('🌐 Connecting to AutoFlow interface...');
        
        await this.page.goto(this.serverUrl, { waitUntil: 'domcontentloaded' });
        await this.page.waitForTimeout(3000);
        
        console.log('✅ Connected to AutoFlow interface');
        console.log('📱 You should now see the AutoFlow interface in the browser');
    }

    async demonstrateRemoteControl() {
        console.log('\n🎮 DEMONSTRATING REMOTE CONTROL');
        console.log('===============================');
        
        const chatInput = await this.page.$('textarea[placeholder*="message"]');
        
        if (!chatInput) {
            throw new Error('Chat input not found');
        }

        // Demo 1: Navigate to a colorful website
        console.log('📍 DEMO 1: Remote Navigation');
        console.log('   🎯 Navigating to colorful website...');
        await chatInput.fill('Navigate to https://www.google.com');
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(6000);
        console.log('   ✅ LOOK AT THE BROWSER: You should see Google loaded in the center panel!');
        
        // Demo 2: Take screenshot to update the view
        console.log('\n📸 DEMO 2: Remote Screenshot');
        console.log('   🎯 Taking screenshot to update the interface...');
        await chatInput.fill('Take a screenshot');
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(4000);
        console.log('   ✅ LOOK AT THE BROWSER: The screenshot should have updated in the center!');
        
        // Demo 3: Remote scrolling
        console.log('\n📜 DEMO 3: Remote Scrolling');
        console.log('   🎯 Scrolling down on the remote page...');
        await chatInput.fill('Scroll down on the page');
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(3000);
        console.log('   ✅ LOOK AT THE BROWSER: The page should have scrolled down!');
        
        // Demo 4: Search on Google remotely
        console.log('\n🔍 DEMO 4: Remote Search');
        console.log('   🎯 Searching for "browser automation" on Google...');
        await chatInput.fill('Click on the search box and type "browser automation"');
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(4000);
        
        await chatInput.fill('Press Enter to search');
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(5000);
        console.log('   ✅ LOOK AT THE BROWSER: Google search results should appear!');
        
        // Demo 5: Navigate to another site
        console.log('\n🌐 DEMO 5: Remote Navigation to Different Site');
        console.log('   🎯 Navigating to example.com...');
        await chatInput.fill('Navigate to https://example.com');
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(5000);
        console.log('   ✅ LOOK AT THE BROWSER: Example.com should now be loaded!');
        
        // Demo 6: Manual mode demonstration
        console.log('\n🎮 DEMO 6: Manual Mode Toggle');
        console.log('   🎯 Toggling manual mode...');
        const manualBtn = await this.page.$('button:has-text("Manual")');
        if (manualBtn) {
            await manualBtn.click();
            await this.page.waitForTimeout(2000);
            console.log('   ✅ LOOK AT THE BROWSER: Manual mode button should be highlighted!');
            
            // Test manual mode commands
            await chatInput.fill('Scroll to the top of the page');
            await this.page.keyboard.press('Enter');
            await this.page.waitForTimeout(3000);
            console.log('   ✅ LOOK AT THE BROWSER: Page should have scrolled to top in manual mode!');
        }
        
        console.log('\n🎉 REMOTE CONTROL DEMONSTRATION COMPLETE!');
        console.log('=========================================');
        console.log('If you can see the webpage changes in the center panel,');
        console.log('then REMOTE CONTROL IS WORKING PERFECTLY! 🚀');
        console.log('\nWhat you should have seen:');
        console.log('1. 🌐 Google website loaded remotely');
        console.log('2. 📸 Screenshots updating the interface');
        console.log('3. 📜 Remote scrolling working');
        console.log('4. 🔍 Remote search on Google');
        console.log('5. 🌐 Navigation to example.com');
        console.log('6. 🎮 Manual mode functioning');
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up...');
        
        if (this.browser) {
            await this.browser.close();
        }
        
        console.log('✅ Test completed!');
    }
}

// Run the visual test
async function main() {
    const tester = new VisualTest();
    await tester.runVisualTest();
}

main().catch(console.error); 