# CineMatch | Online Movie Recommendation

CineMatch is a demo movie-discovery and watchlist application for practicing AWS and DevOps workflows. The frontend uses HTML, CSS, JavaScript, and Nginx. The backend is a Python Flask API. Docker Compose runs the containers locally, Jenkins runs the build and test pipeline, and Kubernetes/Minikube manages application pods.

> Repository URL: replace `<OWNER>/<REPOSITORY>` with the GitHub repository you use.

## Features

- Browse a small movie catalogue with genres, descriptions, and ratings.
- Search movies by title and filter by genre.
- Add and remove movies from a browser-local watchlist.
- Flask health, movie-search, and recommendation endpoints.
- Docker container builds and Docker Compose support.
- Backend tests with pytest.
- Jenkins CI pipeline for checkout, tests, and image builds.
- Kubernetes Deployments and ClusterIP Services.

## Technology stack

- Frontend: HTML5, CSS3, JavaScript, Nginx
- Backend: Python 3.12, Flask
- Tests: pytest
- Containers: Docker, Docker Compose
- CI: Jenkins
- Orchestration: Kubernetes with Minikube
- Cloud host: AWS EC2 running Ubuntu
- Source control: Git and GitHub

## Architecture

```text
Browser
  |
  v
Frontend Service -> Nginx frontend pods
                         |
                         | /api/* reverse proxy
                         v
                 Backend Service -> Flask backend pods
```

The frontend calls relative URLs such as `/api/movies`. Nginx forwards these requests to the Flask backend. The Nginx proxy target must match the backend service name in the environment where you deploy. Docker Compose uses the service name `backend`; the Kubernetes manifest uses `cinematch-backend`. If one Nginx configuration is shared by both environments, make sure its service name matches or keep separate environment-specific configs/images.

## Project structure

```text
Online-Movie-Recommendation/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── test_app.py
│   └── Dockerfile
├── frontend/
│   ├── index.html
│   ├── script.js
│   ├── style.css
│   ├── nginx.conf
│   └── Dockerfile
├── k8s/
│   └── deployment.yaml
├── compose.yaml
├── Jenkinsfile
└── .gitignore
```

## Prerequisites

For a combined Jenkins + Docker + Minikube demonstration, use an EC2 instance with enough CPU, RAM, and disk for all services. A small instance may run out of memory. You need Git, Docker Engine, the Docker Compose plugin, Jenkins, Minikube, and kubectl. Python 3.12 is optional on the host because tests can run in a Python container.

Run Minikube as a regular Ubuntu user, not root.

## 1. Clone the repository

On a new Ubuntu machine or EC2 instance, replace the URL with your repository URL:

```bash
sudo apt-get update
sudo apt-get install -y git curl ca-certificates
git clone https://github.com/<OWNER>/<REPOSITORY>.git
cd <REPOSITORY>
```

If the repository is already present, enter its directory and sync changes:

```bash
cd ~/cinematch   # replace this with your actual project directory if different
git status
git fetch origin
git pull --rebase origin main
```

If Git reports conflicts, resolve them before continuing. Do not use `git push --force` to fix a non-fast-forward rejection.

## 2. Install and verify Docker

If Docker is not installed already:

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu
```

Sign out and sign back in to refresh the group membership. Then verify:

```bash
whoami
groups
docker version
docker compose version
docker ps
```

The `ubuntu` user should be listed in the `docker` group. Docker-group membership grants root-equivalent privileges, so add only trusted users.

## 3. Run backend tests

From the repository root:

```bash
docker run --rm \
  -v "$PWD/backend:/app" \
  -w /app \
  python:3.12-slim \
  sh -c "pip install -q -r requirements.txt && pytest -q"
```

Expected: all included backend tests pass.

Alternatively, if Python and pip are installed on the host:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cd backend
pytest -q
cd ..
deactivate
```

## 4. Build and run with Docker Compose

```bash
docker compose build
docker compose up -d
docker compose ps
docker compose logs --tail=100
```

Test locally on the EC2 instance:

```bash
curl -I http://localhost/
curl http://localhost/api/health
curl http://localhost/api/movies
```

If port 80 is not exposed publicly, use an SSH tunnel for browser testing. Stop Compose with:

```bash
docker compose down
```

## 5. Build and publish Docker images

Keep the Docker Hub namespace out of source files. Set it only in your terminal session, replacing the example value locally:

```bash
export DOCKERHUB_USERNAME=your_dockerhub_namespace
```

Build both images from the repository root:

```bash
docker build -t "$DOCKERHUB_USERNAME/cinematch-backend:1.0" ./backend
docker build -t "$DOCKERHUB_USERNAME/cinematch-frontend:1.0" ./frontend
docker image ls | grep cinematch
```

Authenticate interactively and publish:

```bash
docker login
docker push "$DOCKERHUB_USERNAME/cinematch-backend:1.0"
docker push "$DOCKERHUB_USERNAME/cinematch-frontend:1.0"
```

Never store Docker Hub passwords or tokens in source code, the README, a Dockerfile, or the Jenkinsfile. Use Jenkins Credentials for pipeline authentication. If you also want your personal Docker Hub account identity to remain separate from the project, publish images under a dedicated organization or project account.

