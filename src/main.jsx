import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import reactLogo from "./assets/react.svg";
import "./index.css";
import viteLogo from "/vite.svg";

function App() {
  const [count, setCount] = useState(0);
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
      <div className="flex space-x-4">
        <a href="https://vite.dev" target="_blank">
          <img
            src={viteLogo}
            className="h-24 p-6 transition-transform hover:scale-110"
            alt="Vite logo"
          />
        </a>
        <a href="https://react.dev" target="_blank">
          <img
            src={reactLogo}
            className="h-24 p-6 transition-transform hover:scale-110"
            alt="React logo"
          />
        </a>
      </div>
      <h1 className="text-5xl font-bold mt-8">Vite + React</h1>
      <div className="card mt-6 p-6 bg-gray-800 rounded-lg shadow-lg">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          onClick={() => setCount((count) => count + 1)}
        >
          count is {count}
        </button>
        <p className="mt-4 text-gray-400">
          Edit <code className="text-blue-400">src/main.jsx</code> and save to
          test HMR
        </p>
      </div>
      <p className="mt-6 text-gray-500">
        Click on the Vite and React logos to learn more
      </p>
      <div className="mt-8">
        <h2 className="text-2xl font-bold">Provider Accounts</h2>
        <ul className="mt-4 space-y-2">
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
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
