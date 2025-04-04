import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

function PagesList({ pagesList, handleSelectPage, handleCreatePage }) {
  return (
    <>
      <h1 className="text-3xl font-bold mt-12 mb-6">Pages List</h1>
      <ul className="space-y-4">
        {pagesList.map((page) => (
          <li
            key={page.id}
            className="p-4 bg-gray-100 rounded-md shadow-sm border border-gray-300 cursor-pointer hover:bg-gray-200"
            onClick={() => handleSelectPage(page)}
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

function PageDetails({
  selectedPage,
  branches,
  branch,
  setBranch,
  buildScript,
  setBuildScript,
  envVars,
  handleEnvVarChange,
  handleAddEnvVar,
  handleRemoveEnvVar,
  handleSaveAndDeploy,
}) {
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
        <p>
          <strong>Branch:</strong> {selectedPage.branch}
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
        onClick={handleSaveAndDeploy}
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
  isLoadingLog,
  deploymentLogs,
  selectedPage,
}) {
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
        isLoadingLog ? (
          <div className="text-center text-gray-500">Loading logs...</div>
        ) : (
          <div className="p-4 bg-gray-200 text-black rounded-md overflow-y-auto max-h-96">
            <pre>
              {deploymentLogs[selectedPage.id] ||
                "No logs available for this deployment."}
            </pre>
          </div>
        )
      ) : (
        <div className="text-center text-gray-500">No deployment selected.</div>
      )}
    </div>
  );
}

function App() {
  const [pagesList, setPagesList] = useState([]);
  const [repositories, setRepositories] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [branches, setBranches] = useState([]);
  const [pageName, setPageName] = useState("");
  const [branch, setBranch] = useState("");
  const [buildScript, setBuildScript] = useState("");
  const [envVars, setEnvVars] = useState([{ name: "", value: "" }]);
  const [editPage, setEditPage] = useState(null);
  const [selectedPage, setSelectedPage] = useState(null);
  const repositoriesPerPage = 12;
  const [activeTab, setActiveTab] = useState("details");
  const [deploymentLogs, setDeploymentLogs] = useState({});
  const [deployments, setDeployments] = useState([]);
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [isLoadingLog, setIsLoadingLog] = useState(false);

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
        setRepositories(data.repositories);
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
        setBranch(data.branches[0]);
      }
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

  const fetchDeploymentLog = async (deploymentId, pageId) => {
    if (!deploymentId) {
      setDeploymentLogs((prevLogs) => ({
        ...prevLogs,
        [pageId]: "No deployment selected.",
      }));
      return;
    }

    try {
      setIsLoadingLog(true);
      const response = await fetch(
        `/pages/api/deployment-log?deploymentId=${deploymentId}`
      );
      if (response.ok) {
        const logs = await response.text();
        setDeploymentLogs((prevLogs) => ({
          ...prevLogs,
          [pageId]: logs,
        }));
      } else {
        setDeploymentLogs((prevLogs) => ({
          ...prevLogs,
          [pageId]: "Failed to fetch deployment logs.",
        }));
      }
    } catch (error) {
      console.error("Error fetching deployment log:", error);
      setDeploymentLogs((prevLogs) => ({
        ...prevLogs,
        [pageId]: "Error fetching deployment log.",
      }));
    } finally {
      setIsLoadingLog(false);
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

  const handleSaveAndDeploy = async () => {
    try {
      const response = await fetch("/pages/api/save-and-deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedRepo,
          pageName,
          branch,
          buildScript,
          envVars,
          editPage,
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

      const pageId = editPage ? editPage.id : data.pageId;
      const deploymentsResponse = await fetch(
        `/pages/api/deployments?pageId=${pageId}`
      );
      if (deploymentsResponse.ok) {
        const deploymentsData = await deploymentsResponse.json();
        setDeployments(deploymentsData);

        const latestDeployment = deploymentsData.find(
          (deployment) => deployment.id === data.deploymentId
        );
        if (latestDeployment) {
          setSelectedDeployment(latestDeployment);
          await fetchDeploymentLog(
            latestDeployment.id,
            pageId,
            latestDeployment.exitCode === null
          );
        }
      }

      setActiveTab("logs");
    } catch (error) {
      console.error("Error during save and deploy:", error);
      alert("Failed to save and deploy: " + error.message);
    }
  };

  const handleSelectDeployment = async (deployment) => {
    try {
      setSelectedDeployment(deployment);
      await fetchDeploymentLog(deployment.id, selectedPage.id);
    } catch (error) {
      console.error("Error fetching deployment details or logs:", error);
      setDeploymentLogs((prevLogs) => ({
        ...prevLogs,
        [selectedPage.id]: "Error fetching deployment logs.",
      }));
    }
  };

  const handleTabChange = async (tab) => {
    setActiveTab(tab);

    if (tab === "logs" && selectedPage) {
      try {
        const response = await fetch(
          `/pages/api/deployments?pageId=${selectedPage.id}`
        );
        if (response.ok) {
          const deploymentsData = await response.json();
          setDeployments(deploymentsData);
        } else {
          console.error("Failed to fetch deployments.");
        }
      } catch (error) {
        console.error("Error fetching deployments:", error);
      }
    }
  };

  const handleCreatePage = () => {
    setEditPage(null);
    setPageName("");
    setBranch("");
    setBuildScript("");
    setEnvVars([{ name: "", value: "" }]);
    setSelectedRepo(null);
    setActiveTab("details");
  };

  const handleSelectPage = (page) => {
    setSelectedPage(page);
    setEditPage(page);
    setPageName(page.name);
    setBranch(page.branch);
    setBuildScript(page.buildScript || "");
    setEnvVars([]);
    fetchBranches(page.repo);
    fetchDeployments(page.id);
    setActiveTab("details");
  };

  const handleBackToPagesList = () => {
    setSelectedPage(null);
    setEditPage(null);
    setPageName("");
    setBranch("");
    setBuildScript("");
    setEnvVars([{ name: "", value: "" }]);
    setSelectedRepo(null);
    setActiveTab("details");
  };

  const paginatedRepositories = repositories.slice(
    (currentPage - 1) * repositoriesPerPage,
    currentPage * repositoriesPerPage
  );

  const totalPages = Math.ceil(repositories.length / repositoriesPerPage);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-black">
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
      <main className="flex-grow container mx-auto px-4 py-8">
        {!selectedPage ? (
          <PagesList
            pagesList={pagesList}
            handleSelectPage={handleSelectPage}
            handleCreatePage={handleCreatePage}
          />
        ) : (
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
                  branch={branch}
                  setBranch={setBranch}
                  buildScript={buildScript}
                  setBuildScript={setBuildScript}
                  envVars={envVars}
                  handleEnvVarChange={handleEnvVarChange}
                  handleAddEnvVar={handleAddEnvVar}
                  handleRemoveEnvVar={handleRemoveEnvVar}
                  handleSaveAndDeploy={handleSaveAndDeploy}
                />
              )}
              {activeTab === "logs" && (
                <DeploymentLogs
                  deployments={deployments}
                  selectedDeployment={selectedDeployment}
                  handleSelectDeployment={handleSelectDeployment}
                  isLoadingLog={isLoadingLog}
                  deploymentLogs={deploymentLogs}
                  selectedPage={selectedPage}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
