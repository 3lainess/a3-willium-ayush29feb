import gulp from 'gulp'
import browserify from 'browserify'
import watchify from 'watchify'
import babelify from 'babelify'
import rimraf from 'rimraf'
import source from 'vinyl-source-stream'
import sass from 'gulp-sass'
import browserSyncModule from 'browser-sync'
import autoprefixer from 'gulp-autoprefixer'
import gutil from 'gulp-util'
import shell from 'gulp-shell'
import ghPages from 'gulp-gh-pages'

let browserSync = browserSyncModule.create()

const config = {
  inFiles: {
    html: 'src/*.html',
    js: ['src/source.js'],
    styles: 'src/css/*.scss',
    css: 'src/css/style.scss',
    data: 'data/*.json',
    fonts: 'src/fonts/**/*.*'
  },
  outDir: 'build/',
  outFiles: {
    js:   'main.js',
  },
}

gutil.log('Starting!')

function logError(err) {
  gutil.log(
    `[${gutil.colors.blue(err.plugin)}] ${gutil.colors.red('Error:')}`,
    `${gutil.colors.red(err.messageFormatted || err.message)}`
  )
  gutil.log(err)
}

function getBundler() {
  if (!global.bundler) {
    let conf = {
      entries: config.inFiles.js,
      paths: ['./node_modules', './src'],
      debug: true,
    }
    Object.assign(conf, watchify.args)

    global.bundler = watchify(browserify(conf)).transform(babelify)
  }
  return global.bundler
}

gulp.task('clean', function (cb) {
  return rimraf(config.outDir, cb)
})

gulp.task('remove', shell.task([
  'rm -r build'
]))

gulp.task('server', function () {
  return browserSync.init({
    server: {baseDir: config.outDir},
    ui: false,
    notify: false,
    host: '0.0.0.0',
    port: 8080,
  })
})

gulp.task('deploy', function() {
  return gulp.src(config.outDir + '**/*')
    .pipe(ghPages());
})

gulp.task('data', function () {
  return gulp.src(config.inFiles.data)
    .pipe(gulp.dest(config.outDir))
    .pipe(browserSync.stream())
});

gulp.task('js', function () {
  return getBundler().bundle()
    .on('error', logError)
    .pipe(source(config.outFiles.js))
    .pipe(gulp.dest(config.outDir))
    .pipe(browserSync.stream())
})

gulp.task('fonts', function () {
  return gulp.src(config.inFiles.fonts, { base: './src' })
    .pipe(gulp.dest(config.outDir))
    .pipe(browserSync.stream())
});


gulp.task('sass', function () {
  return gulp.src(config.inFiles.css)
    .pipe(sass()).on('error', logError)
    .pipe(autoprefixer({ browsers: ['> 5% in IT', 'ie >= 8'] }))
    .pipe(gulp.dest(config.outDir))
    .pipe(browserSync.stream())
})

gulp.task('html', function () {
  return gulp.src(config.inFiles.html)
    .pipe(gulp.dest(config.outDir)) // Just copy.
    .pipe(browserSync.stream())
})

gulp.task('watch', ['clean', 'remove', 'server', 'js', 'fonts', 'sass', 'data', 'html'], function () {
  // FIXME: initial build is done two times
  getBundler().on('update', () => gulp.start('js'))
  gulp.watch(config.inFiles.data, ['data'])
  gulp.watch(config.inFiles.styles, ['sass'])
  gulp.watch(config.inFiles.html, ['html'])
})
