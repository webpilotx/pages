import { useEffect, useRef, useState } from "react";
import {
  Link,
  Outlet,
  Route,
  BrowserRouter as Router,
  Routes,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import "./index.css";

function PagesList() {
  const [pagesList, setPagesList] = useState([]);
  const navigate = useNavigate();

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

  const handlePageClick = (page) => {
    navigate(`/pages/${page.id}/edit`); // Navigate to /pages/:id/edit by default
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
    updatedEnvVars[index][field] = value; // Store the value as-is
    setEnvVars(updatedEnvVars);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("/pages/api/create-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo, name, branch, buildScript, envVars }),
      });

      if (!response.ok) {
        throw new Error("Failed to create page");
      }

      const { pageId, deploymentId } = await response.json();

      // Navigate to the logs page for the new deployment
      navigate(`/pages/${pageId}/logs/${deploymentId}`);
    } catch (error) {
      console.error("Error creating page:", error);
    }
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
                  placeholder={`pnpm install\npnpm run build\npnpm run migrate`}
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
                  className="px-4 py-2 bg-gray-300 text-black rounded-md hover:bg-gray-400"
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
      {/* Display page name and full repository name with external link */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{pageDetails.name}</h1>
        <p className="text-gray-600">
          {pageDetails.repo}{" "}
          <a
            href={`https://github.com/${pageDetails.repo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            (View on GitHub)
          </a>
        </p>
      </div>
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
  const { id: pageId } = useParams();
  const navigate = useNavigate();
  const [pageDetails, setPageDetails] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [originalDetails, setOriginalDetails] = useState(null);

  useEffect(() => {
    const fetchPageDetails = async () => {
      try {
        const response = await fetch(`/pages/api/pages-list`);
        const pages = await response.json();
        const page = pages.find((p) => p.id === parseInt(pageId));

        if (page) {
          const envVarsResponse = await fetch(
            `/pages/api/env-vars?pageId=${pageId}`
          );
          const envVars = await envVarsResponse.json();
          const fullDetails = { ...page, envVars };
          setPageDetails(fullDetails);
          setOriginalDetails(JSON.stringify(fullDetails));
        }
      } catch (error) {
        console.error("Error fetching page details:", error);
      }
    };

    fetchPageDetails();
  }, [pageId]);

  useEffect(() => {
    if (pageDetails?.repo) {
      const fetchBranches = async () => {
        try {
          setLoadingBranches(true);
          const response = await fetch(
            `/pages/api/branches?repo=${pageDetails.repo}`
          );
          const data = await response.json();
          setBranches(data.branches || []);
        } catch (error) {
          console.error("Error fetching branches:", error);
        } finally {
          setLoadingBranches(false);
        }
      };

      fetchBranches();
    }
  }, [pageDetails?.repo]);

  const isEdited = JSON.stringify(pageDetails) !== originalDetails;

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

  const handleEnvVarChangeEdit = (index, field, value) => {
    const updatedEnvVars = [...pageDetails.envVars];
    updatedEnvVars[index][field] = value;
    setPageDetails({ ...pageDetails, envVars: updatedEnvVars });
  };

  const handleDeploy = async () => {
    try {
      const response = await fetch("/pages/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: pageDetails.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to deploy");
      }

      const data = await response.json();
      navigate(`/pages/${pageDetails.id}/logs/${data.deploymentId}`);
    } catch (error) {
      console.error("Error deploying:", error);
      alert("Failed to deploy.");
    }
  };

  const handleSaveAndDeploy = async () => {
    if (
      !window.confirm(
        "This action will update the page details before deploying. Do you want to proceed?"
      )
    ) {
      return; // Exit if the user cancels the confirmation
    }

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

  if (!pageDetails) {
    return <p className="text-center text-gray-500">Loading page details...</p>;
  }

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
                handleEnvVarChangeEdit(index, "name", e.target.value)
              }
              className="w-1/2 px-4 py-2 bg-gray-200 text-black rounded-md"
            />
            <input
              type="text"
              placeholder="Value"
              value={env.value}
              onChange={(e) =>
                handleEnvVarChangeEdit(index, "value", e.target.value)
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
          className="px-4 py-2 bg-gray-300 text-black rounded-md hover:bg-gray-400"
        >
          Add Env
        </button>
      </div>
      <div className="flex space-x-4">
        <button
          onClick={isEdited ? handleSaveAndDeploy : handleDeploy}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          {isEdited ? "Save and Deploy" : "Deploy"}
        </button>
      </div>
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

export default App;
