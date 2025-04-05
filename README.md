# Pages Deployment Manager

This web application is a deployment management tool for GitHub repositories. It allows users to create, manage, and deploy static or dynamic web pages with ease. The app integrates with GitHub to fetch repositories, branches, and manage deployments using worker threads and systemd services.

## Features

- **GitHub Integration**:

  - Connect GitHub accounts to fetch repositories and branches.
  - OAuth-based authentication for managing multiple accounts.

- **Page Management**:

  - Create new pages by selecting a repository, branch, and optional build script.
  - Edit existing pages, including updating environment variables and build scripts.
  - Delete pages, including all associated deployments and files.

- **Environment Variables**:

  - Add, edit, and remove environment variables for each page.
  - Automatically generate `.env` files for deployments.

- **Deployment Management**:

  - Trigger deployments for pages using worker threads.
  - View deployment logs in real-time via a streaming API.
  - Monitor deployment statuses (e.g., running, success, or failure).

- **Systemd Integration**:

  - Automatically create and manage user-level systemd services for deployed pages.
  - Restart services after deployments.

- **Logs and History**:
  - View deployment logs for each page.
  - Access historical deployment records.

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-repo/pages-deployment-manager.git
   cd pages-deployment-manager
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:

   ```env
   DB_FILE_NAME=path/to/your/database.sqlite
   PAGES_DIR=/path/to/pages/directory
   VITE_GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   PORT=3000
   ```

4. Run database migrations:

   ```bash
   npx drizzle-kit migrate
   ```

5. Start the development server:
   ```bash
   pnpm run dev
   ```

## Usage

1. **Connect GitHub Accounts**:

   - Navigate to `/pages` and authorize your GitHub account.
   - Fetch repositories and branches for deployment.

2. **Create a Page**:

   - Select a repository and branch.
   - Optionally, provide a build script and environment variables.
   - Save and deploy the page.

3. **Manage Pages**:

   - Edit page details, including build scripts and environment variables.
   - View deployment logs and statuses.
   - Delete pages and associated resources.

4. **Monitor Deployments**:
   - View real-time logs for active deployments.
   - Check deployment history for completed tasks.

## API Endpoints

- **Provider Accounts**: `/pages/api/provider-accounts`
- **Pages List**: `/pages/api/pages-list`
- **Repositories**: `/pages/api/repositories`
- **Branches**: `/pages/api/branches`
- **Create Page**: `/pages/api/create-page`
- **Save and Deploy**: `/pages/api/save-and-deploy`
- **Deployments**: `/pages/api/deployments`
- **Deployment Logs**: `/pages/api/deployment-log-stream`

## Technologies Used

- **Frontend**: React, React Router
- **Backend**: Express, Drizzle ORM, Worker Threads
- **Database**: SQLite
- **Deployment**: Systemd services
- **Version Control**: GitHub API integration

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request with your changes.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
