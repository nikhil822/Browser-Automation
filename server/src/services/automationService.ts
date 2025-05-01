// src/services/automationService.ts
import { chromium, Page } from 'playwright';

interface Action {
  type: string;
  url?: string;
  query?: string;
  selector?: string;
  text?: string;
  value?: string;
  username?: string;
  password?: string;
  elementDescriptor?: string;
  waitTime?: number;
  keypress?: string;
  position?: number; // For navigating to nth search result
  field?: string; // For generic fill actions (e.g., username, password)
}

// Create a WeakMap to store filled fields for each page (fixes TypeScript errors)
const filledFieldsMap = new WeakMap<Page, Map<string, boolean>>();

// Helper function to get a unique identifier for an element
async function getElementIdentifier(element: any): Promise<string> {
  let id = '';
  try {
    // Try to get attributes that could identify this element
    const elementId = await element.getAttribute('id') || '';
    const name = await element.getAttribute('name') || '';
    const type = await element.getAttribute('type') || '';
    const placeholder = await element.getAttribute('placeholder') || '';
    
    // Create a composite ID from available attributes
    id = `${elementId}_${name}_${type}_${placeholder}`;
    
    // If no attributes are available, use the element's position in the DOM
    if (id === '___') {
      const boundingBox = await element.boundingBox();
      if (boundingBox) {
        id = `pos_${Math.round(boundingBox.x)}_${Math.round(boundingBox.y)}`;
      } else {
        // Last resort - random ID
        id = `elem_${Math.random().toString(36).substring(2, 10)}`;
      }
    }
  } catch (e) {
    id = `elem_${Math.random().toString(36).substring(2, 10)}`;
  }
  return id;
}

