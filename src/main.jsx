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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-6">Provider Accounts</h1>
      <ul className="space-y-4">
        {providerAccounts.map((account) => (
          <li
            key={account.providerAccountId}
            className="p-4 bg-gray-800 rounded-lg shadow-md"
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
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
