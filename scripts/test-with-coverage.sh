#! /usr/bin/env bash

export JUNIT_REPORT_PATH=./test-reports/unittest/report.xml
nyc \
  --all \
  --reporter text --reporter html \
  --include "src/**.js" \
  --report-dir "./test-reports/coverage" \
  mocha \
    --recursive \
    --reporter mocha-jenkins-reporter \
    test/TestConfiguration.js test/*Spec.js test/**/*Spec.js
