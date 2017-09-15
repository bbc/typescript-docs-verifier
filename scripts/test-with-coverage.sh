#! /usr/bin/env bash

export JUNIT_REPORT_PATH=./test-reports/unittest/report.xml
nyc \
  --all \
  --reporter text --reporter html \
  --include "dist/src/**.js" \
  --report-dir "./test-reports/coverage" \
  mocha \
    --require source-map-support/register \
    --recursive \
    --reporter mocha-jenkins-reporter \
    dist/test/TestConfiguration.js dist/test/*Spec.js dist/test/**/*Spec.js
