// src/services/automationService.ts
import { chromium } from 'playwright';

interface Action {
  type: string;
  url?: string;
  query?: string;
}

export async function executeAutomation(actions: Action[]): Promise<string> {
  console.log('Starting automation with actions:', actions);
  
  // Launch with more options to reduce chance of being flagged as a bot
  const browser = await chromium.launch({ 
    headless: false,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-web-security'
    ]
  });
  
  // Set viewport size for better visibility
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', // Use a common user agent
    geolocation: { longitude: 77.2090, latitude: 28.6139 }, // Set a location to reduce suspicion
    permissions: ['geolocation']
  });
  
  // We'll keep the browser instance and not close it
  // No need for global reference which causes TypeScript errors
  
  const page = await context.newPage();
  
  try {
    for (const action of actions) {
      if (action.type === "goto" && action.url) {
        console.log(`Navigating to ${action.url}`);
        await page.goto(action.url, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle');
        console.log('Page loaded');
      } else if (action.type === "search" && action.query) {
        console.log(`Searching for '${action.query}'`);
        
        // Check if we're on Google or need different selector logic
        const currentUrl = page.url();
        console.log('Current URL before search:', currentUrl);
        
        // Handle Google search
        if (currentUrl.includes('google.com')) {
          console.log('Detected Google search page');
          
          // Take a screenshot of the initial state
          await page.screenshot({ path: '/tmp/google-initial.png' });
          console.log('Saved initial screenshot to /tmp/google-initial.png');
          
          // Check for any consent dialogs or overlays
          try {
            // Check for and handle any consent dialogues first
            const consentButton = await page.$('button:has-text("I agree"), button:has-text("Accept all")');
            if (consentButton) {
              console.log('Found consent dialog, clicking accept button');
              await consentButton.click();
              await page.waitForTimeout(1000); // Wait for dialog to close
            }
          } catch (consentError) {
            console.log('No consent dialog found or error handling it:', consentError);
          }
          
          // Pause to ensure the page is fully rendered
          await page.waitForTimeout(3000);
          
          console.log('Current URL after pause:', page.url());
          await page.screenshot({ path: '/tmp/before-search.png' });
          console.log('Saved pre-search screenshot to /tmp/before-search.png');
          
          // Try multiple selector strategies
          const selectors = [
            'input[name="q"]',
            'input[title="Search"]',
            'textarea[name="q"]',
            'input[aria-label="Search"]'
          ];
          
          let searchInputFound = false;
          
          for (const selector of selectors) {
            try {
              console.log(`Trying selector: ${selector}`);
              const isVisible = await page.waitForSelector(selector, { timeout: 5000, state: 'visible' });
              
              if (isVisible) {
                console.log(`Search input found with selector: ${selector}`);
                
                // Try to get the element's position
                const boundingBox = await isVisible.boundingBox();
                console.log(`Element position: ${JSON.stringify(boundingBox)}`);
                
                // Click, clear, and fill the input
                await isVisible.click();
                await page.waitForTimeout(500);
                await page.fill(selector, '');
                await page.waitForTimeout(500);
                await page.fill(selector, action.query);
                await page.waitForTimeout(500);
                
                console.log(`Submitting search for: "${action.query}"`);
                await page.press(selector, 'Enter');
                
                // Wait for search results to load
                try {
                  await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 });
                  console.log('Navigation completed after search');
                } catch (navError: any) {
                  console.log('Navigation timeout (may still be okay):', navError.message || String(navError));
                }
                
                // Check if we have search results
                await page.waitForTimeout(2000); // Additional wait to ensure page loads
                await page.screenshot({ path: '/tmp/after-search.png' });
                console.log('Saved post-search screenshot to /tmp/after-search.png');
                
                searchInputFound = true;
                break;
              }
            } catch (selectorError: any) {
              console.log(`Selector ${selector} failed:`, selectorError.message || String(selectorError));
            }
          }
          
          if (!searchInputFound) {
            console.error('Failed to find search input with any selector');
            // Try one last direct approach
            try {
              console.log('Trying direct keyboard input as last resort');
              await page.keyboard.type(action.query);
              await page.keyboard.press('Enter');
            } catch (keyboardError: any) {
              console.error('Keyboard input failed:', keyboardError.message || String(keyboardError));
            }
          }
        }
         else {
          // Generic search for other sites
          try {
            await page.waitForSelector('input[name="q"]', { timeout: 5000 });
            await page.fill('input[name="q"]', action.query);
            await page.press('input[name="q"]', 'Enter');
          } catch (genericSearchError) {
            console.error('Error in generic search:', genericSearchError);
          }
        }
      }
    }

    // Wait longer to observe the automation in action
    console.log('Waiting to observe results...');
    await new Promise(resolve => setTimeout(resolve, 30000)); // Extended to 30 seconds
    
    // Take a screenshot if possible
    try {
      const screenshotPath = `/tmp/automation-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Screenshot saved to ${screenshotPath}`);
    } catch (screenshotError: any) {
      console.error('Error taking screenshot:', screenshotError);
    }
    
    // Check for CAPTCHA or verification
    try {
      const captchaExists = await page.$('iframe[src*="recaptcha"], iframe[title*="recaptcha"], form#captcha, div.g-recaptcha, .captcha-container, img[alt*="CAPTCHA"]');
      if (captchaExists) {
        console.log('CAPTCHA or verification detected - browser will remain open for manual intervention');
        return "Action partially completed. CAPTCHA detected - please complete the verification in the browser window.";
      }
    } catch (captchaError: any) {
      console.error('Error checking for CAPTCHA:', captchaError);
    }
    
    // Create a message for the user in the browser
    await page.evaluate(() => {
      const div = document.createElement('div');
      div.style.position = 'fixed';
      div.style.bottom = '10px';
      div.style.right = '10px';
      div.style.padding = '10px';
      div.style.background = 'rgba(0, 0, 0, 0.7)';
      div.style.color = 'white';
      div.style.zIndex = '9999';
      div.style.borderRadius = '5px';
      div.style.fontSize = '14px';
      div.textContent = 'Browser automation complete. This browser will stay open until you close it.';
      document.body.appendChild(div);

      // Make it fade out after 10 seconds
      setTimeout(() => {
        div.style.transition = 'opacity 2s';
        div.style.opacity = '0';
      }, 10000);
    }).catch(e => console.log('Failed to add message to page:', e));
    
    console.log('Keeping browser open for user interaction - you will need to close it manually');
    
    // The key approach: return a promise that never resolves to keep the browser open
    // The browser will only close if explicitly closed by the user
    await new Promise(() => {}); // This promise never resolves
    
    // This code is never reached, but TypeScript needs a return statement
    return "Automation completed.";
  } catch (error: any) {
    console.error('Error during automation:', error);
    
    // Even in case of error, we want to keep the browser open
    try {
      if (page) {
        await page.evaluate(() => {
          const div = document.createElement('div');
          div.style.position = 'fixed';
          div.style.bottom = '10px';
          div.style.right = '10px';
          div.style.padding = '10px';
          div.style.background = 'rgba(255, 0, 0, 0.7)';
          div.style.color = 'white';
          div.style.zIndex = '9999';
          div.style.borderRadius = '5px';
          div.style.fontSize = '14px';
          div.textContent = 'Error occurred, but browser will remain open. Check server logs.';
          document.body.appendChild(div);
        }).catch(e => console.log('Failed to add error message to page:', e));
      }
    } catch (e) {
      console.error('Failed to show error message in browser:', e);
    }
    
    // Never resolve this promise to keep the browser open even after errors
    await new Promise(() => {});
    
    // This line is never reached
    return `Automation failed: ${error.message || error}`;
  }
}
