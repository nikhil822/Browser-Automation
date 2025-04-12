// src/services/nlpService.ts
import { pipeline, TextClassificationPipeline } from '@xenova/transformers';

let classifier: TextClassificationPipeline | undefined;

// Classify the input text using a pre-trained sentiment analysis model
export async function classifyCommand(text: string): Promise<any> {
  if (!classifier) {
    console.log("Loading classifier...");
    classifier = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
    console.log("Classifier loaded.");
  }
  const result = await classifier(text);
  return result;
}

// A more comprehensive rule-based parser to extract actions from natural language commands
export function parseCommandHybrid(command: string): Array<any> {
  const actions: Array<any> = [];
  console.log('Processing command:', command);

  // Split by "and" or "then" to separate multiple actions
  const parts = command.split(/\b(?:and|then)\b/i);

  for (let part of parts) {
    part = part.trim();
    let actionAdded = false;

    // NAVIGATION - Look for a "go to" command
    const urlMatch = part.match(/(?:go to|navigate to|open|visit) (https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      actions.push({ type: "goto", url: urlMatch[1] });
      actionAdded = true;
      continue;
    }

    // SEARCH - Look for "search for ..." command
    const searchForMatch = part.match(/search for (.+)/i);
    if (searchForMatch) {
      actions.push({ type: "search", query: searchForMatch[1].trim() });
      actionAdded = true;
      continue;
    }

    // Catch generic "search ..."
    const searchMatch = part.match(/search (.+)/i);
    if (searchMatch) {
      actions.push({ type: "search", query: searchMatch[1].trim() });
      actionAdded = true;
      continue;
    }
    
    // CLICK - Match "click" commands
    const clickPatterns = [
      // Match "click login" or "click the login button" type patterns
      /click (?:on |the )?(?:button|link|tab|element|)?(?: labeled| named)? ["']?([^"'.,]+)["']?/i,
      /click (?:on |the )?["']([^"'.,]+)["']/i,
      /press (?:the )?(?:button|link)?(?: labeled| named)? ["']?([^"'.,]+)["']?/i,
      // Handle nth result/link patterns
      /click(?: on| the)? (first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th) (?:result|link|item)/i,
      // Simple click command with just the button name
      /click ([a-zA-Z0-9_-]+)\b/i
    ];
    
    for (const pattern of clickPatterns) {
      const clickMatch = part.match(pattern);
      if (clickMatch) {
        actions.push({ 
          type: "click", 
          elementDescriptor: clickMatch[1].trim() 
        });
        actionAdded = true;
        break;
      }
    }
    if (actionAdded) continue;
    
    // FILL - Match form field input
    const fillPatterns = [
      /(?:type|enter|input|fill)(?: in| into)? ["']([^"']+)["'](?:(?: in| into)(?: the)? | in | into |\s)(?:the )?([^.,]+)/i,
      /(?:type|enter|input|fill)(?: in| into)? ([^"'\s]+)(?:(?: in| into)(?: the)? | in | into |\s)(?:the )?([^.,]+)/i,
      /(?:fill|populate|complete)(?: out| in)?(?: the)? ([^.,]+?)(?: (?:with|using|as) | with | using )(?:the )?(?:text |value |input )?["']?([^"'.,]+)["']?/i
    ];
    
    for (const pattern of fillPatterns) {
      const fillMatch = part.match(pattern);
      if (fillMatch) {
        // The first pattern has value and field in different positions than the third
        const value = fillMatch[1].trim();
        const field = fillMatch[2].trim();
        
        actions.push({ 
          type: "fill", 
          elementDescriptor: field,
          value: value
        });
        actionAdded = true;
        break;
      }
    }
    if (actionAdded) continue;
    
    // LOGIN - Match login commands
    const loginMatch = part.match(/log(?:in|in to|into)(?: using|with)? (?:username|email|user|account)? ["']?([^"'.,]+)["']? (?:and|with) (?:password|pass) ["']?([^"'.,]+)["']?/i);
    if (loginMatch) {
      actions.push({ 
        type: "login", 
        username: loginMatch[1].trim(),
        password: loginMatch[2].trim()
      });
      actionAdded = true;
      continue;
    }
    
    // WAIT - Match wait commands
    const waitMatch = part.match(/wait(?: for)? (\d+) (?:seconds|second|sec|s|milliseconds|ms)/i);
    if (waitMatch) {
      const waitTime = parseInt(waitMatch[1]);
      // Convert to milliseconds if in seconds
      const msTime = part.match(/(?:seconds|second|sec|s)/i) ? waitTime * 1000 : waitTime;
      
      actions.push({ 
        type: "wait", 
        waitTime: msTime
      });
      actionAdded = true;
      continue;
    }
    
    // NAVIGATE RESULTS - Match navigation to search results
    const navResultPatterns = [
      /(?:navigate|go|click)(?: to| on)? (?:the )?(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th) (?:result|link|item)/i,
      /open (?:the )?(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th) (?:result|link|item)/i
    ];
    
    for (const pattern of navResultPatterns) {
      const navMatch = part.match(pattern);
      if (navMatch) {
        // Convert position words to numbers
        const positionMap: {[key: string]: number} = {
          'first': 1, '1st': 1,
          'second': 2, '2nd': 2,
          'third': 3, '3rd': 3,
          'fourth': 4, '4th': 4,
          'fifth': 5, '5th': 5
        };
        
        const position = positionMap[navMatch[1].toLowerCase()] || 1;
        
        actions.push({
          type: "navigateResult",
          position: position
        });
        actionAdded = true;
        break;
      }
    }
    if (actionAdded) continue;
    
    // KEYPRESS - Match key press commands
    const keypressMatch = part.match(/press(?: the)? (enter|tab|escape|esc|space|backspace|delete|arrow up|arrow down|arrow left|arrow right)/i);
    if (keypressMatch) {
      // Map common key names to their actual key codes
      const keyMap: {[key: string]: string} = {
        'enter': 'Enter',
        'tab': 'Tab',
        'escape': 'Escape',
        'esc': 'Escape',
        'space': 'Space',
        'backspace': 'Backspace',
        'delete': 'Delete',
        'arrow up': 'ArrowUp',
        'arrow down': 'ArrowDown',
        'arrow left': 'ArrowLeft',
        'arrow right': 'ArrowRight'
      };
      
      const keyName = keypressMatch[1].toLowerCase();
      const key = keyMap[keyName] || keyName;
      
      actions.push({ 
        type: "keypress", 
        keypress: key
      });
      actionAdded = true;
      continue;
    }
  }

  console.log('Extracted actions:', actions);
  return actions;
}

