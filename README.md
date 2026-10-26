# CineMatch - Online Movie Recommendation

CineMatch is a lightweight IMDb-style movie discovery and watchlist application built as an AWS DevOps project. It uses a Flask REST API for movie data, a static HTML/CSS/JavaScript frontend served by Nginx, Docker Compose for local/container deployment, Jenkins for CI, and Kubernetes (Minikube) for container orchestration.

> **Repository:** https://github.com/Elanchezhiya/Online-Movie-Recommendation

## Features

- Browse a sample movie catalogue with genres, ratings, and descriptions.
- Search movies by title and filter by genre.
- Add and remove movies from a watchlist saved in the browser's local storage.
- Flask endpoints for health checks, movie search, and recommendations.
- Docker images for frontend and backend.
- Automated backend tests with pytest.
- Jenkins pipeline for checkout, tests, and Docker image builds.
- Kubernetes deployments and ClusterIP services for frontend and backend.

## Technology stack

- **Frontend:** HTML5, CSS3, JavaScript, Nginx
- **Backend:** Python 3.12, Flask
- **Testing:** pytest
- **Containers:** Docker, Docker Compose
- **CI:** Jenkins
- **Orchestration:** Kubernetes with Minikube
- **Cloud host:** AWS EC2 (Ubuntu)
- **Source control:** Git and GitHub

## Architecture

```text
Browser
  |
  | HTTP :80 (or SSH-tunnelled localhost:8081)
  v
Frontend Service -> Nginx frontend pods
                         |
                         | /api/* reverse proxy
                         v
                 Backend Service -> Flask backend pods
```

The frontend uses relative API URLs such as `/api/movies`. Nginx forwards these requests to the backend service. In Docker Compose, that service is named `backend`. In Kubernetes, the service name is `cinematch-backend`; **make sure the Nginx configuration used in the Kubernetes image points to this service**. The repository's current `frontend/nginx.conf` uses `backend:5000`, which is suitable for Compose but is not the Kubernetes service name. See the Kubernetes note below.

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

For EC2, use an Ubuntu instance with enough CPU, RAM, and disk for Jenkins, Docker, and Minikube together. A small instance may run out of memory. You need:
- Git
- Docker Engine and Docker Compose plugin
- Python 3.12 (optional for running tests on the host; tests can also run inside Docker)
- Jenkins (for CI)
- Minikube and kubectl (for Kubernetes)
- A GitHub account and Docker Hub account if you want to publish images

Commands below assume a Linux Ubuntu terminal and a non-root user named `ubuntu`. Avoid running Minikube with the Docker driver as root.

## 1. Clone the repository

On a clean Ubuntu machine/EC2 instance:

```bash
sudo apt-get update
sudo apt-get install -y git curl ca-certificates
git clone https://github.com/Elanchezhiya/Online-Movie-Recommendation.git
cd Online-Movie-Recommendation
```

If you already cloned it, enter the existing project directory and sync with GitHub:

```bash
cd ~/cinematch   # use the actual folder where you cloned the repository
git status
git pull --rebase origin main
```

If Git reports conflicts, resolve the conflicted files before continuing. Do not use `git push --force` to fix a non-fast-forward error.

## 2. Install and verify Docker on Ubuntu

If Docker is not already installed:

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu
```

Sign out and sign back in (or start a fresh SSH session) so the new group membership applies. Then run:

```bash
whoami
groups
docker version
docker compose version
docker ps
```

The shell should be the `ubuntu` user and `groups` should include `docker`. Docker-group membership grants root-equivalent privileges, so only trusted users should be added.

## 3. Run tests

From the repository root:

```bash
docker run --rm \
  -v "$PWD/backend:/app" \
  -w /app \
  python:3.12-slim \
  sh -c "pip install -q -r requirements.txt && pytest -q"
```

Expected result: all three tests pass.

Alternatively, if Python 3.12 and pip are installed locally:

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

The Compose configuration exposes the frontend on port 80 and keeps the backend internal.

```bash
docker compose build
docker compose up -d
docker compose ps
docker compose logs --tail=100
```

On the EC2 instance, test the frontend locally:

```bash
curl -I http://localhost/
curl http://localhost/api/health
curl http://localhost/api/movies
```

Browse to `http://EC2_PUBLIC_IPV4/` only if TCP port 80 is allowed in the EC2 security group. For safer testing, use an SSH tunnel rather than opening public ports. Stop Compose with:

```bash
docker compose down
```

## 5. Build and publish Docker images

The Kubernetes manifest currently expects these image names:
- `elandsmith1998/cinematch-backend:1.0`
- `elandsmith1998/cinematch-frontend:1.0`

Build them from the repository root:

```bash
docker build -t elandsmith1998/cinematch-backend:1.0 ./backend
docker build -t elandsmith1998/cinematch-frontend:1.0 ./frontend
docker image ls | grep cinematch
```

Log in to Docker Hub and push:

```bash
docker login
docker push elandsmith1998/cinematch-backend:1.0
docker push elandsmith1998/cinematch-frontend:1.0
```

Use your own Docker Hub namespace if those images are not yours, and update `k8s/deployment.yaml` accordingly. Never put Docker Hub passwords or access tokens in the repository or Jenkinsfile; use Jenkins credentials.

## 6. Install Minikube and kubectl (if needed)

Follow the current official installation instructions for your Ubuntu release:
- Minikube: https://minikube.sigs.k8s.io/docs/start/
- kubectl: https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/

