import { LockKeyhole, LogIn, Menu, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AddClass from "./AddClass";
import AddReport from "./AddReport";
import Classes from "./Classes";
import Curricula from "./Curricula";
import DeletedClasses from "./DeletedClasses";
import DeletedReports from "./DeletedReports";
import GraphicalReport from "./GraphicalReport";
import Reports from "./Reports";
import Sidebar from "./Sidebar";
import { apiFetch } from "./api";

const authApi = "http://localhost/reporting_system/backend/auth.php";
function LoginPage({ onLogin, error }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    await onLogin(username, password);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-3xl border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:p-8"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none">
            <LockKeyhole size={28} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">
            Report Desk
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Sign in to continue
          </p>
        </div>
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
              required
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
              required
            />
          </label>
        </div>
        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}
        <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700">
          <LogIn size={18} /> Sign in
        </button>
      </form>
    </main>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("darkMode") === "true",
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(null);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    apiFetch(authApi)
      .then((response) => response.json())
      .then((data) => setAuthenticated(data.authenticated === true))
      .catch(() => setAuthenticated(false));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  const login = async (username, password) => {
    const response = await apiFetch(authApi, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      setLoginError(data.error || "Unable to sign in");
      return;
    }
    setLoginError("");
    setAuthenticated(true);
  };

  const logout = async () => {
    try {
      await apiFetch(authApi, { method: "DELETE" });
    } finally {
      setSidebarOpen(false);
      setAuthenticated(false);
    }
  };

  if (authenticated === null) {
    return <div className="min-h-screen bg-slate-100 dark:bg-slate-950" />;
  }
  if (!authenticated) {
    return <LoginPage onLogin={login} error={loginError} />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-100 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onLogout={logout}
        />
        <main className="min-h-screen lg:ml-72">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/80 bg-slate-100/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:px-6">
            <button
              aria-label="Open menu"
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl p-2 hover:bg-slate-200 dark:hover:bg-slate-800 lg:hidden"
            >
              <Menu size={23} />
            </button>
            <span className="hidden text-sm font-bold text-slate-500 sm:block dark:text-slate-400">
              Academic reporting
            </span>
            <button
              aria-label={
                darkMode ? "Switch to light mode" : "Switch to dark mode"
              }
              title={darkMode ? "Light mode" : "Dark mode"}
              onClick={() => setDarkMode((value) => !value)}
              className="ml-auto flex items-center gap-2 rounded-full border border-slate-300 bg-white p-1.5 shadow-sm transition hover:scale-105 dark:border-slate-700 dark:bg-slate-900"
            >
              <span
                className={`rounded-full p-1.5 ${darkMode ? "text-slate-400" : "bg-amber-100 text-amber-600"}`}
              >
                <Sun size={16} />
              </span>
              <span
                className={`rounded-full p-1.5 ${darkMode ? "bg-indigo-500 text-white" : "text-slate-400"}`}
              >
                <Moon size={16} />
              </span>
            </button>
          </header>
          <div className="p-4 sm:p-6 lg:p-8">
            <Routes>
              <Route path="/" element={<Classes />} />
              <Route path="/classes" element={<Classes />} />
              <Route path="/classes/new" element={<AddClass />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/reports/:class_id" element={<Reports />} />
              <Route path="/reports/new" element={<AddReport />} />
              <Route path="/reports/:class_id/new" element={<AddReport />} />
              <Route path="/graphical-report" element={<GraphicalReport />} />
              <Route path="/curricula" element={<Curricula />} />
              <Route path="/deleted-classes" element={<DeletedClasses />} />
              <Route path="/deleted-reports" element={<DeletedReports />} />
              <Route
                path="/deleted-reports/:class_id"
                element={<DeletedReports />}
              />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
