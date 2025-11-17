/* Docker-based build with Node.js */
pipeline {
    agent {
        docker {
            image 'node:24.11.1-alpine3.22'
            args '-v $HOME/.npm:/root/.npm'
        }
    }
    
    stages {
        stage('Environment Info') {
            steps {
                echo 'Node.js environment:'
                sh 'node --version'
                sh 'npm --version'
                sh 'pwd'
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
