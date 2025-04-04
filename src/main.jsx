import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

function App() {
  const [pagesList, setPagesList] = useState([]);
  const [providerAccounts, setProviderAccounts] = useState([]);
  const [repositories, setRepositories] = useState([]);
  const [selectedProviderAccount, setSelectedProviderAccount] = useState(null);
  const [showStep, setShowStep] = useState(1); // Step 1: Choose provider account, Step 2: Choose repo

  useEffect(() => {
    async function fetchPagesList() {
      try {
        const response = await fetch("/pages/api/pages-list");
        const data = await response.json();
        setPagesList(data);
      } catch (error) {
        console.error("Error fetching pages list:", error);
      }
    }

    async function fetchProviderAccounts() {
      try {
        const response = await fetch("/pages/api/provider-accounts");
        const data = await response.json();
        setProviderAccounts(data);
      } catch (error) {
        console.error("Error fetching provider accounts:", error);
      }
    }

    fetchPagesList();
    fetchProviderAccounts();
  }, []);

  const handleFetchRepositories = async (providerAccountId) => {
    try {
      const response = await fetch(
        `/pages/api/repositories?providerAccountId=${providerAccountId}`
      );
      const data = await response.json();
      setRepositories(data);
      setShowStep(2); // Move to Step 2
    } catch (error) {
      console.error("Error fetching repositories:", error);
    }
  };

  const handleSelectProviderAccount = (providerAccountId) => {
    setSelectedProviderAccount(providerAccountId);
    handleFetchRepositories(providerAccountId);
  };

  const handleSelectRepository = (repositoryId) => {
    console.log(
      `Selected repository: ${repositoryId} for provider account: ${selectedProviderAccount}`
    );
    // Add logic to finalize the creation process
    setShowStep(1); // Reset to Step 1 after completion
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
        <h1 className="text-3xl font-bold mt-12 mb-6">Pages List</h1>
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

        <h1 className="text-3xl font-bold mt-12 mb-6">Create Page</h1>
        {showStep === 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">
              Step 1: Choose Provider Account
            </h2>
            <ul className="space-y-4">
              {providerAccounts.map((account) => (
                <li
                  key={account.login}
                  className="p-4 bg-gray-800 rounded-md shadow-sm border border-gray-700 cursor-pointer hover:bg-gray-700"
                  onClick={() => handleSelectProviderAccount(account.login)}
                >
                  <p>
                    <strong>Login:</strong> {account.login}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {showStep === 2 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">
              Step 2: Choose Repository
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {repositories.map((repo) => (
                <div
                  key={repo.id}
                  className="p-4 bg-gray-800 rounded-md shadow-sm border border-gray-700 cursor-pointer hover:bg-gray-700"
                  onClick={() => handleSelectRepository(repo.id)}
                >
                  <p className="font-bold">{repo.name}</p>
                </div>
              ))}
            </div>
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
