
pipeline {
    agent any

    environment {
        DEPLOY_DIR = '/opt/cinematch'
    }

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

        stage('Prepare Deployment') {
            steps {
                sh '''
                    rsync -a --delete \
                      --exclude='.git/' \
                      "$WORKSPACE/" "$DEPLOY_DIR/"
                '''
            }
        }

        stage('Build and Deploy') {
            steps {
                dir('/opt/cinematch') {
                    sh '''
                        docker compose up -d --build
                        docker compose ps
                    '''
                }
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    for i in $(seq 1 15); do
                        if curl -fsS http://localhost/api/health; then
                            echo "CineMatch is healthy"
                            exit 0
                        fi
                        sleep 2
                    done

                    echo "Health check failed"
                    docker compose -f "$DEPLOY_DIR/compose.yaml" logs
                    exit 1
                '''
            }
        }
    }

    post {
        success {
            echo 'CineMatch deployed successfully!'
        }

        failure {
            echo 'Pipeline failed. Check the Jenkins console output.'
        }
    }
}
