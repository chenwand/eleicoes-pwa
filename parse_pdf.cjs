const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('ea11.pdf');

pdf(dataBuffer).then(function(data) {
  fs.writeFileSync('ea11_text.txt', data.text);
  console.log('PDF parsed and saved to ea11_text.txt');
}).catch(err => {
  console.error(err);
});
