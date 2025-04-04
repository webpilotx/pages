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

function CreatePage({
  handleCreateNewPage,
  fetchAccounts,
  fetchRepositories,
  fetchBranches,
}) {
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
  const [loading, setLoading] = useState(false); // Loading state for repositories
  const [currentPage, setCurrentPage] = useState(1); // Current page for pagination
  const reposPerPage = 6; // Number of repositories per page

  const navigate = useNavigate();

  useEffect(() => {
    fetchAccounts()
      .then((fetchedAccounts) => {
        setAccounts(fetchedAccounts || []); // Ensure accounts is always an array
        if (fetchedAccounts?.length > 0) {
          setSelectedAccount(fetchedAccounts[0].login); // Automatically select the first account
          loadRepositories(fetchedAccounts[0].login);
        }
      })
      .catch((error) => {
        console.error("Error fetching accounts:", error);
        setAccounts([]); // Fallback to an empty array on error
      });
  }, [fetchAccounts]);

  const loadRepositories = (accountLogin) => {
    setLoading(true);
    fetchRepositories(accountLogin)
      .then((repos) => {
        setRepositories(repos || []); // Ensure repositories is always an array
        setCurrentPage(1); // Reset to the first page
      })
      .catch((error) => {
        console.error("Error fetching repositories:", error);
        setRepositories([]); // Fallback to an empty array on error
      })
      .finally(() => setLoading(false));
  };

  const handleAccountChange = (accountLogin) => {
    setSelectedAccount(accountLogin);
    loadRepositories(accountLogin);
  };

  const handleRepoSelect = (selectedRepo) => {
    setRepo(selectedRepo);
    fetchBranches(selectedRepo)
      .then((fetchedBranches) => {
        setBranches(fetchedBranches || []); // Ensure branches is always an array
        if (fetchedBranches?.length > 0) {
          setBranch(fetchedBranches[0]); // Default to the first branch
        }
      })
      .catch((error) => {
        console.error("Error fetching branches:", error);
        setBranches([]); // Fallback to an empty array on error
      });
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
    navigate("/pages");
  };

  // Pagination logic
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
            {loading ? (
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
                      title={repository.full_name} // Tooltip for full name
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
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Save and Deploy
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function PageDetails({
  selectedPage,
  branches,
  fetchBranches,
  handleSaveAndDeploy,
}) {
  const [branch, setBranch] = useState(selectedPage.branch || "");
  const [buildScript, setBuildScript] = useState(
    selectedPage.buildScript || ""
  );
  const [envVars, setEnvVars] = useState([{ name: "", value: "" }]);

  useEffect(() => {
    fetchBranches(selectedPage.repo);
  }, [selectedPage.repo, fetchBranches]);

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

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-4">Page Details</h2>
        <p>
          <strong>Repo:</strong> {selectedPage.repo}
        </p>
        <p>
          <strong>Name:</strong> {selectedPage.name}
        </p>
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
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          onClick={handleAddEnvVar}
          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
        >
          Add Env
        </button>
      </div>
      <button
        onClick={() => handleSaveAndDeploy(branch, buildScript, envVars)}
        disabled={!branch || !selectedPage.name}
        className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
      >
        Save and Deploy
      </button>
    </div>
  );
}

function DeploymentLogs({
  deployments,
  selectedDeployment,
  handleSelectDeployment,
  fetchDeploymentLog,
}) {
  const [logContent, setLogContent] = useState("");

  useEffect(() => {
    if (selectedDeployment) {
      fetchDeploymentLog(selectedDeployment.id).then(setLogContent);
    }
  }, [selectedDeployment, fetchDeploymentLog]);

  return (
    <div>
      <h3 className="text-xl font-bold mb-4">Deployment Logs</h3>
      <div className="mb-4">
        <ul className="space-y-2">
          {deployments.map((deployment) => (
            <li
              key={deployment.id}
              className={`p-4 bg-gray-100 rounded-md shadow-sm border cursor-pointer ${
                selectedDeployment?.id === deployment.id
                  ? "border-blue-500"
                  : "border-gray-300"
              }`}
              onClick={() => handleSelectDeployment(deployment)}
            >
              <p>
                <strong>Start Time:</strong>{" "}
                {new Date(deployment.createdAt).toLocaleString()}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                {deployment.exitCode === null
                  ? "Running"
                  : deployment.exitCode === 0
                  ? "Success"
                  : "Failed"}
              </p>
            </li>
          ))}
        </ul>
      </div>
      {selectedDeployment ? (
        <div className="p-4 bg-gray-200 text-black rounded-md overflow-y-auto max-h-96">
          <pre>{logContent || "No logs available for this deployment."}</pre>
        </div>
      ) : (
        <div className="text-center text-gray-500">No deployment selected.</div>
      )}
    </div>
  );
}

function PageDetailsWrapper({
  pagesList,
  fetchBranches,
  fetchDeployments,
  handleSaveAndDeploy,
}) {
  const [selectedPage, setSelectedPage] = useState(null);
  const [branches, setBranches] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [activeTab, setActiveTab] = useState("details");
  const navigate = useNavigate();

  const fetchPageData = (pageId) => {
    const page = pagesList.find((p) => p.id === pageId);
    if (page) {
      setSelectedPage(page);
      fetchBranches(page.repo);
      fetchDeployments(page.id);
    }
  };

  useEffect(() => {
    const pageId = window.location.pathname.split("/").pop();
    fetchPageData(pageId);
  }, [pagesList]);

  const handleBackToPagesList = () => {
    navigate("/pages");
  };

  return (
    selectedPage && (
      <div>
        <button
          onClick={handleBackToPagesList}
          className="mb-4 px-4 py-2 bg-gray-300 text-black rounded-md hover:bg-gray-400"
        >
          Back to Pages List
        </button>
        <div className="mt-8 p-6 bg-gray-100 rounded-md shadow-lg">
          <div className="mb-4">
            <div className="flex space-x-4 border-b border-gray-300">
              <button
                onClick={() => setActiveTab("details")}
                className={`px-4 py-2 ${
                  activeTab === "details"
                    ? "border-b-2 border-blue-500 text-blue-500"
                    : "text-gray-500"
                }`}
              >
                Page Details
              </button>
              <button
                onClick={() => setActiveTab("logs")}
                className={`px-4 py-2 ${
                  activeTab === "logs"
                    ? "border-b-2 border-blue-500 text-blue-500"
                    : "text-gray-500"
                }`}
              >
                Deployment Logs
              </button>
            </div>
          </div>
          {activeTab === "details" && (
            <PageDetails
              selectedPage={selectedPage}
              branches={branches}
              fetchBranches={fetchBranches}
              handleSaveAndDeploy={handleSaveAndDeploy}
            />
          )}
          {activeTab === "logs" && (
            <DeploymentLogs
              deployments={deployments}
              selectedDeployment={selectedDeployment}
              handleSelectDeployment={setSelectedDeployment}
              fetchDeploymentLog={(id) => {}}
            />
          )}
        </div>
      </div>
    )
  );
}

function App() {
  const [pagesList, setPagesList] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [branches, setBranches] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [activeTab, setActiveTab] = useState("details");

  const fetchPagesList = async () => {
    try {
      const response = await fetch("/pages/api/pages-list");
      const data = await response.json();
      setPagesList(data);
    } catch (error) {
      console.error("Error fetching pages list:", error);
    }
  };

  const fetchBranches = async (repoFullName) => {
    try {
      const response = await fetch(`/pages/api/branches?repo=${repoFullName}`);
      const data = await response.json();
      setBranches(data.branches);
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const fetchDeployments = async (pageId) => {
    try {
      const response = await fetch(`/pages/api/deployments?pageId=${pageId}`);
      if (response.ok) {
        const data = await response.json();
        setDeployments(data);
      } else {
        console.error("Failed to fetch deployments.");
      }
    } catch (error) {
      console.error("Error fetching deployments:", error);
    }
  };

  const fetchDeploymentLog = async (deploymentId) => {
    try {
      const response = await fetch(
        `/pages/api/deployment-log?deploymentId=${deploymentId}`
      );
      if (response.ok) {
        return await response.text();
      } else {
        console.error("Failed to fetch deployment logs.");
        return "Failed to fetch deployment logs.";
      }
    } catch (error) {
      console.error("Error fetching deployment log:", error);
      return "Error fetching deployment log.";
    }
  };

  const handleSaveAndDeploy = async (branch, buildScript, envVars) => {
    try {
      if (!selectedPage.repo) {
        alert("Repository is not selected.");
        return;
      }

      const response = await fetch("/pages/api/save-and-deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedRepo: { full_name: selectedPage.repo }, // Pass repo full_name
          pageName: selectedPage.name,
          branch,
          buildScript,
          envVars,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error during save and deploy:", errorData);
        alert("Failed to save and deploy: " + errorData.error);
        return;
      }

      const data = await response.json();
      console.log("Page saved and deployment triggered successfully:", data);

      await fetchPagesList();
      await fetchDeployments(selectedPage.id);
      setActiveTab("logs");
    } catch (error) {
      console.error("Error during save and deploy:", error);
      alert("Failed to save and deploy: " + error.message);
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

      await fetchPagesList();
    } catch (error) {
      console.error("Error creating page:", error);
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

  useEffect(() => {
    fetchPagesList();
  }, []);

  const handleSelectPage = (page) => {
    setSelectedPage(page);
    fetchBranches(page.repo);
    fetchDeployments(page.id);
    setActiveTab("details");
  };

  const handleBackToPagesList = () => {
    setSelectedPage(null);
    setActiveTab("details");
  };

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
                <PagesList
                  pagesList={pagesList}
                  handleSelectPage={handleSelectPage}
                />
              }
            />
            <Route
              path="/pages/new"
              element={
                <CreatePage
                  handleCreateNewPage={handleCreateNewPage}
                  fetchAccounts={fetchAccounts}
                  fetchRepositories={fetchRepositories}
                  fetchBranches={fetchBranches}
                />
              }
            />
            <Route
              path="/pages/:id"
              element={
                <PageDetailsWrapper
                  pagesList={pagesList}
                  fetchBranches={fetchBranches}
                  fetchDeployments={fetchDeployments}
                  handleSaveAndDeploy={handleSaveAndDeploy}
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
let root;

// Check if the root already exists
if (!container._reactRootContainer) {
  root = createRoot(container); // Create a new root if it doesn't exist
} else {
  root = container._reactRootContainer._internalRoot.current; // Reuse the existing root
}

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