Then verify:

```bash
minikube version
kubectl version --client
docker ps
```

Run all Minikube commands as the regular `ubuntu` user, not root. Start the single-node local learning cluster:

```bash
minikube start --driver=docker
minikube status
kubectl config current-context
kubectl get nodes
kubectl get pods -A
```

Expected: current context is `minikube` and the node eventually reports `Ready`.

## 7. Important Kubernetes Nginx configuration

The current `frontend/nginx.conf` points to `http://backend:5000/api/`, which matches the Docker Compose service name but not the Kubernetes service named `cinematch-backend`. Before deploying on Kubernetes, change the proxy target for the Kubernetes image to:

```nginx
location /api/ {
    proxy_pass http://cinematch-backend:5000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

Because the same image is currently used for Compose and Kubernetes, choose one of these approaches:
1. Use a separate Kubernetes Nginx config and Docker image tag; or
2. Rename the backend service in Kubernetes to `backend` so it matches the existing config.

The simplest for the existing manifest is to update `frontend/nginx.conf` for Kubernetes, rebuild and push the frontend image, then deploy it. If you still want Docker Compose, its Nginx service resolution will need to match the config too. Don't assume the app is fully working until you test both frontend and API requests.

## 8. Deploy to Kubernetes

After images are pushed and the Nginx service target matches the Kubernetes service:

```bash
cd ~/cinematch   # adjust to the actual repository folder
kubectl apply -f k8s/deployment.yaml
kubectl rollout status deployment/cinematch-backend --timeout=180s
kubectl rollout status deployment/cinematch-frontend --timeout=180s
kubectl get deployments
kubectl get pods
kubectl get services
```

Expected: backend and frontend pods are `Running` and ready. If a pod fails:

```bash
kubectl get pods
kubectl describe pod <pod-name>
kubectl logs <pod-name> --previous
kubectl logs <pod-name>
kubectl get events --sort-by=.lastTimestamp
```

Don't delete or repeatedly restart failing pods before checking their logs and events.

## 9. Access the frontend with port forwarding

Keep the port-forward process running in one EC2 terminal:

```bash
kubectl port-forward service/cinematch-frontend 8081:80
```

It should say it is forwarding from `127.0.0.1:8081` to port 80. **Keep this terminal open.**

In a second terminal on your Windows computer, use the private key stored on Windows to create an SSH tunnel. Replace the public IP and key path with your own values:

```powershell
ssh -i "D:\\Downloads\\Online-movie-key.pem" -o IdentitiesOnly=yes -L 8081:127.0.0.1:8081 ubuntu@YOUR_EC2_PUBLIC_IP
```

Then visit http://localhost:8081 in your browser. Do not run the Windows SSH command inside the Linux EC2 terminal. If OpenSSH rejects the key, restrict the PEM file's Windows ACL permissions and retry from PowerShell. Do not upload or share your private key. No inbound security-group rule for port 8081 is needed for this SSH-tunnel method; port 22 must be restricted to trusted source IPs.

## 10. Jenkins CI pipeline

The repository includes a `Jenkinsfile` with stages for:
1. Checking out the repository.
2. Running backend tests inside a Python container.
3. Building the Docker Compose images.

To set it up:
1. Open the Jenkins dashboard.
2. Select **New Item**, enter `CineMatch-CI`, and choose **Pipeline**.
3. Under **Pipeline**, select **Pipeline script from SCM**.
4. Select **Git**, enter `https://github.com/Elanchezhiya/Online-Movie-Recommendation.git`, set branch to `*/main`, and script path to `Jenkinsfile`.
5. Save and select **Build Now**.
6. Review **Console Output** if a stage fails.

Jenkins must have the required Docker access and must be able to run Docker commands. This repository's current pipeline **does not push images or deploy to Kubernetes**; those steps must be added and configured with credentials and safe cluster access before calling it a full CI/CD deployment pipeline. Do not run Jenkins as root simply to bypass permissions. Use least-privilege credentials and protect the Jenkins UI.

## 11. Useful operations

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
git pull --rebase origin main
git add README.md
git commit -m "docs: add setup and deployment guide"
git push origin main
```

## Troubleshooting quick reference

| Symptom | First diagnostic |
|---|---|
| `DRV_AS_ROOT` | Run Minikube as `ubuntu`, not root |
| Docker socket permission denied | Check `groups`, refresh login after adding `ubuntu` to `docker` |
| Frontend `CrashLoopBackOff` | Run `kubectl logs <pod> --previous` and `kubectl describe pod <pod>` |
| Frontend loads but API fails in Kubernetes | Verify Nginx proxy target resolves to `cinematch-backend:5000` |
| Git push rejected as non-fast-forward | Run `git fetch origin`, then `git pull --rebase origin main`; resolve conflicts before pushing |
| Windows SSH key rejected for permissions | Fix PEM ACLs in Windows PowerShell, then rerun SSH from Windows |
| Local port 8081 inaccessible | Keep both port-forward and SSH tunnel terminals open |

## Security notes

- Never commit private keys, access tokens, passwords, or `.env` secrets.
- Avoid exposing the Kubernetes API or Jenkins UI broadly to the internet.
- For demos, prefer SSH tunnelling instead of opening extra application ports.
- Keep Jenkins and OS packages updated.
- Minikube is suitable for learning and demonstrations; use a managed Kubernetes service such as EKS for production requirements.

## License

Add a `LICENSE` file if you intend to distribute the project under an open-source license.
