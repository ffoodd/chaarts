const fs      = require('fs');
const gulp    = require('gulp');
const options = require('./options');
const html    = require('html-validator');
const symbols = require('log-symbols');
const chalk   = require('chalk');

function displayTest(test) {
  let symbol;
  switch(test.status) {
    case 'error':
    case false:
      symbol = symbols.error;
      break;
    case 'warning':
      symbol = symbols.warning;
      break;
    case 'info':
      symbol = symbols.info;
      break;
    case true:
    default:
      symbol = symbols.success;
  }

  console.log(chalk`${symbol} {white ${test.name}} ${test.value}`)
}

/**
 * HTML Validation
 */
function markup(done) {
  for (let page in options.test.arr) {
    fs.readFile(options.test.arr[page], 'utf8', (error, response) => {
    if (error) {
      throw error;
    }

    html({data: response})
      .then(data => {
        console.log(chalk.cyan(`File to test: ${options.test.arr[page]}`))

        let messages = JSON.parse(data);
        let results  = messages.messages.reduce((results, value, key) => { results[key] = value; return results; }, {});
        let errors   = 0;

        for (let result in results) {
          let test = new Object(results[result]);
          if ('error' === results[result].type && ! results[result].message.includes('--') ) {
            errors++;
            test.status = results[result].type;
            test.name   = results[result].message;
            if (!results[result].firstLine) {
              test.firstLine = results[result].lastLine;
            }
            test.value  = `From line ${results[result].firstLine}, column ${results[result].firstColumn}; to line ${results[result].lastLine}, column ${results[result].lastColumn}`;
            displayTest(test)
          }
        }

        if (0 === errors) {
          console.log(chalk`${symbols.success} {green The HTML document validates according to the W3C}`);
        }
      })
      .catch(error => {
        console.error(error)
      })
    });

  }
  done();
}

module.exports = gulp.parallel( markup );
