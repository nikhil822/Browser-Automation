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
  // Default return message
  let resultMessage = 'Successfully executed automation';
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
      console.log(`Processing action: ${action.type}`);
      
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
            // Google search
            await page.fill('input[name="q"]', action.query);
            await page.press('input[name="q"]', 'Enter');
            console.log('Performed Google search');
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
            // Make sure it's visible in viewport
            await element.scrollIntoViewIfNeeded();
            await page.waitForTimeout(500);
            
            // Click the element
            await element.click();
            console.log(`Clicked on element: ${action.elementDescriptor}`);
            
            // Wait for any resulting navigation or state change
            try {
              await page.waitForLoadState('networkidle', { timeout: 5000 });
            } catch (e) {
              // It's okay if there's no navigation
              console.log('No navigation detected after click (which might be fine)');
            }
          } else {
            console.error(`Element not found: ${action.elementDescriptor}`);
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
    
    // The key approach: return a promise that never resolves to keep the browser open
    // The browser will only close if explicitly closed by the user
    await new Promise(() => {});
    
    // This code is never reached, but TypeScript needs a return statement
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
    
    // Never resolve this promise to keep the browser open even after errors
    await new Promise(() => {});
    
    // This line is never reached
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
            console.log(`Found element via common clickable with matching text: ${selector}`);
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