## 6. Start Minikube and check Kubernetes

Install Minikube and kubectl using the official instructions:

- Minikube: https://minikube.sigs.k8s.io/docs/start/
- kubectl: https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/

Then start the single-node learning cluster as the regular `ubuntu` user:

```bash
minikube start --driver=docker
minikube status
kubectl config current-context
kubectl get nodes
kubectl get pods -A
```

Expected: the current context is `minikube` and its node becomes `Ready`.

## 7. Kubernetes Nginx configuration

The Kubernetes backend Service is named `cinematch-backend`. For Kubernetes, the Nginx proxy block should use that service name:

```nginx
location /api/ {
    proxy_pass http://cinematch-backend:5000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

The existing Compose configuration may instead require `http://backend:5000/api/`. Use a Kubernetes-specific Nginx configuration/image, or make the service names consistent. Rebuild and push the frontend image after changing its Nginx configuration.

## 8. Deploy to Kubernetes

Set the namespace in your shell, install `envsubst` if necessary, and render the manifest at deployment time:

```bash
sudo apt-get install -y gettext-base
export DOCKERHUB_USERNAME=your_dockerhub_namespace
envsubst '${DOCKERHUB_USERNAME}' < k8s/deployment.yaml | kubectl apply -f -
```

Check rollout and resource status:

```bash
kubectl rollout status deployment/cinematch-backend --timeout=180s
kubectl rollout status deployment/cinematch-frontend --timeout=180s
kubectl get deployments
kubectl get pods
kubectl get services
```

If a pod fails, inspect it before deleting or restarting it:

```bash
kubectl get pods
kubectl describe pod <pod-name>
kubectl logs <pod-name> --previous
kubectl logs <pod-name>
kubectl get events --sort-by=.lastTimestamp
```

## 9. Access the app with port forwarding

In an EC2 terminal, start port forwarding and leave this terminal open:

```bash
kubectl port-forward service/cinematch-frontend 8081:80
```

On Windows, open a separate PowerShell window and create the SSH tunnel. Replace the key path and public IP with your own values:

```powershell
ssh -i "C:\path\to\your-key.pem" -o IdentitiesOnly=yes -L 8081:127.0.0.1:8081 ubuntu@YOUR_EC2_PUBLIC_IP
```

Keep the SSH session open and visit http://localhost:8081 in the browser. Do not run the Windows SSH command inside the Linux EC2 terminal. Do not upload or share your private key. This SSH-tunnel method does not require an inbound security-group rule for port 8081; restrict SSH port 22 to trusted source IPs.

## 10. Configure Jenkins CI

The current `Jenkinsfile` checks out the repository, runs backend tests in a Python container, and builds the Docker Compose images. It does not yet push images or deploy to Kubernetes.

1. Open Jenkins and select **New Item**.
2. Enter a project name such as `CineMatch-CI` and choose **Pipeline**.
3. Under Pipeline, choose **Pipeline script from SCM**.
4. Select Git, enter your repository URL, choose branch `*/main`, and set script path to `Jenkinsfile`.
5. Save and choose **Build Now**.
6. Review **Console Output** if a stage fails.

Ensure the Jenkins agent has the required Docker permissions and tools. Do not run Jenkins as root simply to bypass permissions. To add pushing or Kubernetes deployment stages, store credentials in Jenkins Credentials and configure cluster access separately; never hard-code tokens in pipeline code.

## 11. Useful commands

```bash
# Kubernetes
kubectl get all
kubectl get pods -o wide
kubectl describe deployment cinematch-frontend
kubectl logs deployment/cinematch-frontend
kubectl rollout restart deployment/cinematch-frontend
kubectl rollout status deployment/cinematch-frontend

# Docker Compose
docker compose ps
docker compose logs -f
docker compose restart
docker compose down

# Git
git status
git fetch origin
git pull --rebase origin main
git add README.md k8s/deployment.yaml
git commit -m "chore: remove personal identifiers from project files"
git push origin main
```

## Troubleshooting

| Symptom | First diagnostic |
|---|---|
| Minikube error `DRV_AS_ROOT` | Run Minikube as `ubuntu`, not root |
| Docker socket permission denied | Check `groups` and refresh the login after adding the user to `docker` |
| Frontend `CrashLoopBackOff` | Run `kubectl logs <pod-name> --previous` and `kubectl describe pod <pod-name>` |
| Frontend loads but API fails on Kubernetes | Check that Nginx proxies to `cinematch-backend:5000` |
| Git push rejected as non-fast-forward | Fetch, rebase on `origin/main`, resolve conflicts, then push |
| Port 8081 unavailable locally | Keep both the EC2 port-forward and Windows SSH-tunnel sessions open |

## Security notes

- Never commit private keys, access tokens, passwords, or `.env` secrets.
- Avoid exposing Jenkins or the Kubernetes API broadly to the internet.
- Prefer SSH tunnels for demonstrations instead of opening additional ports.
- Minikube is suitable for learning and demos; production deployments may require a managed Kubernetes service.

## License

Add a `LICENSE` file if you intend to distribute the project under an open-source license.
