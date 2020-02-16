#!/bin/groovy
pipeline {
  agent any

  tools {
    nodejs 'node-12'
  }
  stages {
    stage('Startup') {
      steps {
        script {
          sh 'npm install'
        }
      }
    }
    stage('Test') {
      steps {
        script {
          sh 'npm run test'
        }
      }
      post {
        always {
          coverage 'coverage/cobertura-coverage.xml'
          publishHTML target: [
            allowMissing: false,
            alwaysLinkToLastBuild: false,
            keepAll: true,
            reportDir: 'coverage',
            reportFiles: 'index.html',
            reportName: 'Test Report'
          ]
        }
      }
    }
    stage('Build') {
      steps {
        script {
          sh 'npm build'
        }
      }
    }
  }

}
