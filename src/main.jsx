import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

function App() {
  const [providerAccounts, setProviderAccounts] = useState([]);
  const [pagesList, setPagesList] = useState([]);
  const [repositories, setRepositories] = useState([]);
  const [showRepositories, setShowRepositories] = useState(false);

  useEffect(() => {
    async function fetchProviderAccounts() {
      try {
        const response = await fetch("/pages/api/provider-accounts");
        const data = await response.json();
        setProviderAccounts(data);
      } catch (error) {
        console.error("Error fetching provider accounts:", error);
      }
    }

    async function fetchPagesList() {
      try {
        const response = await fetch("/pages/api/pages-list");
        const data = await response.json();
        setPagesList(data);
      } catch (error) {
        console.error("Error fetching pages list:", error);
      }
    }

    fetchProviderAccounts();
    fetchPagesList();
  }, []);

  const handleFetchRepositories = async () => {
    try {
      const response = await fetch("/pages/api/repositories");
      const data = await response.json();
      setRepositories(data);
      setShowRepositories(true);
    } catch (error) {
      console.error("Error fetching repositories:", error);
    }
  };

  const handleConnectGitProvider = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    if (!clientId) {
      console.error(
        "GitHub Client ID is not defined in the environment variables."
      );
      return;
    }
    // Redirect to GitHub's OAuth or connection URL
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      {/* Navigation Bar */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-3 flex items-center">
          <a
            href="/"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Home
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Provider Accounts</h1>
        <ul className="space-y-4">
          {providerAccounts.map((account) => (
            <li
              key={account.providerAccountId}
              className="p-4 bg-gray-800 rounded-md shadow-sm border border-gray-700"
            >
              <p>
                <strong>Provider:</strong> {account.provider}
              </p>
              <p>
                <strong>Type:</strong> {account.type}
              </p>
            </li>
          ))}
        </ul>

        <h1 className="text-3xl font-bold mt-12 mb-6">Pages List</h1>
        <button
          onClick={handleFetchRepositories}
          className="mb-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Create
        </button>
        <ul className="space-y-4">
          {pagesList.map((page) => (
            <li
              key={page.id}
              className="p-4 bg-gray-800 rounded-md shadow-sm border border-gray-700"
            >
              <p>
                <strong>Repo:</strong> {page.repo}
              </p>
              <p>
                <strong>Name:</strong> {page.name}
              </p>
              <p>
                <strong>Branch:</strong> {page.branch}
              </p>
              <p>
                <strong>Build Script:</strong> {page.buildScript}
              </p>
            </li>
          ))}
        </ul>

        {showRepositories && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Available Repositories</h2>
            <button
              onClick={handleConnectGitProvider}
              className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Connect to GitHub
            </button>
            <ul className="space-y-4">
              {repositories.map((repo) => (
                <li
                  key={repo.providerAccountId}
                  className="p-4 bg-gray-800 rounded-md shadow-sm border border-gray-700"
                >
                  <p>
                    <strong>Provider:</strong> {repo.provider}
                  </p>
                  <p>
                    <strong>Repository ID:</strong> {repo.providerAccountId}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
