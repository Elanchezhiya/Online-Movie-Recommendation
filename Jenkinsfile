
pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Test Backend') {
            steps {
                sh '''
                    docker run --rm \
                      -v "$WORKSPACE/backend:/app" \
                      -w /app \
                      python:3.12-slim \
                      sh -c "pip install -q -r requirements.txt && pytest -q"
                '''
            }
        }

        stage('Build Docker Images') {
            steps {
                sh 'docker compose build'
            }
        }
    }

    post {
        success {
            echo 'CineMatch tests passed and Docker images were built!'
        }

        failure {
            echo 'Build failed. Check Console Output.'
        }
    }
}
