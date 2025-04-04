import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

function App() {
  const [pagesList, setPagesList] = useState([]);
  const [repositories, setRepositories] = useState([]);
  const [totalRepositories, setTotalRepositories] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const repositoriesPerPage = 10;

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

    fetchPagesList();
  }, []);

  const fetchRepositories = async (page = 1) => {
    try {
      const response = await fetch(
        `/pages/api/repositories?page=${page}&limit=${repositoriesPerPage}`
      );
      const data = await response.json();
      setRepositories(data.repositories);
      setTotalRepositories(data.total);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching repositories:", error);
    }
  };

  useEffect(() => {
    fetchRepositories(currentPage);
  }, [currentPage]);

  const handlePageChange = (newPage) => {
    fetchRepositories(newPage);
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

        <h1 className="text-3xl font-bold mt-12 mb-6">Repositories</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {repositories.map((repo) => (
            <div
              key={repo.id}
              className="p-4 bg-gray-800 rounded-md shadow-sm border border-gray-700"
            >
              <p className="font-bold">{repo.full_name}</p>{" "}
              {/* Display full_name */}
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-center mt-6 space-x-4">
          {Array.from(
            { length: Math.ceil(totalRepositories / repositoriesPerPage) },
            (_, index) => (
              <button
                key={index + 1}
                onClick={() => handlePageChange(index + 1)}
                className={`px-4 py-2 rounded-md ${
                  currentPage === index + 1
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {index + 1}
              </button>
            )
          )}
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
