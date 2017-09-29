pipeline {
  agent any
  environment {
    FORCE_COLOR = 1
  }
  options {
    ansiColor('xterm')
  }
  stages {

    stage('Checkout') {
      steps {
        script {
          gitCheckout([ githubProjectName: 'typescript-docs-verifier' ])
        }
      }
    }

    stage('Build and Test') {
      steps {
        sh '''
          yarn install
          yarn test
          node_modules/.bin/nsp check --output standard
        '''
      }
    }

    stage('Publishing compiled javascript') {
      steps {
        sh '''
          sed -i /^dist$/d .gitignore
          rm -rf dist
          yarn build
          git add --all dist
          git commit --allow-empty -m "Automated CI commit of compiled javascript"
          git push origin HEAD:master
        '''
      }
    }

    stage('Release') {
      steps {
        script {
          def version = sh(script: '''node -e "console.log(require('./package.json').version)"''', returnStdout: true).trim()
          def tagExists = sh(script: "git ls-remote --tags -q git@github.com:bbc/typescript-docs-verifier.git $version", returnStdout: true).trim()

          if (tagExists) {
            echo "Release $version already exists -- skipping tagging of release"
          } else {
            tagRelease([ release: version, releaseTitle: 'Release' ])
          }
        }
      }
    }
  }

  post { 
      always { 
        junit allowEmptyResults: true, testResults: 'test-reports/unittest/*.xml'
        publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, keepAll: false, reportDir: 'test-reports/coverage', reportFiles: 'index.html', reportName: 'Coverage Report', reportTitles: ''])
      }
    }
}