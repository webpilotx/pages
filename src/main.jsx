import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

function App() {
  const [pagesList, setPagesList] = useState([]);
  const [repositories, setRepositories] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [createStep, setCreateStep] = useState(1); // Step 1: Choose repo, Step 2: Enter details
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [branches, setBranches] = useState([]);
  const [pageName, setPageName] = useState("");
  const [branch, setBranch] = useState("");
  const [buildScript, setBuildScript] = useState("");
  const [envVars, setEnvVars] = useState([{ name: "", value: "" }]);
  const [editPage, setEditPage] = useState(null); // Page being edited
  const repositoriesPerPage = 12; // Display 12 repositories per page
  const [activeTab, setActiveTab] = useState("details"); // Track the active tab
  const [deploymentLogs, setDeploymentLogs] = useState(""); // Store deployment logs
  const [deployments, setDeployments] = useState([]); // Store deployments list
  const [selectedDeployment, setSelectedDeployment] = useState(null); // Selected deployment
  const [isLoadingLog, setIsLoadingLog] = useState(false); // Loading indicator for logs

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

    async function fetchAllRepositories() {
      try {
        const response = await fetch("/pages/api/repositories");
        const data = await response.json();
        setRepositories(data.repositories); // Store all repositories
      } catch (error) {
        console.error("Error fetching repositories:", error);
      }
    }

    fetchAllRepositories();
  }, []);

  const fetchBranches = async (repoFullName) => {
    try {
      const response = await fetch(`/pages/api/branches?repo=${repoFullName}`);
      const data = await response.json();
      setBranches(data.branches);
      if (data.branches.length > 0) {
        setBranch(data.branches[0]); // Set the first branch as the default
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const fetchDeploymentLogs = async (pageId) => {
    try {
      const response = await fetch(`/pages/deployments/${pageId}.log`);
      if (response.ok) {
        const logs = await response.text();
        setDeploymentLogs(logs);
      } else {
        setDeploymentLogs("Failed to fetch deployment logs.");
      }
    } catch (error) {
      console.error("Error fetching deployment logs:", error);
      setDeploymentLogs("Error fetching deployment logs.");
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

  const fetchDeploymentLog = async (deploymentId, isRunning) => {
    try {
      setIsLoadingLog(true);
      const response = await fetch(
        `/pages/api/deployment-log?deploymentId=${deploymentId}`
      );
      if (response.ok) {
        const logs = await response.text();
        setDeploymentLogs(logs);

        // If the deployment is still running, poll for updates
        if (isRunning) {
          const interval = setInterval(async () => {
            const updatedResponse = await fetch(
              `/pages/api/deployment-log?deploymentId=${deploymentId}`
            );
            if (updatedResponse.ok) {
              const updatedLogs = await updatedResponse.text();
              setDeploymentLogs(updatedLogs);
            } else {
              clearInterval(interval);
            }
          }, 3000); // Poll every 3 seconds
        }
      } else {
        setDeploymentLogs("Failed to fetch deployment logs.");
      }
    } catch (error) {
      console.error("Error fetching deployment log:", error);
      setDeploymentLogs("Error fetching deployment log.");
    } finally {
      setIsLoadingLog(false);
    }
  };

  const handleSelectRepo = (repo) => {
    setSelectedRepo(repo);
    fetchBranches(repo.full_name); // Fetch branches for the selected repository
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

  const handleSaveAndDeploy = async () => {
    try {
      const response = await fetch("/pages/api/save-and-deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedRepo: editPage || selectedRepo,
          pageName,
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

      alert("Page saved and deployed successfully!");
      setShowCreatePage(false); // Close the create page modal
      setEditPage(null); // Reset edit mode
      fetchPagesList(); // Refresh the pages list
    } catch (error) {
      console.error("Error during save and deploy:", error);
      alert("Failed to save and deploy: " + error.message);
    }
  };

  const handleEditPage = (page) => {
    setEditPage(page);
    setPageName(page.name);
    setBranch(page.branch);
    setBuildScript(page.buildScript || "");
    setEnvVars([]); // Fetch env vars for the page (if needed)
    fetchBranches(page.repo); // Fetch branches for the selected page's repository
    fetchDeploymentLogs(page.id); // Fetch deployment logs for the page
    fetchDeployments(page.id); // Fetch deployments for the page
    setShowCreatePage(true);
    setCreateStep(2); // Skip to Step 2 for editing
    setActiveTab("details"); // Default to the details tab
  };

  const handleSelectDeployment = (deployment) => {
    setSelectedDeployment(deployment);
    fetchDeploymentLog(deployment.id, deployment.exitCode === null);
  };

  // Calculate the repositories to display for the current page
  const paginatedRepositories = repositories.slice(
    (currentPage - 1) * repositoriesPerPage,
    currentPage * repositoriesPerPage
  );

  const totalPages = Math.ceil(repositories.length / repositoriesPerPage);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage); // Update the current page
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-black">
      {/* Navigation Bar */}
      <nav className="bg-gray-200 border-b border-gray-300">
        <div className="container mx-auto px-4 py-3 flex items-center">
          <a
            href="/"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
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
              className="p-4 bg-gray-100 rounded-md shadow-sm border border-gray-300 cursor-pointer hover:bg-gray-200"
              onClick={() => handleEditPage(page)}
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
          onClick={() => {
            setEditPage(null);
            setPageName("");
            setBranch("");
            setBuildScript("");
            setEnvVars([{ name: "", value: "" }]);
            setSelectedRepo(null);
            setShowCreatePage(true);
            setCreateStep(1);
          }}
          className="mt-8 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
        >
          Create
        </button>

        {showCreatePage && (
          <div className="mt-8 p-6 bg-gray-100 rounded-md shadow-lg">
            {createStep === 1 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">
                  Step 1: Choose Repository
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {paginatedRepositories.map((repo) => (
                    <div
                      key={repo.id}
                      className={`p-4 bg-gray-200 rounded-md shadow-sm border ${
                        selectedRepo?.id === repo.id
                          ? "border-blue-500"
                          : "border-gray-300"
                      } cursor-pointer hover:bg-gray-300`}
                      onClick={() => handleSelectRepo(repo)}
                    >
                      <p className="font-bold truncate">{repo.full_name}</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-6">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-gray-200 text-gray-500 rounded-md hover:bg-gray-300 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-gray-200 text-gray-500 rounded-md hover:bg-gray-300 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <button
                  onClick={() => setCreateStep(2)}
                  disabled={!selectedRepo}
                  className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                  Begin Setup
                </button>
              </div>
            )}

            {createStep === 2 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">
                  {editPage ? "Edit Page" : "Step 2: Enter Page Details"}
                </h2>
                {editPage && (
                  <div className="mb-4">
                    <label className="block mb-2">Repository</label>
                    <p className="px-4 py-2 bg-gray-200 text-black rounded-md">
                      <strong>Repo:</strong> {editPage.repo}
                    </p>
                    <p className="px-4 py-2 bg-gray-200 text-black rounded-md mt-2">
                      <strong>Page Name:</strong> {editPage.name}
                    </p>
                  </div>
                )}
                {!editPage && selectedRepo && (
                  <div className="mb-4">
                    <label className="block mb-2">Repository</label>
                    <p className="px-4 py-2 bg-gray-200 text-black rounded-md">
                      {selectedRepo.full_name}
                    </p>
                    <div className="mb-4 mt-4">
                      <label className="block mb-2">Page Name</label>
                      <input
                        type="text"
                        value={pageName}
                        onChange={(e) => setPageName(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-200 text-black rounded-md"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Tabs */}
                {editPage && (
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
                )}

                {/* Tab Content */}
                {activeTab === "details" && (
                  <div>
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
                      <label className="block mb-2">
                        Build Script (Optional)
                      </label>
                      <textarea
                        value={buildScript}
                        onChange={(e) => setBuildScript(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-200 text-black rounded-md"
                        rows="4"
                      ></textarea>
                    </div>
                    <div className="mb-4">
                      <label className="block mb-2">
                        Environment Variables
                      </label>
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
                      onClick={handleSaveAndDeploy}
                      disabled={!branch || !pageName}
                      className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                    >
                      Save and Deploy
                    </button>
                  </div>
                )}

                {activeTab === "logs" && (
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
                    {isLoadingLog ? (
                      <div className="text-center text-gray-500">
                        Loading logs...
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-200 text-black rounded-md overflow-y-auto max-h-96">
                        <pre>{deploymentLogs}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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
