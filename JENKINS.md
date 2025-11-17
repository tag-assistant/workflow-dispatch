# Jenkins Local Setup 🚀

## Quick Start

The Jenkins configuration is saved in the `jenkins_home` Docker volume.

### Start Jenkins
```bash
docker-compose -f docker-compose.jenkins.yml up -d
```

### Stop Jenkins
```bash
docker-compose -f docker-compose.jenkins.yml down
```

### Access Jenkins
- URL: http://localhost:8080
- Username: `admin`
- Password: Check with `docker exec jenkins-local cat /var/jenkins_home/secrets/initialAdminPassword`

## Pipeline Configuration

The `workflow_dispatch_test` pipeline is already configured and clones from:
- Repository: `https://github.com/austenstone/workflow_dispatch.git`
- Branch: `master`

## Notes

- Jenkins data persists in the `jenkins_home` volume
- Setup wizard is skipped on restart
- All your jobs and configurations are preserved
