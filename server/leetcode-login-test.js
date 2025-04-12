// Complex test for multi-step login flow: Google -> LeetCode -> Sign In
const axios = require('axios');

async function testLeetcodeLoginFlow() {
  try {
    console.log('\n🔄 Testing Complex Login Flow');
    console.log('===========================\n');
    
    console.log('Sending multi-step command to navigate to LeetCode and attempt login...\n');
    
    // The command includes multiple steps:
    // 1. Go to Google
    // 2. Search for "leetcode"
    // 3. Navigate to first result
    // 4. Find and click sign in button
    // 5. Fill in email field
    // 6. Fill in password field
    // 7. Click sign in button
    
    const response = await axios.post('http://localhost:3000/interact', {
      command: 'go to https://google.com and search leetcode and navigate to first link and navigate to sign in button and type \'nikhilsahu1312@gmail.com\' in email field and type \'nikhil\' in password field and click on sign in button'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 300000 // 5 minute timeout for the never-resolving promise
    });
    
    console.log('✅ Command executed successfully');
    console.log('\nResponse:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('\n✅ Browser is running and will remain open until you close it.');
      console.log('The script timeout is expected - this indicates the browser is kept open with a never-resolving promise.');
      console.log('\nImportant: If you see a CAPTCHA at any point, complete it manually and the automation will continue.');
    } else {
      console.error('\n❌ Error occurred:');
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error('Response data:', error.response.data);
      } else {
        console.error(`Message: ${error.message}`);
      }
    }
  }
}

console.log('⚠️ Note: This test uses real credential information. For production use, you may want to use test credentials.');
console.log('\nRunning LeetCode login flow test...');
testLeetcodeLoginFlow();
