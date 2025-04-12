// Test login for CodeChef
const axios = require('axios');

async function testCodeChefLogin() {
  try {
    console.log('\n🍳 Testing CodeChef Login');
    console.log('=====================\n');
    
    console.log('Sending command to login to CodeChef...\n');
    
    const response = await axios.post('http://localhost:3000/interact', {
      command: 'go to https://www.codechef.com/login?destination=/ and fill \'nikhil0113\' in username field and fill \'nikhil\' in password field and click login'
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

console.log('Running CodeChef login test...');
testCodeChefLogin();
