// Advanced Browser Automation Test Script
const axios = require('axios');
const readline = require('readline');

// Create interactive terminal interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Define available test scenarios
const testScenarios = [
  {
    name: "Google Search",
    command: "go to https://google.com and search for puppies"
  },
  {
    name: "GitHub Navigation",
    command: "go to https://github.com and click on Sign in and wait 2 seconds"
  },
  {
    name: "Form Interaction",
    command: "go to https://httpbin.org/forms/post and fill 'Test Data' in the custname field and click the Submit button"
  },
  {
    name: "Multi-Step Workflow",
    command: "go to https://wikipedia.org and type 'artificial intelligence' in the search field and press Enter"
  },
  {
    name: "Custom Command",
    command: null // Will prompt the user for a custom command
  }
];

// Function to display the menu
function showMenu() {
  console.log('\n🤖 Advanced Browser Automation Tests');
  console.log('===================================\n');
  console.log('Choose a test scenario to run:\n');
  
  testScenarios.forEach((scenario, index) => {
    console.log(`${index + 1}. ${scenario.name}`);
    if (scenario.command) {
      console.log(`   Command: "${scenario.command}"\n`);
    } else {
      console.log(`   Enter your own custom command\n`);
    }
  });
  
  rl.question('Enter scenario number (1-5): ', (answer) => {
    const choice = parseInt(answer);
    
    if (choice >= 1 && choice <= testScenarios.length) {
      const selectedScenario = testScenarios[choice - 1];
      
      if (selectedScenario.command) {
        runTest(selectedScenario.command);
      } else {
        // Custom command
        rl.question('\nEnter your custom automation command: ', (customCommand) => {
          runTest(customCommand);
        });
      }
    } else {
      console.log('Invalid choice. Please select a number between 1 and 5.');
      showMenu();
    }
  });
}

// Function to run the test
async function runTest(command) {
  try {
    console.log(`\n🚀 Executing: "${command}"\n`);
    
    // Send request to the API
    const response = await axios.post('http://localhost:3000/interact', {
      command: command
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 300000 // 5 minute timeout for the never-resolving promise
    });
    
    console.log('✅ Command completed successfully');
    console.log('\nResponse from server:');
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\n👉 The browser should stay open until you manually close it.');
    console.log('   If you see a CAPTCHA, complete it manually in the browser window.\n');
    
    askToRunAnother();
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('\n✅ Browser is running and will stay open until you close it!');
      console.log('   The script timeout is expected - this happens because the browser');
      console.log('   is intentionally kept open with a never-resolving promise.\n');
      
      askToRunAnother();
    } else {
      console.error('\n❌ Error occurred:');
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error('Response data:', error.response.data);
      } else {
        console.error(`Message: ${error.message}`);
      }
      
      askToRunAnother();
    }
  }
}

// Ask if the user wants to run another test
function askToRunAnother() {
  rl.question('\nWould you like to run another test? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      showMenu();
    } else {
      console.log('\nThank you for testing the browser automation system! 👋');
      rl.close();
    }
  });
}

// Start the test menu
console.log('Advanced Browser Automation Test Suite');
console.log('--------------------------------------');
console.log('This script will demonstrate the new capabilities of your browser automation system.\n');
console.log('The browser will stay open after each command so you can see the results.');
console.log('Note: You may need to manually close browsers between tests.\n');

showMenu();
