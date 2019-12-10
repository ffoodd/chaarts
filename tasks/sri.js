const gulp    = require('gulp');
const hash    = require('gulp-sri-hash');
const options = require('./options');

function sri() {
  return gulp.src(options.test.all)
    .pipe(hash())
    .pipe(gulp.dest(options.paths.docs));
}

module.exports = sri;
