#! /usr/bin/env bash

set -eux

export JUNIT_REPORT_PATH=./test-reports/unittest/report.xml
nyc \
  --all \
  --reporter text --reporter html \
  --report-dir "./test-reports/coverage" \
  --exclude "test" \
  --exclude "test-reports" \
  --exclude "bin" \
  --exclude '**/*.d.ts' \
  mocha \
    --timeout 20000 \
    --recursive \
    --reporter mocha-jenkins-reporter \
    dist/test/TestConfiguration.js 'dist/test/*Spec.js' 'dist/test/**/*Spec.js'
