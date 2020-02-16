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
