# Pages Deployment System

This project is a deployment system for managing pages, repositories, and deployments. It includes a backend API and a frontend client for interacting with the system.

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