export async function executeAutomation(actions: Action[]): Promise<string> {
  // Build a more informative result message
  let resultMessage = '';
  console.log('Starting automation with actions:', actions);
  
  // Launch with more options to reduce chance of being flagged as a bot
  const browser = await chromium.launch({
    headless: false, // Show the browser for visibility
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-web-security'
    ]
  });
  
  // Create a new page with custom viewport
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36'
  });
  
  let page = await context.newPage();
  
  try {
    // Process each action in sequence
    for (const action of actions) {
      // Add a delay after filling fields to allow UI updates (e.g., enabling login button)
      if (action.type === 'fill' || action.type === 'fillUsername' || action.type === 'fillPassword') {
        // Existing fill logic will be here (unchanged)
        // Add a short wait after filling
        await page.waitForTimeout(500);
      }
      console.log(`Processing action: ${action.type}`);
      
      // CLICK SEARCH RESULT/NAVIGATE RESULT
      if ((action.type === "navigateResult" || action.type === "clickSearchResult") && action.position) {
        const position = action.position || 1;
        console.log(`Navigating to search result #${position}`);
        try {
          // Wait for results to load
          await page.waitForTimeout(2000);

          // Define robust selectors for Google (and fallback for others)
          const url = page.url().toLowerCase();
          let resultSelectors: string[] = [];
          if (url.includes('google.com')) {
            resultSelectors = [
              '.g .yuRUbf > a', // Modern Google organic results
              'a.tKCJxd', // Google result links by class
              'div[data-sokoban-container] > div > a',
              '.g a[ping]',
              'h3.LC20lb', // Google headings (fallback)
              '#search .g a:not([href*="google"]):not([href^="/search"]):not([href^="#"])',
              'a[href^="http"]:not([href*="google"]):not([href^="/search"]):not([href^="#"])',
            ];
          } else {
            // Generic selectors
            resultSelectors = [
              'a[href^="http"]',
              '.result a',
              '.search-result a',
              '.searchResult a',
              'article a',
              'h2 a, h3 a',
              'a'
            ];
          }

          // Try each selector and collect visible results
          let visibleResults: any[] = [];
          for (const selector of resultSelectors) {
            try {
              console.log(`Trying selector: ${selector}`);
              const results = await page.$$(selector);
              for (const result of results) {
                if (await result.isVisible()) {
                  // Filter out Google ad/redirect/internal links
                  const href = await result.getAttribute('href');
                  if (href && href.startsWith('http') && !href.includes('google.com') && !href.startsWith('/search')) {
                    visibleResults.push(result);
                  }
                  if (visibleResults.length >= position) break;
                }
              }
              if (visibleResults.length >= position) break;
            } catch (e: any) {
              console.log(`Selector ${selector} failed: ${e.message}`);
            }
          }

          if (visibleResults.length >= position) {
            const targetResult = visibleResults[position - 1];
            const linkText = await targetResult.innerText().catch(() => 'Unknown');
            const targetUrl = await targetResult.getAttribute('href');
            console.log(`Clicking search result #${position}: ${linkText} (${targetUrl})`);
            await targetResult.click();
            await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
            const newUrl = page.url();
            console.log(`Navigated to: ${newUrl}`);
            await page.screenshot({ path: `/tmp/after-click-result-${Date.now()}.png` });
          } else {
            await page.screenshot({ path: `/tmp/search-result-not-found-${Date.now()}.png` });
            throw new Error(`Could not find search result #${position}. Only found ${visibleResults.length} results.`);
          }
        } catch (err: any) {
          console.error(`Error navigating to search result #${position}: ${err.message}`);
          throw err;
        }
      }

      // CLICK - click a button, link, or tab by descriptor
      if (action.type === "click" && action.elementDescriptor) {
        try {
          console.log(`Clicking element: ${action.elementDescriptor}`);
          
          // Special handling for CodeChef login page
          if (action.elementDescriptor.toLowerCase().includes('login') && page.url().includes('codechef.com')) {
            console.log('Detected CodeChef login page, using specialized login approach');
            
            // Wait a bit longer for form interactions to stabilize
            await page.waitForTimeout(2000);
            
            console.log('Using simplified approach for CodeChef LOGIN button');
            await page.waitForTimeout(2000); // Allow page to stabilize
            
            // Take a screenshot for debugging
            await page.screenshot({ path: `/tmp/codechef-login-attempt-${Date.now()}.png` });
            
            let clicked = false;
            
            // APPROACH 1: Direct selector for the BLUE login button at bottom of form
            try {
              // Very specific CSS selectors targeting the blue button at form bottom
              const buttonSelectors = [
                'form .btn-blue', // Form with blue button
                'form .btn-primary', // Form with primary button
                'form button[type="submit"]', // Form submit button
                '.login-form button[type="submit"]', // Login form submit button
                '.login-form .btn', // Login form button
              ];
              
              for (const selector of buttonSelectors) {
                const buttons = await page.$$(selector);
                console.log(`Found ${buttons.length} buttons matching ${selector}`);
                
                if (buttons.length > 0) {
                  // Try clicking each button, starting from the first one
                  for (const button of buttons) {
                    if (await button.isVisible()) {
                      // Scroll button into view and wait
                      await button.scrollIntoViewIfNeeded();
                      await page.waitForTimeout(1000);
                      
                      // Click with force option
                      await button.click({ force: true });
                      clicked = true;
                      console.log(`Successfully clicked button with selector: ${selector}`);
                      await page.waitForTimeout(2000);
                      break;
                    }
                  }
                  
                  if (clicked) break;
                }
              }
            } catch (err) {
              console.log(`Error with direct selector approach: ${err.message}`);
            }
            
            // APPROACH 2: Try direct DOM interaction through JavaScript
            if (!clicked) {
              try {
                console.log('Trying direct DOM interaction for CodeChef login button');
                
                // Use JavaScript to click the submit button inside the form
                const jsClicked = await page.evaluate(() => {
                  // First identify all forms on the page
                  const forms = Array.from(document.querySelectorAll('form'));
                  console.log(`Found ${forms.length} forms on the page`);
                  
                  // Look through each form for a login/submit button
                  for (const form of forms) {
                    // Check if this form has a username and password field
                    const hasUserField = form.querySelector('input[type="text"], input[type="email"]') !== null;
                    const hasPasswordField = form.querySelector('input[type="password"]') !== null;
                    
                    if (hasUserField && hasPasswordField) {
                      console.log('Found form with username and password fields');
                      
                      // Look for any buttons in this form
                      const buttons = form.querySelectorAll('button, input[type="submit"], .btn');
                      console.log(`Found ${buttons.length} buttons in this form`);
                      
                      // Click the first visible button
                      for (const button of buttons) {
                        try {
                          // Force the button to be visible and active
                          const htmlButton = button as HTMLElement;
                          htmlButton.style.pointerEvents = 'auto';
                          htmlButton.style.opacity = '1';
                          htmlButton.style.visibility = 'visible';
                          
                          // Handle disabled property for different element types
                          if (button instanceof HTMLButtonElement || button instanceof HTMLInputElement) {
                            button.disabled = false;
                          }
                          
                          // Scroll to it and click
                          htmlButton.scrollIntoView({behavior: 'smooth', block: 'center'});
                          console.log('Clicking button:', htmlButton.textContent || htmlButton.tagName);
                          htmlButton.click();
                          return true;
                        } catch (err) {
                          console.log('Error clicking button:', err);
                        }
                      }
                    }
                  }
                  return false;
                });
                
                if (jsClicked) {
                  clicked = true;
                  console.log('Successfully clicked login button using JavaScript');
                  await page.waitForTimeout(2000);
                }
              } catch (err) {
                console.log(`Error with JavaScript interaction: ${err.message}`);
              }
            }
            
            // APPROACH 3: Last resort - direct keyboard navigation
            if (!clicked) {
              try {
                console.log('Using keyboard navigation to submit the form');
                
                // Reset focus to top of page then tab to form elements
                await page.evaluate(() => { window.scrollTo(0, 0); });
                await page.waitForTimeout(500);
                
                // Focus on username field
                const usernameField = await page.$('input[type="text"], input[type="email"]');
                if (usernameField) {
                  await usernameField.focus();
                  await page.waitForTimeout(500);
                  
                  // Press Tab to navigate to password field
                  await page.keyboard.press('Tab');
                  await page.waitForTimeout(500);
                  
                  // Press Tab again to navigate to login button
                  await page.keyboard.press('Tab'); 
                  await page.waitForTimeout(500);
                  
                  // Press Enter to submit the form
                  await page.keyboard.press('Enter');
                  clicked = true;
                  console.log('Submitted form using keyboard navigation');
                  await page.waitForTimeout(2000);
                }
                
                // If still not clicked, try one more direct method
                if (!clicked) {
                  console.log('Attempting direct submit of the form');
                  
                  // Try to submit the form directly
                  const formSubmitted = await page.evaluate(() => {
                    // Find forms with login inputs
                    const forms = Array.from(document.querySelectorAll('form'));
                    const loginForm = forms.find(form => 
                      form.querySelector('input[type="password"]') !== null);
                    
                    if (loginForm) {
                      console.log('Found login form, submitting directly');
                      loginForm.submit();
                      return true;
                    }
                    return false;
                  });
                  
                  if (formSubmitted) {
                    clicked = true;
                    console.log('Directly submitted the login form');
                    await page.waitForTimeout(2000);
                  }
                }
              } catch (err) {
                console.log(`Error with keyboard navigation: ${err.message}`);
              }
            }
          } else {
            // Standard element click for non-CodeChef pages
            const element = await findElement(page, action.elementDescriptor);
            if (element) {
              await element.click();
              await page.waitForTimeout(1200); // Allow dialog/page to update
              console.log(`Clicked element: ${action.elementDescriptor}`);
            } else {
              throw new Error(`Could not find element to click: ${action.elementDescriptor}`);
            }
          }
          
          await page.screenshot({ path: `/tmp/after-click-${action.elementDescriptor}-${Date.now()}.png` });
        } catch (err: any) {
          console.error(`Error clicking element '${action.elementDescriptor}': ${err.message}`);
          throw err;
        }
      }

      // FILL - fill an input field (username, password, etc.)
      if (action.type === "fill" && action.field && action.value !== undefined) {
        try {
          console.log(`Filling input: ${action.field} with value: ${action.value}`);
          const input = await findInputField(page, action.field);
          if (input) {
            // Clear the field first
            await input.click({clickCount: 3}); // Triple-click to select all text
            await input.press('Backspace'); // Delete selected text
            
            // Type with human-like delay
            await input.type(action.value, {delay: 100});
            
            // Wait longer after filling form fields on login pages
            if (page.url().includes('login') || page.url().includes('signin')) {
              await page.waitForTimeout(1000); // Wait longer for login forms
            } else {
              await page.waitForTimeout(400);
            }
            
            await page.screenshot({ path: `/tmp/after-fill-${action.field}-${Date.now()}.png` });
            console.log(`Filled input: ${action.field}`);
            
            // Special handling for CodeChef login form - press Tab to move to next field
            if (page.url().includes('codechef.com')) {
              await input.press('Tab');
              await page.waitForTimeout(500);
            }
          } else {
            throw new Error(`Could not find input field: ${action.field}`);
          }
        } catch (err: any) {
          console.error(`Error filling input '${action.field}': ${err.message}`);
          throw err;
        }
      }

      // GOTO - navigate to a URL
      if (action.type === "goto" && action.url) {
        console.log(`Navigating to: ${action.url}`);
        
        try {
          // Ensure URL has protocol
          let targetUrl = action.url;
          if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            targetUrl = 'https://' + targetUrl;
          }
          
          // Navigate to the URL
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          console.log(`Navigated to: ${targetUrl}`);
          
          // Wait for page to be fully loaded
          try {
            await page.waitForLoadState('networkidle', { timeout: 10000 });
          } catch (e) {
            console.log('Page did not reach network idle state, but continuing');
          }
        } catch (navError: any) {
          console.error(`Navigation error: ${navError.message || navError}`);
        }
      }
      
      // SEARCH - perform a search on a website
      else if (action.type === "search" && action.query) {
        console.log(`Searching for: ${action.query}`);
        
        try {
          // Get the current URL to determine which search engine we're on
          const currentUrl = page.url().toLowerCase();
          
          // Handle different search engines
          if (currentUrl.includes('google.com')) {
            // --- Robust Google search input handling ---
            // 1. Handle consent dialogs if present
            const consentSelectors = [
              'button:has-text("Accept all")',
              'button:has-text("I agree")',
              'button:has-text("Accept")',
              'button:has-text("Agree")',
              'button:has-text("Consent")',
              'button:has-text("Yes")',
              'button:has-text("Continue")',
              'div[role="dialog"] button',
              '[aria-label*="consent"] button',
              '#L2AGLb',
              '.tHlp8d'
            ];
            for (const selector of consentSelectors) {
              try {
                const btn = await page.$(selector);
                if (btn && await btn.isVisible()) {
                  console.log(`Found consent button: ${selector}`);
                  await btn.click();
                  await page.waitForTimeout(1200);
                  await page.screenshot({ path: `/tmp/google-consent-clicked-${Date.now()}.png` });
                  break;
                }
              } catch (e) { /* ignore */ }
            }
            // 2. Try multiple selectors for the search input
            const googleSearchSelectors = [
              'input[name="q"]',
              'textarea[name="q"]',
              'input[title="Search"]',
              'textarea[title="Search"]',
              'input.gLFyf',
              'textarea.gLFyf',
              '[aria-label="Search"]'
            ];
            let found = false;
            for (const selector of googleSearchSelectors) {
              try {
                console.log(`Trying Google search selector: ${selector}`);
                const input = await page.waitForSelector(selector, { timeout: 7000, state: 'visible' });
                if (input && action.query) {
                  await input.click();
                  await input.fill(action.query);
                  await page.waitForTimeout(300);
                  await input.press('Enter');
                  console.log(`Performed Google search with selector: ${selector}`);
                  found = true;
                  break;
                }
              } catch (e) {
                console.log(`Selector failed: ${selector}`);
              }
            }
            if (!found) {
              await page.screenshot({ path: `/tmp/google-search-not-found-${Date.now()}.png` });
              const pageHtml = await page.content();
              console.error('Could not find Google search input. HTML snapshot saved.');
              throw new Error('Could not find Google search input.');
            }
          } 
          else if (currentUrl.includes('bing.com')) {
            // Bing search
            await page.fill('input[name="q"]', action.query);
            await page.press('input[name="q"]', 'Enter');
            console.log('Performed Bing search');
          } 
          else if (currentUrl.includes('yahoo.com')) {
            // Yahoo search
            await page.fill('input[name="p"]', action.query);
            await page.press('input[name="p"]', 'Enter');
            console.log('Performed Yahoo search');
          } 
          else if (currentUrl.includes('duckduckgo.com')) {
            // DuckDuckGo search
            await page.fill('input[name="q"]', action.query);
            await page.press('input[name="q"]', 'Enter');
            console.log('Performed DuckDuckGo search');
          } 
          else {
            // Generic approach for unknown search engines
            console.log('Using generic search approach');
            
            try {
              // Try common search input selectors
              const searchSelectors = [
                'input[type="search"]',
                'input[name="q"]',
                'input[name="query"]',
                'input[name="search"]',
                'input[placeholder*="search" i]',
                'input[placeholder*="find" i]',
                'input[aria-label*="search" i]'
              ];
              
              let searchInput = null;
              for (const selector of searchSelectors) {
                const input = await page.$(selector);
                if (input && await input.isVisible()) {
                  searchInput = input;
                  break;
                }
              }
              
              if (searchInput) {
                await searchInput.fill(action.query);
                await searchInput.press('Enter');
                console.log('Performed search using generic selector');
              } else {
                console.error('Could not find search input');
              }
            } catch (genericSearchError) {
              console.error('Error in generic search:', genericSearchError);
            }
          }
        } catch (searchError: any) {
          console.error(`Search error: ${searchError.message || searchError}`);
        }
      }
      
      // CLICK - click on a button, link, or element
      else if (action.type === "click" && action.elementDescriptor) {
        console.log(`Attempting to click on element: ${action.elementDescriptor}`);
        
        try {
          // Wait briefly to ensure the page is settled
          await page.waitForTimeout(1000);
          
          // Generic approach for all sites
          const element = await findElement(page, action.elementDescriptor);
          
          if (element) {
            // Ensure element is visible and enabled (for buttons)
            const isVisible = await element.isVisible();
            const isDisabled = await element.getAttribute('disabled');
            if (!isVisible) {
              console.error(`Element '${action.elementDescriptor}' is not visible.`);
              throw new Error(`Element '${action.elementDescriptor}' is not visible.`);
            }
            if (isDisabled !== null) {
              console.warn(`Element '${action.elementDescriptor}' is disabled, but will attempt to click.`);
            }
            // Scroll into view
            await element.scrollIntoViewIfNeeded();
            await page.waitForTimeout(300);
            // Try clicking and wait for navigation or state change
            try {
              await Promise.all([
                element.click(),
                page.waitForLoadState('domcontentloaded', { timeout: 7000 }).catch(() => {})
              ]);
              console.log(`Clicked on element: ${action.elementDescriptor}`);
              // Optionally, wait for networkidle if needed
              try {
                await page.waitForLoadState('networkidle', { timeout: 5000 });
              } catch (e) {
                console.log('No networkidle after click (might be fine)');
              }
            } catch (clickErr) {
              console.error(`Error during click on '${action.elementDescriptor}':`, clickErr);
              throw clickErr;
            }
          } else {
            console.error(`Element not found: ${action.elementDescriptor}`);
            throw new Error(`Element not found: ${action.elementDescriptor}`);
          }
        } catch (clickError: any) {
          console.error(`Error clicking element: ${clickError.message || clickError}`);
        }
      }
      
      // FILL - fill in a form field
      else if (action.type === "fill" && action.elementDescriptor && action.value) {
        console.log(`Filling input ${action.elementDescriptor} with value: ${action.value}`);
        
        // Track filled fields to prevent duplicate field usage
        let filledFields = filledFieldsMap.get(page);
        if (!filledFields) {
          filledFields = new Map<string, boolean>();
          filledFieldsMap.set(page, filledFields);
        }
        
        try {
          // Take a screenshot before filling for debugging
          try {
            const beforeFillPath = `/tmp/before-fill-${Date.now()}.png`;
            await page.screenshot({ path: beforeFillPath });
            console.log(`Saved pre-fill screenshot to ${beforeFillPath}`);
          } catch (e) {
            // Ignore screenshot errors
          }
          
          // Detect if this is a password field by descriptor
          const isPassword = action.elementDescriptor.toLowerCase().includes('password') || 
                            action.elementDescriptor.toLowerCase().includes('pass');
          
          // Use special handling for password fields to ensure we don't fill the same field twice
          if (isPassword) {
            console.log('Password field detected, using specialized detection');
            
            // Try to find a password-type input that we haven't filled yet
            const passwordInputs = await page.$$('input[type="password"]');
            console.log(`Found ${passwordInputs.length} password fields on the page`);
            
            let passwordField = null;
            
            // Find a password field we haven't used yet
            for (const input of passwordInputs) {
              if (await input.isVisible()) {
                const inputId = await getElementIdentifier(input);
                if (!filledFields.has(inputId)) {
                  passwordField = input;
                  filledFields.set(inputId, true);
                  console.log(`Selected unused password field with ID: ${inputId}`);
                  break;
                }
              }
            }
            
            // If we found a password field, use it
            if (passwordField) {
              console.log('Using password field found by type');
              await passwordField.scrollIntoViewIfNeeded();
              await passwordField.click();
              await page.waitForTimeout(300);
              await passwordField.fill('');
              await page.waitForTimeout(300);
              await passwordField.fill(action.value);
              console.log(`Filled password field with value: ${action.value}`);
              continue; // Skip the regular field finding logic
            }
          }
          
          // Regular field finding for non-password fields or if no password field was found
          const inputField = await findInputField(page, action.elementDescriptor);
          
          if (inputField) {
            // Get a unique identifier for this field to avoid filling it again
            const inputId = await getElementIdentifier(inputField);
            
            // Check if we've already filled this field
            if (filledFields.has(inputId)) {
              console.log(`Field ${inputId} has already been filled, finding another field`);
              
              // Try to find another field that matches but hasn't been filled yet
              const allInputs = await page.$$('input, textarea, select');
              let alternateField = null;
              
              for (const input of allInputs) {
                if (await input.isVisible()) {
                  const altId = await getElementIdentifier(input);
                  if (altId !== inputId && !filledFields.has(altId)) {
                    alternateField = input;
                    console.log(`Found alternate field with ID: ${altId}`);
                    break;
                  }
                }
              }
              
              if (alternateField) {
                // Use the alternate field
                await alternateField.scrollIntoViewIfNeeded();
                await alternateField.click();
                await page.waitForTimeout(300);
                await alternateField.fill('');
                await page.waitForTimeout(300);
                await alternateField.fill(action.value);
                
                // Mark this field as filled
                const altId = await getElementIdentifier(alternateField);
                filledFields.set(altId, true);
                
                console.log(`Filled alternate field for ${action.elementDescriptor}`);
                continue;
              }
            }
            
            // Make sure it's visible
            await inputField.scrollIntoViewIfNeeded();
            
            // Clear existing text and fill
            await inputField.click();
            await page.waitForTimeout(300);
            await inputField.fill('');
            await page.waitForTimeout(300);
            await inputField.fill(action.value);
            
            // Mark this field as filled
            filledFields.set(inputId, true);
            
            console.log(`Filled input ${action.elementDescriptor} with ID ${inputId}`);
          } else {
            console.error(`Input field not found: ${action.elementDescriptor}`);
          }
        } catch (fillError: any) {
          console.error(`Error filling input: ${fillError.message || fillError}`);
        }
      }
    }
    
    // Check for CAPTCHA detection
    try {
      const captchaDetected = await detectCaptcha(page);
      if (captchaDetected) {
        console.log('CAPTCHA detected - waiting for user to solve it');
        resultMessage = "CAPTCHA detected - please complete the verification in the browser window";
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
      
      return true; // Return value to satisfy TypeScript
    }).catch(e => console.log('Failed to add message to page:', e));
    
    console.log('Keeping browser open for user interaction - you will need to close it manually');

    // Build a summary of executed actions for the user
    if (actions.length === 1) {
      const action = actions[0];
      if (action.type === 'goto') {
        resultMessage = `Navigated to ${action.url}.`;
      } else if (action.type === 'click') {
        resultMessage = `Clicked element: ${action.elementDescriptor || 'unknown'}.`;
      } else if (action.type === 'search') {
        resultMessage = `Searched for: ${action.query}.`;
      } else {
        resultMessage = `Executed action: ${action.type}.`;
      }
    } else if (actions.length > 1) {
      const summaries: string[] = [];
      for (const action of actions) {
        if (action.type === 'goto') {
          summaries.push(`navigated to ${action.url}`);
        } else if (action.type === 'click') {
          summaries.push(`clicked element '${action.elementDescriptor || 'unknown'}'`);
        } else if (action.type === 'search') {
          summaries.push(`searched for '${action.query}'`);
        } else {
          summaries.push(`executed '${action.type}'`);
        }
      }
      // Capitalize first letter and join
      resultMessage = summaries.map((s, i) => (i === 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s)).join(', ') + '.';
    } else {
      resultMessage = 'No actions executed.';
    }

    // Instead of blocking the API response, return immediately so the client gets a reply
    // The browser will remain open for manual interaction
    return resultMessage;
  } catch (error: any) {
    console.error('Error during automation:', error);
    resultMessage = `Automation failed: ${error.message || error}`;
    
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
          
          return true; // Return value to satisfy TypeScript
        }).catch(e => console.log('Failed to add error message to page:', e));
      }
    } catch (e) {
      console.error('Failed to show error message in browser:', e);
    }
    
    // Instead of blocking, return the error message so the client gets a reply
    return resultMessage;
  }
}

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
function getSuffix(num: number): string {
  if (num === 1) return 'st';
  if (num === 2) return 'nd';
  if (num === 3) return 'rd';
  return 'th';
}

