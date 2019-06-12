const gulp     = require('gulp');
const sass     = require('gulp-sass');
const maps     = require('gulp-sourcemaps');
const csso     = require('gulp-csso');
const prefix   = require('gulp-autoprefixer');
const rename   = require('gulp-rename');
const newer    = require('gulp-newer');
const babel    = require('gulp-babel');
const uglify   = require('gulp-uglify');
const options  = require('./options');

function js() {
    return gulp.src(options.paths.root + 'script.js')
      .pipe(newer(options.paths.root + 'script.min.js'))
      .pipe(babel(options.babel))
      .pipe(uglify().on('error', function(err) {
        console.error(`${err.cause.message} in ${err.cause.filename} at line ${err.cause.line}`);
        this.emit('end');
      }))
      .pipe(rename({suffix: '.min'}))
      .pipe(gulp.dest(options.paths.root));
}

function css() {
    return gulp.src(options.paths.root + 'sass/*.scss')
      .pipe(newer(options.paths.root + 'chaarts.min.css'))
      .pipe(maps.init())
      .pipe(sass().on('error', sass.logError))
      .pipe(prefix(options.browsers))
      .pipe(csso(options.csso))
      .pipe(rename({suffix: '.min'}))
      .pipe(maps.write())
      .pipe(gulp.dest(options.paths.root));
}

module.exports = gulp.parallel( js, css );
