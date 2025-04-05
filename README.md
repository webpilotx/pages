# Pages Deployment System

This project is a deployment system for managing and deploying pages from GitHub repositories. Below is an explanation of the required environment variables and the rationale for using your own GitHub OAuth app.

## Environment Variables

The following environment variables are required for the system to function properly:

### General Configuration

- **`DB_FILE_NAME`**: The path to the SQLite database file used by the application.
- **`PAGES_DIR`**: The directory where pages and deployments are stored.
- **`PORT`**: The port on which the server will run (default: `3000`).

### GitHub OAuth Configuration

- **`VITE_GITHUB_CLIENT_ID`**: The client ID of your GitHub OAuth app.
- **`GITHUB_CLIENT_SECRET`**: The client secret of your GitHub OAuth app.

### Optional Variables

- **`NODE_ENV`**: The environment in which the application is running (`development` or `production`).
- **`VITE_TITLE`**: The title of the application (used in the frontend).

## Why Use Your Own GitHub OAuth App?

To protect your privacy, this system requires you to provide your own GitHub OAuth app credentials. By using your own OAuth app:

1. **Data Privacy**: Your GitHub account and repositories remain private, as no third-party service has access to your credentials.
2. **Control**: You have full control over the permissions and scope of the OAuth app.
3. **Security**: You can revoke access or rotate credentials at any time without affecting other users.

### How to Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers).
2. Click on **"New OAuth App"**.
3. Fill in the required fields:
   - **Application name**: Choose a name for your app.
   - **Homepage URL**: Set this to the URL where your app is hosted (e.g., `http://localhost:3000` for local development).
   - **Authorization callback URL**: Set this to `http://<your-domain>/pages/api/github/callback` (replace `<your-domain>` with your actual domain or `localhost:3000` for local development).
4. Click **"Register application"**.
5. Copy the **Client ID** and **Client Secret** and set them as the values for `VITE_GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in your environment variables.

## Getting Started

1. Clone the repository.
2. Install dependencies using `npm install`.
3. Set up the required environment variables in a `.env` file.
4. Start the server using `npm start`.

For more details, refer to the source code and comments.

## Features

### Backend

- **Provider Accounts**: Manage GitHub accounts for fetching repositories and branches.
- **Pages Management**: Create, edit, and delete pages with associated repositories, branches, and environment variables.
- **Deployments**: Trigger deployments for pages, stream logs, and manage deployment statuses.
- **Environment Variables**: Configure environment variables for each page.
- **Systemd Integration**: Automatically create and manage systemd services for deployed pages.

### Frontend

- **Pages List**: View all pages with their repository and branch information.
- **Create Page**: Select a repository, branch, and configure environment variables to create a new page.
- **Edit Page**: Update page details, including branch, build script, and environment variables.
- **Deployment Logs**: View logs for each deployment, with real-time streaming for ongoing deployments.
- **Settings**: Delete pages and associated resources.

## API Endpoints

### Provider Accounts

- `GET /pages/api/provider-accounts`: Fetch connected GitHub accounts.

### Pages

- `GET /pages/api/pages-list`: Fetch the list of pages.
- `POST /pages/api/create-page`: Create a new page.
- `POST /pages/api/save-and-deploy`: Save and deploy a page.
- `DELETE /pages/api/pages/:id`: Delete a page and its associated resources.

### Repositories and Branches

- `GET /pages/api/repositories`: Fetch repositories for connected accounts.
- `GET /pages/api/branches`: Fetch branches for a selected repository.

### Deployments

- `GET /pages/api/deployments`: Fetch deployments for a page.
- `GET /pages/api/deployment-log-stream`: Stream logs for a deployment.
- `GET /pages/:pageId/deployments/:deploymentId`: Fetch details for a specific deployment.

### Environment Variables

- `GET /pages/api/env-vars`: Fetch environment variables for a page.

## Frontend Features

### Pages List

- Displays all pages with their repository and branch information.
- Navigate to edit, logs, or settings for each page.

### Create Page

- Select a GitHub account and repository.
- Choose a branch and configure environment variables.
- Add a build script (optional).
- Save and deploy the page.

### Edit Page

- Update branch, build script, and environment variables.
- Save changes and trigger a new deployment.

### Deployment Logs

- View logs for each deployment.
- Real-time log streaming for ongoing deployments.

### Settings

- Delete a page and its associated resources, including deployments, logs, and systemd services.

## Systemd Integration

- Automatically creates a systemd service for each deployed page.
- Manages the lifecycle of the service (start, stop, enable, disable).

## Development

### Prerequisites

- Node.js
- Git
- Systemd (for service management)

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/your-repo/pages-deployment-system.git
   cd pages-deployment-system
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables in a `.env` file:

   ```env
   DB_FILE_NAME=path/to/database.sqlite
   PAGES_DIR=/path/to/pages
   VITE_GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Running the Worker

The worker is automatically triggered during deployments to handle cloning, building, and starting services.

## Deployment

1. Build the frontend:

   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## License

This project is licensed under the MIT License.