// Function to detect CAPTCHA on a page
async function detectCaptcha(page: Page): Promise<boolean> {
  // Look for common CAPTCHA indicators
  const captchaIndicators = [
    // Text indicators
    'page:has-text("captcha")',
    'page:has-text("CAPTCHA")',
    'page:has-text("robot")',
    'page:has-text("human verification")',
    'page:has-text("security check")',
    'page:has-text("prove you\'re human")',
    
    // Visual indicators
    'iframe[src*="captcha"]',
    'iframe[src*="recaptcha"]',
    'iframe[src*="hcaptcha"]',
    'div[class*="captcha"]',
    'div[id*="captcha"]',
    'img[alt*="captcha" i]',
    
    // Specific services
    'div.g-recaptcha',
    'div.h-captcha',
    'div[data-sitekey]',
    'div[data-callback]'
  ];
  
  for (const indicator of captchaIndicators) {
    try {
      const found = await page.$(indicator);
      if (found) {
        console.log(`CAPTCHA detected via selector: ${indicator}`);
        return true;
      }
    } catch (e) {
      // Ignore errors in individual selectors
    }
  }
  
  return false;
}

// Function to find an input field based on a descriptor
async function findInputField(page: Page, descriptor: string): Promise<any> {
  console.log(`Finding input field for: ${descriptor}`);
  
  // Phase 1: Try direct matches with common input selectors
  const directSelectors = [
    // By placeholder
    `input[placeholder*="${descriptor}" i]`,
    `textarea[placeholder*="${descriptor}" i]`,
    
    // By label text
    `label:has-text("${descriptor}")`,
    
    // By name/id attributes
    `input[name*="${descriptor}" i]`,
    `input[id*="${descriptor}" i]`,
    `textarea[name*="${descriptor}" i]`,
    `textarea[id*="${descriptor}" i]`,
    
    // By aria-label
    `input[aria-label*="${descriptor}" i]`,
    `textarea[aria-label*="${descriptor}" i]`,
    
    // By type-specific attributes
    `input[type="${descriptor}"]`,
    
    // By data attributes
    `input[data-test*="${descriptor}" i]`,
    `input[data-cy*="${descriptor}" i]`,
    `input[data-testid*="${descriptor}" i]`
  ];
  
  for (const selector of directSelectors) {
    try {
      const element = await page.$(selector);
      if (element && await element.isVisible()) {
        console.log(`Found input via direct selector: ${selector}`);
        return element;
      }
    } catch (e) {
      // Ignore errors in individual selectors
    }
  }
  
  // Phase 2: Find by label association
  try {
    // Find labels that match the descriptor
    const labels = await page.$$(`label:has-text("${descriptor}")`);
    
    for (const label of labels) {
      if (await label.isVisible()) {
        // Try to get the 'for' attribute
        const forId = await label.getAttribute('for');
        
        if (forId) {
          // Find the input with matching ID
          const input = await page.$(`#${forId}`);
          if (input && await input.isVisible()) {
            console.log(`Found input via label for attribute: #${forId}`);
            return input;
          }
        }
        
        // If no 'for' attribute or no matching input, check for nested input
        const nestedInput = await label.$('input, textarea, select');
        if (nestedInput && await nestedInput.isVisible()) {
          console.log('Found input nested within label');
          return nestedInput;
        }
        
        // Check for input immediately following the label
        try {
          const labelBounds = await label.boundingBox();
          if (labelBounds) {
            // Find all inputs on the page
            const allInputs = await page.$$('input, textarea, select');
            
            // Sort by proximity to the label
            let closestInput = null;
            let closestDistance = Number.MAX_VALUE;
            
            for (const input of allInputs) {
              if (await input.isVisible()) {
                const inputBounds = await input.boundingBox();
                
                if (inputBounds) {
                  // Calculate distance (simple horizontal distance for now)
                  const distance = Math.abs(inputBounds.x - labelBounds.x) + 
                                  Math.abs(inputBounds.y - labelBounds.y);
                  
                  if (distance < closestDistance) {
                    closestDistance = distance;
                    closestInput = input;
                  }
                }
              }
            }
            
            if (closestInput && closestDistance < 200) { // Threshold for proximity
              console.log(`Found input via proximity to label, distance: ${closestDistance}px`);
              return closestInput;
            }
          }
        } catch (e) {
          console.error('Error finding input by proximity:', e);
        }
      }
    }
  } catch (e) {
    console.error('Error in label association phase:', e);
  }
  
  // Phase 3: Find by nearby text
  try {
    // Find text nodes that match the descriptor
    const textElements = await page.$$(`text=${descriptor}`);
    
    for (const textElement of textElements) {
      if (await textElement.isVisible()) {
        try {
          const textBounds = await textElement.boundingBox();
          if (textBounds) {
            // Find all inputs on the page
            const allInputs = await page.$$('input, textarea, select');
            
            // Sort by proximity to the text
            let closestInput = null;
            let closestDistance = Number.MAX_VALUE;
            
            for (const input of allInputs) {
              if (await input.isVisible()) {
                const inputBounds = await input.boundingBox();
                
                if (inputBounds) {
                  // Calculate distance (simple horizontal distance for now)
                  const distance = Math.abs(inputBounds.x - textBounds.x) + 
                                  Math.abs(inputBounds.y - textBounds.y);
                  
                  if (distance < closestDistance) {
                    closestDistance = distance;
                    closestInput = input;
                  }
                }
              }
            }
            
            if (closestInput && closestDistance < 150) { // Tighter threshold for text proximity
              console.log(`Found input via proximity to text, distance: ${closestDistance}px`);
              return closestInput;
            }
          }
        } catch (e) {
          console.error('Error finding input by text proximity:', e);
        }
      }
    }
  } catch (e) {
    console.error('Error in text proximity phase:', e);
  }
  
  // Phase 4: Generic input detection by type
  const typeMap: {[key: string]: string[]} = {
    'email': ['input[type="email"]', 'input[name*="email" i]', 'input[id*="email" i]', 'input[placeholder*="email" i]'],
    'password': ['input[type="password"]'],
    'username': ['input[name*="username" i]', 'input[id*="username" i]', 'input[placeholder*="username" i]'],
    'name': ['input[name*="name" i]', 'input[id*="name" i]', 'input[placeholder*="name" i]'],
    'first': ['input[name*="first" i]', 'input[id*="first" i]', 'input[placeholder*="first" i]'],
    'last': ['input[name*="last" i]', 'input[id*="last" i]', 'input[placeholder*="last" i]'],
    'phone': ['input[type="tel"]', 'input[name*="phone" i]', 'input[id*="phone" i]', 'input[placeholder*="phone" i]'],
    'search': ['input[type="search"]', 'input[name*="search" i]', 'input[id*="search" i]', 'input[placeholder*="search" i]']
  };
  
  const lowerDescriptor = descriptor.toLowerCase();
  
  // Check if descriptor matches any known types
  for (const [type, selectors] of Object.entries(typeMap)) {
    if (lowerDescriptor.includes(type)) {
      for (const selector of selectors) {
        try {
          const element = await page.$(selector);
          if (element && await element.isVisible()) {
            console.log(`Found input via type mapping for ${type}: ${selector}`);
            return element;
          }
        } catch (e) {
          // Ignore errors in individual selectors
        }
      }
    }
  }
  
  // Phase 5: Fallback to any visible input
  try {
    const allInputs = await page.$$('input:visible, textarea:visible, select:visible');
    if (allInputs.length > 0) {
      console.log('Falling back to first visible input element');
      return allInputs[0];
    }
  } catch (e) {
    console.error('Error in fallback phase:', e);
  }
  
  console.log('No input field found for descriptor:', descriptor);
  return null;
}

