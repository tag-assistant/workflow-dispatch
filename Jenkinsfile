/* Simplified version - runs on Jenkins built-in node */
pipeline {
    agent any
    
    stages {
        stage('Verify Checkout') {
            steps {
                echo '✅ Repository checked out successfully'
                sh 'ls -la'
                sh 'git log -1 --oneline'
            }
        }
        
        stage('Environment Info') {
            steps {
                echo 'System information:'
                sh 'uname -a'
                sh 'pwd'
                sh 'which git'
            }
        }
        
        stage('Verify Structure') {
            steps {
                echo 'Checking project structure...'
                sh 'ls -la backend/'
                sh 'ls -la frontend/'
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
