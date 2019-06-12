const fs       = require('fs');
const gulp     = require('gulp');
const html     = require('html-validator');
const eslinter = require('gulp-eslint');
const linter   = require('gulp-stylelint');
const options  = require('./options');

function travisHTML(done) {
  fs.readFile(options.test.home, 'utf8', (error, response) => {
    if (error) {
      throw error;
    }

    html({data: response})
      .then((data) => {
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
