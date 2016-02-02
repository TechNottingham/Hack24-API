"use strict";

var gulp = require('gulp')
var del = require('del')
var os = require('os')
var spawn = require('child_process').spawn
var gutil = require('gulp-util')

function getBinary(command) {
  return os.platform().substr(0, 3) === 'win' ?
    'node_modules\\.bin\\' + command + '.cmd' :
    './node_modules/.bin/' + command
}

function gulpPrint(data) {
  var lines = data.split(/[\r\n]+/g)
  lines.forEach(function (line) {
    if (line.length > 0) gutil.log(line)
  })
}

function compile(projectPath, watch, done) {
  var args = ['--project', projectPath]
  if (watch === true) args.push('-w')
  
  var tsc = spawn(getBinary('tsc'), args, { cwd: process.cwd() })
  
  tsc.stdout.setEncoding('utf8')
  tsc.stderr.setEncoding('utf8')
  
  tsc.stdout.on('data', gulpPrint)
  tsc.stderr.on('data', gulpPrint)
  
  tsc.on('close', function (code) {
    if (code !== 0) return done(new Error('tsc finished with non-zero exit code (' + code + ')'))
    done(null)
  })
  
  tsc.on('error', done)
}


gulp.task('clean', function () {
  return del('build')
})


gulp.task('build:server', ['clean'], function (done) {
  compile('src/server', false, done)
})

gulp.task('build', ['build:server'])



gulp.task('build:server:watch', function (done) {
  compile('src/server', true, done)
})

gulp.task('watch', ['build:server:watch'])


gulp.task('test', [])