import { StrictMode, useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  Link,
  Route,
  BrowserRouter as Router,
  Routes,
  useNavigate,
  useParams,
  Outlet,
  useOutletContext,
} from "react-router-dom";
import "./index.css";

// Helper function to fetch data
const fetchData = async (url, errorMessage) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(errorMessage);
    return await response.json();
  } catch (error) {
    console.error(errorMessage, error);
    return null;
  }
};

function PagesList() {
  const [pagesList, setPagesList] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData("/pages/api/pages-list", "Error fetching pages list").then(
      (data) => setPagesList(data || [])
    );
  }, []);

  return (
    <>
      <h1 className="text-3xl font-bold mt-12 mb-6">Pages List</h1>
      <ul className="space-y-4">
        {pagesList.map((page) => (
          <li
            key={page.id}
            className="p-4 bg-gray-100 rounded-md shadow-sm border border-gray-300 cursor-pointer hover:bg-gray-200"
            onClick={() => navigate(`/pages/${page.id}/edit`)}
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
        onClick={() => navigate("/pages/new")}
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

  useEffect(() => {
    fetchData("/pages/api/provider-accounts", "Error fetching accounts").then(
      (data) => {
        setAccounts(data || []);
        if (data?.length > 0) setSelectedAccount(data[0].login);
      }
    );
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      setLoadingRepos(true);
      fetchData(
        `/pages/api/repositories?account=${selectedAccount}`,
        "Error fetching repositories"
      )
        .then((data) => setRepositories(data?.repositories || []))
        .finally(() => setLoadingRepos(false));
    }
  }, [selectedAccount]);

  useEffect(() => {
    if (repo) {
      setLoadingBranches(true);
      fetchData(`/pages/api/branches?repo=${repo}`, "Error fetching branches")
        .then((data) => setBranches(data?.branches || []))
        .finally(() => setLoadingBranches(false));
    }
  }, [repo]);

  const handleEnvVarChange = (index, field, value) => {
    const updatedEnvVars = [...envVars];
    updatedEnvVars[index][field] = value;
    setEnvVars(updatedEnvVars);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newPage = { repo, name, branch, buildScript, envVars };
    const response = await fetch("/pages/api/create-page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPage),
    });
    if (response.ok) {
      const { pageId, deploymentId } = await response.json();
      navigate(`/pages/${pageId}/logs/${deploymentId}`);
    } else {
      console.error("Failed to create page");
    }
  };

  const currentRepos = repositories.slice(
    (currentPage - 1) * reposPerPage,
    currentPage * reposPerPage
  );

  return (
    <div className="mt-8 p-6 bg-gray-100 rounded-md shadow-lg">
      {step === 1 ? (
        <>
          <h2 className="text-2xl font-bold mb-4">Choose Repository</h2>
          <div>
            <label className="block mb-2">Provider Account</label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full px-4 py-2 bg-gray-200 text-black rounded-md"
            >
              {accounts.map((account) => (
                <option key={account.login} value={account.login}>
                  {account.login}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-6">
            <label className="block mb-2">Repository</label>
            {loadingRepos ? (
              <p className="text-center text-gray-500">
                Loading repositories...
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {currentRepos.map((repository) => (
                  <div
                    key={repository.full_name}
                    className={`p-4 bg-gray-100 rounded-md shadow-sm border cursor-pointer ${
                      repo === repository.full_name
                        ? "border-blue-500"
                        : "border-gray-300"
                    }`}
                    onClick={() => setRepo(repository.full_name)}
                  >
                    {repository.full_name}
                  </div>
                ))}
              </div>
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
      ) : (
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
              {branches.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block mb-2">Build Script</label>
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
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={env.value}
                  onChange={(e) =>
                    handleEnvVarChange(index, "value", e.target.value)
                  }
                  className="w-1/2 px-4 py-2 bg-gray-200 text-black rounded-md"
                />
              </div>
            ))}
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Save and Deploy
          </button>
        </form>
      )}
    </div>
  );
}

function PageDetailsLayout() {
  const [pageDetails, setPageDetails] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const { id: pageId } = useParams();

  const fetchPageDetails = async () => {
    try {
      const response = await fetch(`/pages/api/pages-list`);
      const pages = await response.json();
      const page = pages.find((p) => p.id === parseInt(pageId));

      if (page) {
        // Fetch environment variables for the page
        const envVarsResponse = await fetch(
          `/pages/api/env-vars?pageId=${pageId}`
        );
        const envVars = await envVarsResponse.json();
        setPageDetails({ ...page, envVars });
      }
    } catch (error) {
      console.error("Error fetching page details:", error);
    }
  };

  const fetchBranches = async (repo) => {
    try {
      setLoadingBranches(true);
      const response = await fetch(`/pages/api/branches?repo=${repo}`);
      const data = await response.json();
      setBranches(data.branches || []);
    } catch (error) {
      console.error("Error fetching branches:", error);
    } finally {
      setLoadingBranches(false);
    }
  };

  useEffect(() => {
    fetchPageDetails();
  }, [pageId]);

  useEffect(() => {
    if (pageDetails?.repo) {
      fetchBranches(pageDetails.repo);
    }
  }, [pageDetails?.repo]);

  if (!pageDetails) {
    return <p className="text-center text-gray-500">Loading page details...</p>;
  }

  return (
    <div className="mt-8 p-6 bg-gray-100 rounded-md shadow-lg">
      <nav className="mb-4">
        <div className="flex space-x-4 border-b border-gray-300">
          <Link
            to="edit"
            className="px-4 py-2 text-gray-500 hover:text-blue-500"
          >
            Edit Details
          </Link>
          <Link
            to="logs"
            className="px-4 py-2 text-gray-500 hover:text-blue-500"
          >
            Deployment Logs
          </Link>
          <Link
            to="settings"
            className="px-4 py-2 text-gray-500 hover:text-blue-500"
          >
            Settings
          </Link>
        </div>
      </nav>
      <Outlet
        context={{ pageDetails, setPageDetails, branches, loadingBranches }}
      />
    </div>
  );
}

function EditDetails() {
  const { pageDetails, setPageDetails, branches, loadingBranches } =
    useOutletContext();
  const navigate = useNavigate();

  const handleAddEnvVar = () => {
    const updatedEnvVars = [
      ...(pageDetails.envVars || []),
      { name: "", value: "" },
    ];
    setPageDetails({ ...pageDetails, envVars: updatedEnvVars });
  };

  const handleRemoveEnvVar = (index) => {
    const updatedEnvVars = pageDetails.envVars.filter((_, i) => i !== index);
    setPageDetails({ ...pageDetails, envVars: updatedEnvVars });
  };

  const handleEnvVarChange = (index, field, value) => {
    const updatedEnvVars = [...pageDetails.envVars];
    updatedEnvVars[index][field] = value;
    setPageDetails({ ...pageDetails, envVars: updatedEnvVars });
  };

  const handleSaveAndDeploy = async () => {
    try {
      const response = await fetch("/pages/api/save-and-deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedRepo: { full_name: pageDetails.repo },
          pageName: pageDetails.name,
          branch: pageDetails.branch,
          buildScript: pageDetails.buildScript,
          envVars: pageDetails.envVars,
          editPage: pageDetails,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save and deploy");
      }

      const data = await response.json();
      navigate(`/pages/${pageDetails.id}/logs/${data.deploymentId}`);
    } catch (error) {
      console.error("Error saving and deploying:", error);
      alert("Failed to save and deploy.");
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Edit Page Details</h2>
      <div className="mb-4">
        <label className="block mb-2">Branch</label>
        {loadingBranches ? (
          <p className="text-gray-500">Loading branches...</p>
        ) : (
          <select
            value={pageDetails.branch}
            onChange={(e) =>
              setPageDetails({ ...pageDetails, branch: e.target.value })
            }
            className="w-full px-4 py-2 bg-gray-200 text-black rounded-md"
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
        )}
      </div>
      <div className="mb-4">
        <label className="block mb-2">Build Script</label>
        <textarea
          value={pageDetails.buildScript || ""}
          onChange={(e) =>
            setPageDetails({ ...pageDetails, buildScript: e.target.value })
          }
          className="w-full px-4 py-2 bg-gray-200 text-black rounded-md"
          rows="4"
        ></textarea>
      </div>
      <div className="mb-4">
        <label className="block mb-2">Environment Variables</label>
        {pageDetails.envVars?.map((env, index) => (
          <div key={index} className="flex space-x-4 mb-2">
            <input
              type="text"
              placeholder="Name"
              value={env.name}
              onChange={(e) =>
                handleEnvVarChange(index, "name", e.target.value)
              }
              className="w-1/2 px-4 py-2 bg-gray-200 text-black rounded-md"
            />
            <input
              type="text"
              placeholder="Value"
              value={env.value}
              onChange={(e) =>
                handleEnvVarChange(index, "value", e.target.value)
              }
              className="w-1/2 px-4 py-2 bg-gray-200 text-black rounded-md"
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
      <button
        onClick={handleSaveAndDeploy}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        Save and Deploy
      </button>
    </div>
  );
}

function DeploymentLogs() {
  const { pageDetails } = useOutletContext();
  const [deployments, setDeployments] = useState([]);
  const { deploymentId } = useParams(); // Get deploymentId from the route

  const fetchDeployments = async () => {
    try {
      const response = await fetch(
        `/pages/api/deployments?pageId=${pageDetails.id}`
      );
      const data = await response.json();
      setDeployments(data);
    } catch (error) {
      console.error("Error fetching deployments:", error);
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, []);

  // If deploymentId is present, render only the selected deployment's logs
  if (deploymentId) {
    return <Outlet />;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Deployment Logs</h2>
      <ul className="space-y-2">
        {deployments.map((deployment) => (
          <li
            key={deployment.id}
            className="p-4 bg-gray-100 rounded-md shadow-sm border cursor-pointer hover:border-blue-500"
          >
            <Link to={`${deployment.id}`} className="block">
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
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DeploymentLogDetails() {
  const { id: pageId, deploymentId } = useParams();
  const [logContent, setLogContent] = useState("");
  const [deployment, setDeployment] = useState(null);
  const logContainerRef = useRef(null); // Reference for the log container

  const fetchDeployment = async () => {
    try {
      const response = await fetch(
        `/pages/${pageId}/deployments/${deploymentId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch deployment details");
      }
      const data = await response.json();
      setDeployment(data);
    } catch (error) {
      console.error("Error fetching deployment details:", error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Fetch deployment details
    fetchDeployment();

    // Fetch logs
    const fetchLogStream = async () => {
      try {
        const response = await fetch(
          `/pages/api/deployment-log-stream?deploymentId=${deploymentId}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch deployment logs");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        let done = false;
        while (!done && isMounted) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            setLogContent(() => decoder.decode(value));
          }
        }

        // Refresh current deployment after stream ends
        if (isMounted) {
          await fetchDeployment();
        }
      } catch (error) {
        if (isMounted) {
          console.error("Error streaming deployment logs:", error);
          setLogContent("Failed to stream deployment logs.");
        }
      }
    };

    fetchLogStream();

    return () => {
      isMounted = false;
    };
  }, [pageId, deploymentId]);

  useEffect(() => {
    // Auto-scroll to the bottom of the log container
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logContent]);

  if (!deployment) {
    return (
      <p className="text-center text-gray-500">Loading deployment details...</p>
    );
  }

  return (
    <div>
      <div className="p-4 bg-gray-100 rounded-md shadow-sm border">
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
      </div>
      <div
        ref={logContainerRef} // Attach the reference to the log container
        className="mt-4 p-4 bg-gray-200 text-black rounded-md overflow-y-auto max-h-96"
      >
        <pre>{logContent || "No logs available for this deployment."}</pre>
      </div>
    </div>
  );
}

function Settings() {
  const { pageDetails } = useOutletContext();

  const handleDeletePage = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this page? This action cannot be undone."
      )
    ) {
      return; // Exit if the user cancels the confirmation
    }

    try {
      const response = await fetch(`/pages/api/pages/${pageDetails.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete page");
      }

      alert("Page and associated service deleted successfully.");
      window.location.href = "/pages";
    } catch (error) {
      console.error("Error deleting page:", error);
      alert(`Failed to delete page: ${error.message}`);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Settings</h2>
      <p className="mb-4 text-gray-700">
        Deleting this page will remove all deployments, logs, the cloned
        repository from disk, and the associated systemd service. This action
        cannot be undone.
      </p>
      <button
        onClick={handleDeletePage}
        className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
      >
        Delete Page
      </button>
    </div>
  );
}

function App() {
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
            <Route path="/pages" element={<PagesList />} />
            <Route path="/pages/new" element={<CreatePage />} />
            <Route path="/pages/:id" element={<PageDetailsLayout />}>
              <Route path="edit" element={<EditDetails />} />
              <Route path="logs" element={<DeploymentLogs />}>
                <Route
                  path=":deploymentId"
                  element={<DeploymentLogDetails />}
                />
              </Route>
              <Route path="settings" element={<Settings />} />
            </Route>
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
