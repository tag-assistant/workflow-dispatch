/* Simplified version - runs on Jenkins built-in node */
pipeline {
    agent any
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Environment Info') {
            steps {
                sh 'node --version'
                sh 'npm --version'
            }
        }
        
        stage('Build Backend') {
            steps {
                echo 'Building backend...'
                dir('backend') {
                    sh 'npm ci'
                    sh 'npm run build'
                }
            }
        }
        
        stage('Build Frontend') {
            steps {
                echo 'Building frontend...'
                dir('frontend') {
                    sh 'npm ci'
                    sh 'npm run build'
                }
            }
        }
        
        stage('Archive Artifacts') {
            steps {
                echo 'Archiving build artifacts...'
                archiveArtifacts artifacts: 'backend/dist/**/*', allowEmptyArchive: true
                archiveArtifacts artifacts: 'frontend/build/**/*', allowEmptyArchive: true
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
