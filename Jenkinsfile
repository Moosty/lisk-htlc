#!/bin/groovy
pipeline {
  agent any

  tools {
    nodejs 'node-12'
  }
  stages {
  stage('Pre start') {
        steps {
          script {
            sh 'npm install yarn -g'
          }
        }
      }
    stage('Startup') {
      steps {
        script {
          sh 'yarn install'
        }
      }
    }
    stage('Test') {
      steps {
        script {
          sh 'npm run test:ci'
        }
      }
      post {
        always {
          junit 'coverage/junit.xml'
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
