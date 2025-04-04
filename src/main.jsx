import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

function App() {
  const [providerAccounts, setProviderAccounts] = useState([]);

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

    fetchProviderAccounts();
  }, []);

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
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
