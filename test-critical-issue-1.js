// Critical security issue for Gemini validation

const userInput = process.argv[2];
// Simulate command injection vulnerability
require('child_process').exec(userInput, (err, stdout, stderr) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(stdout);
});

module.exports = { userInput };
