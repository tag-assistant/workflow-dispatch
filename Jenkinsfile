/* Build with Node.js Docker container */
pipeline {
    agent any
    
    stages {
        stage('Setup Node Container') {
            steps {
                echo 'Pulling Node.js Docker image...'
                sh 'docker pull node:24.11.1-alpine3.22'
            }
        }
        
        stage('Build Backend') {
            steps {
                echo 'Building backend...'
                sh '''
                    docker run --rm -v $(pwd)/backend:/app -w /app node:24.11.1-alpine3.22 sh -c "
                        npm ci && npm run build
                    "
                '''
            }
        }
        
        stage('Build Frontend') {
            steps {
                echo 'Building frontend...'
                sh '''
                    docker run --rm -v $(pwd)/frontend:/app -w /app node:24.11.1-alpine3.22 sh -c "
                        npm ci && npm run build
                    "
                '''
            }
        }
        
        stage('Archive Artifacts') {
            steps {
                echo 'Archiving build artifacts...'
                archiveArtifacts artifacts: 'backend/dist/**/*', allowEmptyArchive: true
                archiveArtifacts artifacts: 'frontend/dist/**/*', allowEmptyArchive: true
            }
        }
    }
    
    post {
        success {
            echo '✅ Build completed successfully!'
        }
        failure {
            echo '❌ Build failed!'
        }
        always {
            echo 'Build finished - workspace preserved for inspection'
        }
    }
}
