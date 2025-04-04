import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Link,
  Route,
  BrowserRouter as Router,
  Routes,
  useNavigate,
} from "react-router-dom";
import "./index.css";

function PagesList({ pagesList, handleSelectPage }) {
  const navigate = useNavigate();

  const handlePageClick = (page) => {
    handleSelectPage(page);
    navigate(`/pages/${page.id}`);
  };

  const handleCreatePage = () => {
    navigate("/pages/new");
  };

  return (
    <>
      <h1 className="text-3xl font-bold mt-12 mb-6">Pages List</h1>
      <ul className="space-y-4">
        {pagesList.map((page) => (
          <li
            key={page.id}
            className="p-4 bg-gray-100 rounded-md shadow-sm border border-gray-300 cursor-pointer hover:bg-gray-200"
            onClick={() => handlePageClick(page)}
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
          </li>
        ))}
      </ul>
      <button
        onClick={handleCreatePage}
        className="mt-8 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
      >
        Create
      </button>
    </>
  );
}

function CreatePage() {
  const [step, setStep] = useState(1);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [repo, setRepo] = useState("");
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [branches, setBranches] = useState([]);
  const [buildScript, setBuildScript] = useState("");
  const [envVars, setEnvVars] = useState([{ name: "", value: "" }]);
  const [accounts, setAccounts] = useState([]);
  const [repositories, setRepositories] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const reposPerPage = 6;

  const navigate = useNavigate();

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/pages/api/provider-accounts");
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching accounts:", error);
      return [];
    }
  };

  const fetchRepositories = async (accountLogin) => {
    try {
      const response = await fetch(
        `/pages/api/repositories?account=${accountLogin}`
      );
      const data = await response.json();
      return data.repositories;
    } catch (error) {
      console.error("Error fetching repositories:", error);
      return [];
    }
  };

  const fetchBranches = async (repoFullName) => {
    try {
      const response = await fetch(`/pages/api/branches?repo=${repoFullName}`);
      const data = await response.json();
      return data.branches;
    } catch (error) {
      console.error("Error fetching branches:", error);
      return [];
    }
  };

  const handleCreateNewPage = async (newPage) => {
    try {
      const response = await fetch("/pages/api/create-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPage),
      });

      if (!response.ok) {
        throw new Error("Failed to create page");
      }

      navigate("/pages");
    } catch (error) {
      console.error("Error creating page:", error);
    }
  };

  useEffect(() => {
    fetchAccounts()
      .then((fetchedAccounts) => {
        setAccounts(fetchedAccounts || []);
        if (fetchedAccounts?.length > 0) {
          setSelectedAccount(fetchedAccounts[0].login);
        }
      })
      .catch((error) => {
        console.error("Error fetching accounts:", error);
        setAccounts([]);
      });
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      setLoadingRepos(true);
      fetchRepositories(selectedAccount)
        .then((repos) => {
          setRepositories(repos || []);
          setCurrentPage(1);
        })
        .catch((error) => {
          console.error("Error fetching repositories:", error);
          setRepositories([]);
        })
        .finally(() => setLoadingRepos(false));
    }
  }, [selectedAccount]);

  useEffect(() => {
    if (repo) {
      setLoadingBranches(true);
      fetchBranches(repo)
        .then((fetchedBranches) => {
          setBranches(fetchedBranches || []);
          if (fetchedBranches?.length > 0) {
            setBranch(fetchedBranches[0]);
          } else {
            setBranch("");
          }
        })
        .catch((error) => {
          console.error("Error fetching branches:", error);
          setBranches([]);
          setBranch("");
        })
        .finally(() => setLoadingBranches(false));
    }
  }, [repo]);

  const handleAccountChange = (accountLogin) => {
    setSelectedAccount(accountLogin);
  };

  const handleRepoSelect = (selectedRepo) => {
    if (repo !== selectedRepo) {
      setRepo(selectedRepo);
    }
  };

  const handleAddEnvVar = () => {
    setEnvVars([...envVars, { name: "", value: "" }]);
  };

  const handleRemoveEnvVar = (index) => {
    const updatedEnvVars = envVars.filter((_, i) => i !== index);
    setEnvVars(updatedEnvVars);
  };

  const handleEnvVarChange = (index, field, value) => {
    const updatedEnvVars = [...envVars];
    updatedEnvVars[index][field] = value;
    setEnvVars(updatedEnvVars);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleCreateNewPage({ repo, name, branch, buildScript, envVars });
  };

  const indexOfLastRepo = currentPage * reposPerPage;
  const indexOfFirstRepo = indexOfLastRepo - reposPerPage;
  const currentRepos = repositories.slice(indexOfFirstRepo, indexOfLastRepo);

  const totalPages = Math.ceil(repositories.length / reposPerPage);

  return (
    <div className="mt-8 p-6 bg-gray-100 rounded-md shadow-lg">
      {step === 1 && (
        <>
          <h2 className="text-2xl font-bold mb-4">Choose Repository</h2>
          <div>
            <label className="block mb-2">Provider Account</label>
            <select
              value={selectedAccount}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="w-full px-4 py-2 bg-gray-200 text-black rounded-md"
              required
            >
              <option value="" disabled>
                Select an account
              </option>
              {accounts.map((account) => (
                <option key={account.login} value={account.login}>
                  {account.login}
                </option>
              ))}
            </select>
            <a
              href={`https://github.com/login/oauth/authorize?client_id=${
                import.meta.env.VITE_GITHUB_CLIENT_ID
              }&scope=repo`}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-2 text-blue-500 hover:underline"
            >
              Authorize more GitHub accounts
            </a>
          </div>
          <div className="mt-6">
            <label className="block mb-2">Repository</label>
            {loadingRepos ? (
              <p className="text-center text-gray-500">
                Loading repositories...
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {currentRepos.map((repository) => (
                    <div
                      key={repository.full_name}
                      className={`p-4 bg-gray-100 rounded-md shadow-sm border cursor-pointer ${
                        repo === repository.full_name
                          ? "border-blue-500"
                          : "border-gray-300"
                      }`}
                      onClick={() => handleRepoSelect(repository.full_name)}
                      title={repository.full_name}
                    >
                      <span className="block truncate">
                        {repository.full_name}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-center space-x-2">
                  {Array.from({ length: totalPages }, (_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPage(index + 1)}
                      className={`px-3 py-1 rounded-md ${
                        currentPage === index + 1
                          ? "bg-blue-500 text-white"
                          : "bg-gray-300 text-black"
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => setStep(2)}
            disabled={!repo}
            className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            Begin Setup
          </button>
        </>
      )}
      {step === 2 && (
        <>
          {loadingBranches ? (
            <p className="text-center text-gray-500">Fetching branches...</p>
          ) : branches.length > 0 ? (
            <form onSubmit={handleSubmit}>
              <h2 className="text-2xl font-bold mb-4">Setup Page Details</h2>
              <div className="mb-4">
                <label className="block mb-2">Page Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-200 text-black rounded-md"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2">Branch</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-200 text-black rounded-md"
                  required
                >
                  <option value="" disabled>
                    Select a branch
                  </option>
                  {branches.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block mb-2">Build Script (Optional)</label>
                <textarea
                  value={buildScript}
                  onChange={(e) => setBuildScript(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-200 text-black rounded-md"
                  rows="4"
                ></textarea>
              </div>
              <div className="mb-4">
                <label className="block mb-2">Environment Variables</label>
                {envVars.map((env, index) => (
                  <div key={index} className="flex space-x-4 mb-2">
                    <input
                      type="text"
                      placeholder="Name"
                      value={env.name}
                      onChange={(e) =>
                        handleEnvVarChange(index, "name", e.target.value)
                      }
                      className="w-1/2 px-4 py-2 bg-gray-200 text-black rounded-md"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      value={env.value}
                      onChange={(e) =>
                        handleEnvVarChange(index, "value", e.target.value)
                      }
                      className="w-1/2 px-4 py-2 bg-gray-200 text-black rounded-md"
                      required
                    />
                    <button
                      onClick={() => handleRemoveEnvVar(index)}
                      type="button"
                      className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleAddEnvVar}
                  type="button"
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                >
                  Add Env
                </button>
              </div>
              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  type="button"
                  className="px-4 py-2 bg-gray-300 text-black rounded-md hover:bg-gray-400"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!name || !branch}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                  Save and Deploy
                </button>
              </div>
            </form>
          ) : (
            <p className="text-center text-gray-500">
              No branches available for the selected repository.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function PageDetails({ pageId }) {
  return (
    <div className="mt-8 p-6 bg-gray-100 rounded-md shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Page Details</h2>
      <p>Details for page ID: {pageId}</p>
    </div>
  );
}

function App() {
  const [pagesList, setPagesList] = useState([]);

  const fetchPagesList = async () => {
    try {
      const response = await fetch("/pages/api/pages-list");
      const data = await response.json();
      setPagesList(data);
    } catch (error) {
      console.error("Error fetching pages list:", error);
    }
  };

  useEffect(() => {
    fetchPagesList();
  }, []);

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-white text-black">
        <nav className="bg-gray-200 border-b border-gray-300">
          <div className="container mx-auto px-4 py-3 flex items-center">
            <Link
              to="/pages"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Home
            </Link>
          </div>
        </nav>
        <main className="flex-grow container mx-auto px-4 py-8">
          <Routes>
            <Route
              path="/pages"
              element={
                <PagesList pagesList={pagesList} handleSelectPage={() => {}} />
              }
            />
            <Route path="/pages/new" element={<CreatePage />} />
            <Route
              path="/pages/:id"
              element={
                <PageDetails
                  pageId={window.location.pathname.split("/").pop()}
                />
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
