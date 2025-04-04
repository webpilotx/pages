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

function PagesList({ pagesList, handleSelectPage, handleCreatePage }) {
  const navigate = useNavigate();

  const handlePageClick = (page) => {
    handleSelectPage(page);
    navigate(`/pages/${page.id}`);
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
                  handleCreatePage={() => setSelectedPage({})}
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
const root = createRoot(container);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
