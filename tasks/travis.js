const fs       = require('fs');
const gulp     = require('gulp');
const options  = require('./options');
const html     = require('html-validator');
const eslinter = require('gulp-eslint');
const linter   = require('gulp-stylelint');
const symbols  = require('log-symbols');
const chalk    = require('chalk');

function displayTest(test) {
  switch(test.status) {
    case 'error':
    case false:
      var symbol = symbols.error;
      break;
    case 'warning':
      var symbol = symbols.warning;
      break;
    case 'info':
      var symbol = symbols.info;
      break;
    case true:
    default:
      var symbol = symbols.success;
  }

  console.error(chalk`${symbol} {white ${test.name}} ${test.value}`)
};

function travisHTML(done) {
  for (let page in options.test.arr) {
    fs.readFile(options.test.arr[page], 'utf8', (error, response) => {
    if (error) {
      throw error;
    }

    html({data: response})
      .then((data) => {
        console.log(chalk.cyan(`File to test: ${options.test.arr[page]}`))
        let messages = JSON.parse(data);
        let errors = [];
        let results  = messages.messages.reduce((results, value, key) => {
          results[key] = value;
          return results;
        }, {});
        for (let result in results) {
          if (results[result].type === "error") {
            errors.push(results[result]);
          }
        }
        if (errors.length > 0) {
          errors.forEach(function(error) {
            console.error(`${error.message} from line ${error.firstLine}, column ${error.firstColumn}; to line ${error.lastLine}, column ${error.lastColumn}`)
          });
          process.exit(1);
        } else {
          console.log('The HTML document validates according to the W3C')
        }
      })
      .catch((error) => {
        console.error(error)
      })
    });
  }

  done();
}

function travisJS() {
  return gulp.src(options.paths.root + 'script.js')
    .pipe(eslinter())
    .pipe(eslinter.failAfterError());
}

function travisSCSS() {
  return gulp.src(options.paths.root + 'sass/**/*.scss')
    .pipe(linter(options.travis.stylelint));
}

module.exports = gulp.parallel( travisHTML, travisJS, travisSCSS );