// Function to find any element (button, link, etc.) based on a descriptor
async function findElement(page: Page, descriptor: string): Promise<any> {
  console.log(`Finding element with descriptor: ${descriptor}`);
  // Special handling for login buttons
  if (descriptor.toLowerCase().includes('login') || descriptor.toLowerCase().includes('log in')) {
    // Try common login button selectors first
    const loginButtonSelectors = [
      'button:has-text("login")',
      'button:has-text("log in")',
      'input[type="submit"][value="login"]',
      'input[type="submit"][value="log in"]',
      '.btn-primary:has-text("login")',
      '.login-form button[type="submit"]',
      'form button[type="submit"]',
      'button[type="submit"]',
      'button.login',
      'button.btn-login',
      // Case insensitive versions
      'button:has-text(/login/i)',
      'button:has-text(/log in/i)',
      '.btn:has-text(/login/i)',
      '.button:has-text(/login/i)'
    ];
    
    for (const selector of loginButtonSelectors) {
      try {
        const button = await page.$(selector);
        if (button && await button.isVisible()) {
          console.log(`Found login button with selector: ${selector}`);
          return button;
        }
      } catch (err) {
        // Continue to next selector
      }
    }
  }
  
  // Regular element finding logic continues...
  console.log(`Finding element for: ${descriptor}`);
  
  // Phase 1: Try direct matches with common element selectors
  const directSelectors = [
    // By text content
    `text="${descriptor}"`,
    `text="${descriptor}" >> visible=true`,
    
    // By button/link text
    `button:has-text("${descriptor}")`,
    `a:has-text("${descriptor}")`,
    
    // By aria-label
    `[aria-label="${descriptor}"]`,
    `[aria-label*="${descriptor}" i]`,
    
    // By title
    `[title="${descriptor}"]`,
    `[title*="${descriptor}" i]`,
    
    // By id/class containing the descriptor
    `[id*="${descriptor}" i]`,
    `[class*="${descriptor}" i]`,
    
    // By name attribute
    `[name="${descriptor}"]`,
    
    // By role with text
    `[role="button"]:has-text("${descriptor}")`,
    `[role="link"]:has-text("${descriptor}")`,
    
    // By data attributes
    `[data-test*="${descriptor}" i]`,
    `[data-cy*="${descriptor}" i]`,
    `[data-testid*="${descriptor}" i]`
  ];
  
  for (const selector of directSelectors) {
    try {
      const element = await page.$(selector);
      if (element && await element.isVisible()) {
        console.log(`Found element via direct selector: ${selector}`);
        return element;
      }
    } catch (e) {
      // Ignore errors in individual selectors
    }
  }
  
  // Phase 2: Find by partial text match
  try {
    const partialTextSelectors = [
      `text=${descriptor}`,
      `text="${descriptor}"`,
      `text="${descriptor}" >> visible=true`
    ];
    
    for (const selector of partialTextSelectors) {
      try {
        const elements = await page.$$(selector);
        for (const element of elements) {
          if (await element.isVisible()) {
            console.log(`Found element via partial text match: ${selector}`);
            return element;
          }
        }
      } catch (e) {
        // Ignore errors in individual selectors
      }
    }
  } catch (e) {
    console.error('Error in partial text match phase:', e);
  }
  
  // Phase 3: Find by fuzzy text match (case insensitive, partial)
  try {
    const fuzzyTextSelectors = [
      `text=${descriptor.toLowerCase()}`,
      `text=${descriptor.toUpperCase()}`,
      `text=${descriptor.charAt(0).toUpperCase() + descriptor.slice(1)}`
    ];
    
    for (const selector of fuzzyTextSelectors) {
      try {
        const elements = await page.$$(selector);
        for (const element of elements) {
          if (await element.isVisible()) {
            console.log(`Found element via fuzzy text match: ${selector}`);
            return element;
          }
        }
      } catch (e) {
        // Ignore errors in individual selectors
      }
    }
  } catch (e) {
    console.error('Error in fuzzy text match phase:', e);
  }
  
  // Try input[type="submit"] with value containing "login"
  const submitLogin = await page.$('input[type="submit"][value*="login" i]');
  if (submitLogin && await submitLogin.isVisible()) {
    console.log('Found login button via input[type="submit"][value*="login" i]');
    return submitLogin;
  }

  // Phase 4: Try common clickable elements
  const commonClickableSelectors = [
    'button',
    'a',
    '[role="button"]',
    '[role="link"]',
    'input[type="submit"]',
    'input[type="button"]'
  ];
  
  for (const selector of commonClickableSelectors) {
    try {
      const elements = await page.$$(selector);
      
      for (const element of elements) {
        if (await element.isVisible()) {
          // Check if the element's text contains the descriptor
          const text = await element.textContent();
          if (text && text.toLowerCase().includes(descriptor.toLowerCase())) {
            console.log(`Found element via common clickable with matching text: ${selector} and text: ${text}`);
            return element;
          }
        }
      }
    } catch (e) {
      // Ignore errors in individual selectors
    }
  }
  
  // Phase 5: Fallback to any visible button or link
  try {
    const allButtons = await page.$$('button:visible, a:visible, [role="button"]:visible, input[type="submit"]:visible');
    if (allButtons.length > 0) {
      console.log('Falling back to first visible button/link element');
      return allButtons[0];
    }
  } catch (e) {
    console.error('Error in fallback phase:', e);
  }
  
  console.log('No element found for descriptor:', descriptor);
  return null;
}
