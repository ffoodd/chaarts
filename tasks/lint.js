const gulp     = require('gulp');
const eslinter = require('gulp-eslint');
const linter   = require('gulp-stylelint');
const options  = require('./options');

function eslint() {
    return gulp.src(options.paths.root + 'script.js')
    .pipe(eslinter());
}

function stylelint() {
    return gulp.src(options.paths.root + 'sass/**/*.scss')
    .pipe(linter(options.stylelint));
}

module.exports = gulp.parallel( eslint, stylelint );
