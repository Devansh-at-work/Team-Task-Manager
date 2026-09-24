import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  Circle,
  Clock,
  DollarSign,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FolderKanban,
  LogOut,
  Minus,
  Moon,
  Pencil,
  PieChart,
  Plus,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Trash2,
  User,
  Users,
  Wallet,
  X
} from "lucide-react";
import { api, getToken, setToken } from "./api/client";
import * as XLSX from "xlsx";
import "./styles.css";

const statuses = ["Todo", "In Progress", "Done"];
const priorities = ["Low", "Medium", "High"];

function CustomSelect({ options, value, onChange, disabled, placeholder, className }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const portalRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, renderUpwards: false });

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // If space below is less than 280px and we have more space above, open upwards
      const renderUpwards = spaceBelow < 280 && spaceAbove > spaceBelow;
      
      setCoords({
        top: renderUpwards 
          ? rect.top + window.scrollY - 6 
          : rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
        width: rect.width,
        renderUpwards
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      // Listen to scroll events in capture phase to track table scrolling
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
    }
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && containerRef.current.contains(event.target)) {
        return;
      }
      if (portalRef.current && portalRef.current.contains(event.target)) {
        return;
      }
      setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(
    (opt) => (typeof opt === "object" ? opt.value : opt) === value
  );
  
  const selectedLabel = selectedOption
    ? (typeof selectedOption === "object" ? selectedOption.label : selectedOption)
    : placeholder || value || "Select...";

  return (
    <div className={`custom-select-container ${disabled ? "disabled" : ""} ${isOpen ? "is-open" : ""} ${className || ""}`} ref={containerRef}>
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span>{selectedLabel}</span>
        <ChevronDown className="chevron-icon" size={15} />
      </button>
      {isOpen && createPortal(
        <ul
          ref={portalRef}
          className="custom-select-options"
          style={{
            position: "absolute",
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            transform: coords.renderUpwards ? "translateY(-100%)" : "none",
            transformOrigin: coords.renderUpwards ? "bottom center" : "top center",
            zIndex: 99999
          }}
        >
          {options.map((option, index) => {
            const optVal = typeof option === "object" ? option.value : option;
            const optLabel = typeof option === "object" ? option.label : option;
            const isSelected = optVal === value;
            return (
              <li
                key={optVal}
                style={{ "--index": index }}
                className={`custom-select-option ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  onChange(optVal);
                  setIsOpen(false);
                }}
              >
                {optLabel}
              </li>
            );
          })}
        </ul>,
        document.body
      )}
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("team-task-theme") || "dark");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("team-task-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((current) => (current === "dark" ? "light" : "dark"));

  useEffect(() => {
    if (!getToken()) return;
    api("/auth/me")
      .then(({ user }) => setUser(user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <CursorAura />
        <ShellMessage text="Loading workspace..." />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <CursorAura />
        <AuthView onAuthed={setUser} error={error} setError={setError} theme={theme} onToggleTheme={toggleTheme} />
      </>
    );
  }

  return (
    <>
      <CursorAura />
      <Workspace
        user={user}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={() => {
          setToken(null);
          setUser(null);
        }}
      />
    </>
  );
}

function CursorAura() {
  const auraRef = useRef(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const move = (event) => {
      if (auraRef.current) {
        auraRef.current.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`;
      }
    };
    const enter = () => setActive(true);
    const leave = () => setActive(false);

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerdown", enter);
    window.addEventListener("pointerup", leave);
    window.addEventListener("pointerleave", leave);

    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", enter);
      window.removeEventListener("pointerup", leave);
      window.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div
      ref={auraRef}
      className={`cursor-aura ${active ? "active" : ""}`}
    />
  );
}

function ThemeToggle({ theme, onToggleTheme }) {
  const isDark = theme === "dark";

  return (
    <button className="icon-button" type="button" onClick={onToggleTheme} aria-label="Toggle dark mode">
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function ShellMessage({ text }) {
  return (
    <main className="center-screen">
      <div className="brand-mark"><FolderKanban size={34} /></div>
      <p>{text}</p>
    </main>
  );
}

function AuthView({ onAuthed, error, setError, theme, onToggleTheme }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const payload =
        mode === "signup"
          ? form
          : { email: form.email, password: form.password };
      const { user, token } = await api(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setToken(token);
      onAuthed(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-tools">
        <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
      </div>
      <section className="auth-panel">
        <div className="auth-copy">
          <div className="auth-copy-main">
            <div className="auth-badge">
              <ShieldCheck size={16} />
              <span>Team Workspace</span>
            </div>
            <h1>Team Task Manager</h1>
            <p>Create projects, assign the right people, and keep delivery visible from one focused dashboard.</p>
          </div>
          <div className="auth-features" aria-label="Project features">
            <span>Role-based access</span>
            <span>Project teams</span>
            <span>Task tracking</span>
            <span>Overdue dashboard</span>
          </div>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-form-head">
            <h2>{mode === "signup" ? "Create your account" : "Welcome back"}</h2>
            <p>{mode === "signup" ? "Start with a clean workspace for your team." : "Sign in to continue managing your projects."}</p>
          </div>
          <div className="segmented" role="tablist">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
            <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Signup</button>
          </div>
          {mode === "signup" && (
            <label>
              Name
              <input required minLength="2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
          )}
          <label>
            Email
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            Password
            <span className="password-field">
              <input required type={showPassword ? "text" : "password"} minLength="6" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button className={showPassword ? "visible" : ""} type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                <span>{showPassword ? "Hide" : "View"}</span>
              </button>
            </span>
          </label>
          {error && <p className="error"><AlertCircle size={16} />{error}</p>}
          <button className="primary" type="submit" disabled={submitting}>
            {submitting ? "Please wait..." : mode === "signup" ? "Create account" : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Workspace({ user, theme, onToggleTheme, onLogout }) {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectDetail, setProjectDetail] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [message, setMessage] = useState("");

  async function refresh() {
    const [{ projects }, dashboardData] = await Promise.all([
      api("/projects"),
      api("/dashboard")
    ]);
    setProjects(projects);
    setDashboard(dashboardData);
    const nextId = selectedProjectId || projects[0]?._id || "";
    setSelectedProjectId(nextId);
    if (nextId) {
      const detail = await api(`/projects/${nextId}`);
      setProjectDetail(detail);
    } else {
      setProjectDetail(null);
    }
  }

  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    refresh().catch((err) => setMessage(err.message));
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    api(`/projects/${selectedProjectId}`)
      .then(setProjectDetail)
      .catch((err) => setMessage(err.message));
  }, [selectedProjectId]);

  const selectedProject = projectDetail?.project;
  const role = projectDetail?.role;
  const tasks = projectDetail?.tasks || [];
  const isAdmin = role === "Admin";
  const doneCount = tasks.filter((task) => task.status === "Done").length;
  const progress = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const isProjectCompleted = selectedProject?.status === "Completed";

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="header-main">
          <div className="header-brand-group">
            <div className="sidebar-head">
              <div className="brand-mark"><FolderKanban size={26} /></div>
              <div>
                <strong>Task Manager</strong>
                <span>{user.name}</span>
              </div>
            </div>

            <div className="header-nav-divider" />

            <ProjectSelector
              projects={projects}
              selectedProjectId={selectedProjectId}
              onSelectProject={(id) => setSelectedProjectId(id)}
              onOpenCreateProject={() => setShowCreateModal(true)}
            />
          </div>

          <div className="header-actions">
            <button className="primary" type="button" onClick={() => setShowCreateModal(true)}>
              <Plus size={17} /> New project
            </button>
            <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
            <button className="ghost logout" type="button" onClick={onLogout}><LogOut size={17} />Logout</button>
          </div>
        </div>
      </header>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Dashboard</p>
            <div className="title-row">
              <h1>{selectedProject?.name || "Create a project to begin"}</h1>
              {selectedProject && (
                <span className={`project-status-tag ${isProjectCompleted ? "completed" : "active"}`}>
                  {isProjectCompleted ? <CheckCircle2 size={13} strokeWidth={2.5} /> : <span className="status-dot-pulse" />}
                  <span>{isProjectCompleted ? "Completed" : "Ongoing"}</span>
                </span>
              )}
            </div>
            {selectedProject && (
              <div className="project-summary">
                <p>{selectedProject.description || "No description added yet."}</p>
                <div className="progress-line" aria-label={`Project progress ${progress}%`}>
                  <span style={{ width: `${progress}%` }} />
                </div>
                <small>{progress}% complete · {selectedProject.members.length} member{selectedProject.members.length === 1 ? "" : "s"}</small>
              </div>
            )}
          </div>
          <div className="topbar-actions">
            {selectedProject && (
              <button
                type="button"
                className="ghost project-settings-btn"
                onClick={() => setShowProjectSettings(true)}
                title="Project Insights & Settings"
              >
                <Settings size={16} />
                <span>Insights & Settings</span>
              </button>
            )}
            <span className={`role-badge role-${role || "Member"}`}>
              {isAdmin ? <ShieldCheck size={14} /> : <User size={14} />}
              <span>{role || "Member"}</span>
            </span>
          </div>
        </header>

        {message && <p className="notice">{message}</p>}
        <Stats dashboard={dashboard} />

        {selectedProject ? (
          <>
            <ExpenseWidget project={selectedProject} expenses={projectDetail?.expenses} isAdmin={isAdmin} onChange={refresh} />
            <div className="work-grid">
              <section className="panel main-panel">
                <div className="panel-title">
                  <div>
                    <h2>Tasks</h2>
                    <p>{tasks.length} task{tasks.length === 1 ? "" : "s"} in this project</p>
                  </div>
                  <div className="panel-actions">
                    <ExcelImportButton project={selectedProject} onSaved={refresh} />
                    <TaskForm project={selectedProject} onSaved={refresh} />
                  </div>
                </div>
                <TaskBoard tasks={tasks} role={role} user={user} project={selectedProject} onChange={refresh} />
              </section>
              <section className="panel side-panel">
                <TeamPanel project={selectedProject} isAdmin={isAdmin} onChanged={refresh} />
              </section>
            </div>
          </>
        ) : (
          <section className="empty-state">
            <FolderKanban size={46} />
            <h2>No projects yet</h2>
            <p>Create your first project from the top bar.</p>
          </section>
        )}

        {showProjectSettings && selectedProject && (
          <ProjectSettingsModal
            project={selectedProject}
            projectDetail={projectDetail}
            isAdmin={isAdmin}
            user={user}
            onClose={() => setShowProjectSettings(false)}
            onChanged={refresh}
            onDeleted={() => {
              setSelectedProjectId(null);
              setProjectDetail(null);
              refresh();
            }}
          />
        )}

        {showCreateModal && (
          <CreateProjectModal
            onClose={() => setShowCreateModal(false)}
            onCreated={async (newProj) => {
              await refresh();
              if (newProj?._id) {
                setSelectedProjectId(newProj._id);
              }
            }}
          />
        )}
      </section>
    </main>
  );
}

function ProjectSettingsModal({ project, projectDetail, isAdmin, user, onClose, onChanged, onDeleted }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);

  const expenses = projectDetail?.expenses || {};
  const memberLedger = projectDetail?.memberLedger || [];
  const taskMetrics = projectDetail?.taskMetrics || {};
  const isCompleted = project.status === "Completed";

  async function toggleStatus() {
    const nextStatus = isCompleted ? "Active" : "Completed";
    if (!window.confirm(`Mark project status as "${nextStatus}"?`)) return;
    setLoading(true);
    try {
      await api(`/projects/${project._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      });
      onChanged();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteProject() {
    if (!window.confirm("Are you sure you want to permanently delete this project? This will delete all tasks and cannot be undone.")) return;
    setLoading(true);
    try {
      await api(`/projects/${project._id}`, {
        method: "DELETE"
      });
      onDeleted();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div className="modal-backdrop">
      <div className="task-form modal-form project-settings-modal">
        <div className="form-head">
          <div className="modal-title-head">
            <div className="title-icon"><FolderKanban size={22} /></div>
            <div>
              <h3>{project.name}</h3>
              <span className={`status-pill ${isCompleted ? "status-completed" : "status-active"}`}>
                {isCompleted ? "Completed Project" : "Ongoing Project"}
              </span>
            </div>
          </div>
          <button type="button" className="icon-button compact" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <BarChart3 size={15} /> Overview & Health
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "financials" ? "active" : ""}`}
            onClick={() => setActiveTab("financials")}
          >
            <Wallet size={15} /> Member Spending Ledger
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "team" ? "active" : ""}`}
            onClick={() => setActiveTab("team")}
          >
            <Users size={15} /> Team ({project.members?.length || 0})
          </button>
        </div>

        <div className="tab-content-container">
          {activeTab === "overview" && (
            <div className="tab-pane">
              <div className="insights-grid">
                <div className="insight-card">
                  <span>Task Progress</span>
                  <strong>{taskMetrics.progressPercent || 0}%</strong>
                  <div className="mini-progress-track">
                    <div className="mini-progress-fill" style={{ width: `${taskMetrics.progressPercent || 0}%` }} />
                  </div>
                  <small>{taskMetrics.done || 0} of {taskMetrics.total || 0} tasks completed</small>
                </div>

                <div className="insight-card">
                  <span>Pending & Active</span>
                  <strong>{(taskMetrics.todo || 0) + (taskMetrics.inProgress || 0)}</strong>
                  <small>{taskMetrics.todo || 0} Todo · {taskMetrics.inProgress || 0} In Progress</small>
                </div>

                <div className="insight-card">
                  <span>Total Expenditure</span>
                  <strong className="text-accent">₹{(expenses.totalActualCost || 0).toLocaleString()}</strong>
                  <small>Budget: ₹{(expenses.budget || 0).toLocaleString()}</small>
                </div>
              </div>

              {isAdmin && (
                <>
                  <div className="admin-status-box">
                    <div>
                      <strong>Project Lifecycle Status</strong>
                      <p>Set project state to Track Ongoing work or Mark as Completed when finished.</p>
                    </div>
                    <button
                      type="button"
                      className={isCompleted ? "ghost" : "primary"}
                      onClick={toggleStatus}
                      disabled={loading}
                    >
                      {isCompleted ? "Reopen as Ongoing" : "Mark as Completed"}
                    </button>
                  </div>

                  <div className="admin-danger-box">
                    <div className="danger-text-col">
                      <strong>Danger Zone: Delete Project</strong>
                      <p>Permanently delete this project and all its tasks. This action cannot be undone.</p>
                      {!isCompleted && (
                        <span className="delete-warning-tip">
                          <AlertTriangle size={15} className="warning-tip-icon" />
                          <span>Project must be marked as <strong>Completed</strong> first before it can be deleted.</span>
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="danger-button project-delete-btn"
                      onClick={deleteProject}
                      disabled={loading || !isCompleted}
                    >
                      <Trash2 size={15} /> Delete Project
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "financials" && (
            <div className="tab-pane">
              <div className="ledger-head">
                <div>
                  <h4>Member Expenditure Ledger</h4>
                  <p>Individual expense totals logged per team member & admin.</p>
                </div>
                <div className="total-badge">
                  Total Spent: <strong>₹{(expenses.totalActualCost || 0).toLocaleString()}</strong>
                </div>
              </div>

              <div className="ledger-list">
                {memberLedger.map((item) => (
                  <div className="ledger-row" key={item.user._id}>
                    <div className="ledger-user">
                      <div className="user-avatar">{item.user.name?.charAt(0).toUpperCase()}</div>
                      <div className="user-text-info">
                        <strong>{item.user.name}</strong>
                        <span className="user-email">{item.user.email}</span>
                      </div>
                      <span className={`role role-${item.role}`}>{item.role}</span>
                    </div>

                    <div className="ledger-spend">
                      <div className="spend-info">
                        <strong>₹{item.totalSpent.toLocaleString()}</strong>
                        <small>{item.loggedCount} {item.loggedCount === 1 ? "entry" : "entries"}</small>
                      </div>

                      <div className="share-bar-container" title={`${item.spendShare}% of total project expenditure`}>
                        <div className="share-bar-fill" style={{ width: `${item.spendShare}%` }} />
                      </div>
                    </div>
                  </div>
                ))}

                {!memberLedger.length && (
                  <p className="muted text-center py-4">No team member expenditures recorded yet.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "team" && (
            <div className="tab-pane">
              <TeamPanel project={project} isAdmin={isAdmin} onChanged={onChanged} />
            </div>
          )}
        </div>

        <div className="form-actions modal-footer">
          <button className="ghost" type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ExpenseWidget({ project, expenses, isAdmin, onChange }) {
  const [editing, setEditing] = useState(false);
  const [budgetVal, setBudgetVal] = useState(project.budget || 0);

  const budget = expenses?.budget || project.budget || 0;
  const actual = expenses?.totalActualCost || 0;
  const estimated = expenses?.totalEstimatedCost || 0;
  const spentPercent = budget > 0 ? Math.min(100, Math.round((actual / budget) * 100)) : 0;
  const isOver = expenses?.isOverBudget || (budget > 0 && actual > budget);

  async function saveBudget(e) {
    e.preventDefault();
    await api(`/projects/${project._id}/budget`, {
      method: "PATCH",
      body: JSON.stringify({ budget: Number(budgetVal) || 0 })
    });
    setEditing(false);
    onChange();
  }

  return (
    <section className="panel expense-widget">
      <div className="expense-head">
        <div className="expense-title">
          <Receipt size={18} />
          <strong>Expense & Budget Tracker</strong>
        </div>
        {isAdmin && !editing && (
          <button className="icon-button compact" type="button" onClick={() => { setBudgetVal(budget); setEditing(true); }} title="Set project budget">
            <Pencil size={14} />
          </button>
        )}
      </div>

      {editing ? (
        <form className="budget-edit-form" onSubmit={saveBudget}>
          <div className="form-row inline-row">
            <input
              type="number"
              min="0"
              step="any"
              required
              placeholder="Set project budget (₹)"
              value={budgetVal}
              onChange={(e) => setBudgetVal(e.target.value)}
            />
            <button className="primary" type="submit">Save Budget</button>
            <button className="ghost" type="button" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="expense-metrics">
          <div className="metric-box">
            <span>Total Budget</span>
            <strong>₹{budget.toLocaleString()}</strong>
          </div>
          <div className="metric-box">
            <span>Est. Task Costs</span>
            <strong>₹{estimated.toLocaleString()}</strong>
          </div>
          <div className="metric-box">
            <span>Actual Spent</span>
            <strong className={isOver ? "text-danger" : ""}>₹{actual.toLocaleString()}</strong>
          </div>

          <div className="budget-bar-block">
            <div className="budget-bar-track">
              <div
                className={`budget-bar-fill ${isOver ? "over" : spentPercent >= 85 ? "warn" : "good"}`}
                style={{ width: `${spentPercent}%` }}
              />
            </div>
            <div className="budget-bar-meta">
              <span>{spentPercent}% spent</span>
              {isOver ? (
                <span className="over-badge"><AlertCircle size={13} /> Over budget by ₹{(actual - budget).toLocaleString()}</span>
              ) : (
                <span>₹{(budget - actual).toLocaleString()} remaining</span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    budget: "",
    initialMembers: []
  });
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("Member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function addInitialMember(e) {
    e.preventDefault();
    const email = memberEmail.trim().toLowerCase();
    if (!email) return;
    if (form.initialMembers.some((m) => m.email === email)) {
      setError("Member email already added to list");
      return;
    }
    setError("");
    setForm((prev) => ({
      ...prev,
      initialMembers: [...prev.initialMembers, { email, role: memberRole }]
    }));
    setMemberEmail("");
    setMemberRole("Member");
  }

  function removeInitialMember(email) {
    setForm((prev) => ({
      ...prev,
      initialMembers: prev.initialMembers.filter((m) => m.email !== email)
    }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await api("/projects", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          budget: Number(form.budget) || 0,
          initialMembers: form.initialMembers
        })
      });
      onCreated(res.project);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div className="modal-backdrop">
      <form className="task-form modal-form create-project-modal" onSubmit={submit}>
        <div className="form-head">
          <div className="modal-title-head">
            <div className="title-icon"><FolderKanban size={22} /></div>
            <div>
              <h3>Create New Project</h3>
              <p className="subtitle">Set up project scope, description, budget, and team members.</p>
            </div>
          </div>
          <button type="button" className="icon-button compact" onClick={onClose}><X size={16} /></button>
        </div>

        {error && <p className="notice error">{error}</p>}

        <div className="field-group">
          <label>Project Name *</label>
          <input
            required
            minLength="2"
            maxLength="100"
            placeholder="e.g. Website Redesign, Mobile App"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="field-group">
          <label>Project Description (Optional)</label>
          <textarea
            rows="2"
            maxLength="600"
            placeholder="Describe the project goals, scope, key deliverables, and context..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="field-group">
          <label>Allocated Project Budget (₹)</label>
          <input
            type="number"
            min="0"
            step="any"
            placeholder="e.g. 50000"
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
          />
        </div>

        <div className="initial-members-block">
          <label className="picker-label">Invite Initial Team Members (Optional)</label>
          <div className="add-member-input-row">
            <input
              type="email"
              placeholder="Member email address"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
            />
            <CustomSelect
              options={["Member", "Admin"]}
              value={memberRole}
              onChange={setMemberRole}
            />
            <button type="button" className="ghost add-chip-btn" onClick={addInitialMember}>
              <Plus size={15} /> Add
            </button>
          </div>

          {form.initialMembers.length > 0 && (
            <div className="initial-members-list">
              {form.initialMembers.map((m) => (
                <span className="member-invite-chip" key={m.email}>
                  <span>{m.email}</span>
                  <span className={`role role-${m.role}`}>{m.role}</span>
                  <button type="button" className="chip-remove" onClick={() => removeInitialMember(m.email)}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="form-actions modal-footer">
          <button className="ghost" type="button" onClick={onClose}>Cancel</button>
          <button className="primary" type="submit" disabled={loading}>
            <Plus size={16} /> Create Project
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

function ProjectSelector({
  projects,
  selectedProjectId,
  onSelectProject,
  onOpenCreateProject
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedProject = projects.find((p) => p._id === selectedProjectId) || projects[0];

  const filteredProjects = useMemo(() => {
    if (!query.trim()) return projects;
    const q = query.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.role && p.role.toLowerCase().includes(q))
    );
  }, [projects, query]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredProjects.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredProjects.length - 1
      );
    } else if (e.key === "Enter" && filteredProjects[highlightedIndex]) {
      e.preventDefault();
      onSelectProject(filteredProjects[highlightedIndex]._id);
      setIsOpen(false);
    }
  };

  return (
    <div className="project-selector-wrapper" ref={dropdownRef} onKeyDown={handleKeyDown}>
      <button
        type="button"
        className={`project-selector-trigger ${isOpen ? "open" : ""}`}
        onClick={() => {
          setIsOpen((prev) => !prev);
          setQuery("");
        }}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Switch project"
      >
        <div className="project-selector-trigger-content">
          <FolderKanban size={17} className="project-selector-icon" />
          <span className="project-selector-name" title={selectedProject?.name}>
            {selectedProject?.name || "Select Project"}
          </span>
          {selectedProject?.role && (
            <span className={`role role-${selectedProject.role}`}>
              {selectedProject.role}
            </span>
          )}
          <span className="project-selector-count" title={`${projects.length} total projects`}>
            {projects.length}
          </span>
        </div>
        <ChevronDown size={15} className={`project-selector-chevron ${isOpen ? "rotated" : ""}`} />
      </button>

      {isOpen && (
        <div className="project-selector-menu">
          <div className="project-selector-search-row">
            <Search size={14} className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search projects..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="project-selector-search-input"
            />
            {query && (
              <button
                type="button"
                className="project-selector-clear-btn"
                onClick={() => setQuery("")}
                title="Clear"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="project-selector-list">
            {filteredProjects.length === 0 ? (
              <div className="project-selector-empty">
                <FolderKanban size={24} className="empty-icon" />
                <p>No projects match "{query}"</p>
              </div>
            ) : (
              filteredProjects.map((project, idx) => {
                const isSelected = project._id === selectedProjectId;
                const isHighlighted = idx === highlightedIndex;
                return (
                  <button
                    key={project._id}
                    type="button"
                    className={`project-selector-item ${isSelected ? "selected" : ""} ${isHighlighted ? "highlighted" : ""}`}
                    onClick={() => {
                      onSelectProject(project._id);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                  >
                    <div className="project-item-left">
                      <div className={`project-item-badge ${isSelected ? "active" : ""}`}>
                        <FolderKanban size={15} />
                      </div>
                      <div className="project-item-info">
                        <span className="project-item-title">{project.name}</span>
                        <div className="project-item-tags">
                          <span className={`role role-${project.role || "Member"}`}>
                            {project.role || "Member"}
                          </span>
                          {project.status && (
                            <span className={`project-status-dot ${project.status.toLowerCase()}`}>
                              {project.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <Check size={16} className="project-item-check" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="project-selector-footer">
            <button
              type="button"
              className="project-selector-new-btn"
              onClick={() => {
                setIsOpen(false);
                onOpenCreateProject();
              }}
            >
              <Plus size={15} />
              <span>New Project</span>
            </button>
            <span className="project-selector-total-info">
              {projects.length} project{projects.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateProject({ onCreated }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="primary wide" onClick={() => setOpen(true)}>
        <Plus size={17} /> New project
      </button>

      {open && (
        <CreateProjectModal
          onClose={() => setOpen(false)}
          onCreated={(newProj) => {
            onCreated(newProj);
          }}
        />
      )}
    </>
  );
}

function Stats({ dashboard }) {
  const counts = dashboard?.counts || {};
  const items = [
    ["Projects", counts.projects || 0, <FolderKanban size={18} />],
    ["Tasks", counts.total || 0, <CheckSquare size={18} />],
    ["In progress", counts.inProgress || 0, <Clock size={18} />],
    ["Overdue", counts.overdue || 0, <AlertCircle size={18} />],
    ["Spent / Budget", `₹${(counts.totalSpent || 0).toLocaleString()} / ₹${(counts.totalBudget || 0).toLocaleString()}`, <Wallet size={18} />]
  ];

  return (
    <section className="stats">
      {items.map(([label, value, icon], index) => (
        <article key={label} className={`stat-card stat-${index + 1}`}>
          <div className="stat-card-head">
            <div className="stat-icon-wrapper">{icon}</div>
            <span>{label}</span>
          </div>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}

function ExcelImportModal({ rows: initialRows, project, onClose, onSaved }) {
  const [parentTaskName, setParentTaskName] = useState("");
  const [rows, setRows] = useState(initialRows);
  const [submitting, setSubmitting] = useState(false);

  const statusOptions = [
    "Order Placed",
    "Material in Transit",
    "Order Received",
    "Order Accepted",
    "Order Rejected",
    "Order Returned"
  ];
  
  const actionOptions = ["Fabrication", "Purchase"];

  const memberOptions = [
    { value: "", label: "Unassigned" },
    ...(project.members || []).map((m) => ({
      value: m.user._id,
      label: m.user.name
    }))
  ];

  const updateRowField = (index, field, val) => {
    setRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: val } : row));
  };

  async function handleCreate(e) {
    e.preventDefault();
    if (!parentTaskName.trim()) {
      alert("Please enter the Parent Task Name.");
      return;
    }

    setSubmitting(true);
    try {
      // Find the latest due date from sub-tasks or use default (e.g. today + 7 days)
      const validDates = rows.map(r => r.dueDate).filter(Boolean);
      const parentDueDate = validDates.length > 0 
        ? new Date(Math.max(...validDates.map(d => new Date(d)))) 
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const parentTaskBody = {
        title: parentTaskName,
        description: `Imported from Excel with ${rows.length} sub-tasks.`,
        status: "Todo",
        priority: "Medium",
        dueDate: parentDueDate.toISOString(),
        subTasks: rows.map(r => ({
          sequenceNo: r.sequenceNo,
          name: r.name,
          description: r.description,
          quantity: r.quantity,
          status: r.status,
          action: r.action,
          assignedTo: r.assignedTo || null,
          dueDate: r.dueDate ? new Date(r.dueDate).toISOString() : null
        }))
      };

      await api(`/tasks/project/${project._id}`, {
        method: "POST",
        body: JSON.stringify(parentTaskBody)
      });

      onSaved();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="modal-backdrop">
      <div className="excel-import-modal modal-form max-width-large">
        <div className="form-head">
          <h3>Import Tasks from Excel</h3>
          <button type="button" className="icon-button compact" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="field-group" style={{ marginBottom: "16px" }}>
          <label>Parent Task Name</label>
          <input
            required
            placeholder="e.g. Fabrication Order #104"
            value={parentTaskName}
            onChange={(e) => setParentTaskName(e.target.value)}
          />
        </div>

        <div className="excel-table-container">
          <table className="excel-table">
            <thead>
              <tr>
                <th>Sequence No</th>
                <th>Sub-task Name</th>
                <th>Description</th>
                <th>Quantity</th>
                <th>Current Status</th>
                <th>Action</th>
                <th>Assign Member</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  <td>
                    <input
                      className="table-input"
                      value={row.sequenceNo}
                      onChange={(e) => updateRowField(index, "sequenceNo", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      required
                      className="table-input"
                      value={row.name}
                      onChange={(e) => updateRowField(index, "name", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="table-input"
                      placeholder="Optional"
                      value={row.description}
                      onChange={(e) => updateRowField(index, "description", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      className="table-input"
                      style={{ width: "70px" }}
                      value={row.quantity}
                      onChange={(e) => updateRowField(index, "quantity", Number(e.target.value) || 0)}
                    />
                  </td>
                  <td>
                    <CustomSelect
                      className="table-select"
                      options={statusOptions}
                      value={row.status}
                      onChange={(val) => updateRowField(index, "status", val)}
                    />
                  </td>
                  <td>
                    <CustomSelect
                      className="table-select"
                      options={actionOptions}
                      value={row.action}
                      onChange={(val) => updateRowField(index, "action", val)}
                    />
                  </td>
                  <td>
                    <CustomSelect
                      className="table-select"
                      options={memberOptions}
                      value={row.assignedTo}
                      onChange={(val) => updateRowField(index, "assignedTo", val)}
                      placeholder="Unassigned"
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      className="table-input table-date"
                      value={row.dueDate}
                      onChange={(e) => updateRowField(index, "dueDate", e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="form-actions modal-footer">
          <button className="ghost" type="button" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="primary" type="button" onClick={handleCreate} disabled={submitting}>
            Create Task
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ExcelImportButton({ project, onSaved }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        const findVal = (row, patterns) => {
          const key = Object.keys(row).find(k => 
            patterns.some(p => k.toLowerCase().replace(/[^a-z0-9]/g, "") === p.toLowerCase().replace(/[^a-z0-9]/g, ""))
          );
          return key ? row[key] : "";
        };

        const parsedRows = json.map((row) => {
          const sequenceNo = findVal(row, ["itemno", "itemnumber", "item", "slno", "serialno", "sequenceno", "number", "item no"]);
          const name = findVal(row, ["partnumber", "partno", "part", "name", "subtaskname", "part number"]);
          const description = findVal(row, ["description", "desc", "descriptionofsubtask"]);
          const quantity = Number(findVal(row, ["qty", "quantity", "qty."])) || 1;

          return {
            sequenceNo: String(sequenceNo),
            name: String(name),
            description: String(description),
            quantity,
            status: "Order Placed",
            action: "Fabrication",
            assignedTo: "",
            dueDate: ""
          };
        }).filter(r => r.name);

        if (parsedRows.length === 0) {
          alert("Could not find any valid rows with a 'Part Number' / 'Sub-task Name' in the uploaded Excel file.");
          return;
        }

        setRows(parsedRows);
        setOpen(true);
      } catch (err) {
        alert("Error parsing file: " + err.message);
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <>
      <input
        type="file"
        accept=".xlsx, .xls, .csv"
        style={{ display: "none" }}
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <button className="ghost excel-import-btn" type="button" onClick={() => fileInputRef.current?.click()}>
        <FileSpreadsheet size={16} />
        <span>Import Excel</span>
      </button>

      {open && (
        <ExcelImportModal
          rows={rows}
          project={project}
          onClose={() => setOpen(false)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}

function TaskForm({ project, onSaved }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignedTo: [],
    priority: "Medium",
    dueDate: "",
    estimatedCost: 0,
    actualCost: 0
  });

  async function submit(event) {
    event.preventDefault();
    await api(`/tasks/project/${project._id}`, {
      method: "POST",
      body: JSON.stringify({
        ...form,
        estimatedCost: Number(form.estimatedCost) || 0,
        actualCost: Number(form.actualCost) || 0,
        dueDate: new Date(form.dueDate).toISOString()
      })
    });
    setForm({ title: "", description: "", assignedTo: [], priority: "Medium", dueDate: "", estimatedCost: 0, actualCost: 0 });
    setOpen(false);
    onSaved();
  }

  const toggleAssignee = (userId) => {
    setForm((prev) => ({
      ...prev,
      assignedTo: prev.assignedTo.includes(userId)
        ? prev.assignedTo.filter((id) => id !== userId)
        : [...prev.assignedTo, userId]
    }));
  };

  return (
    <>
      <button className="primary add-task-btn" type="button" onClick={() => setOpen(true)}>
        <Plus size={16} />
        <span>Task</span>
      </button>
      {open && createPortal(
        <div className="modal-backdrop">
          <form className="task-form modal-form" onSubmit={submit}>
            <div className="form-head">
              <h3>Create New Task</h3>
              <button type="button" className="icon-button compact" onClick={() => setOpen(false)}><X size={16} /></button>
            </div>
            <input required minLength="2" placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <textarea placeholder="Task description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="picker-block">
              <label className="picker-label">Assign Members:</label>
              <div className="picker-options">
                {project.members.map((member) => {
                  const selected = form.assignedTo.includes(member.user._id);
                  return (
                    <button
                      type="button"
                      key={member.user._id}
                      className={`picker-pill ${selected ? "selected" : ""}`}
                      onClick={() => toggleAssignee(member.user._id)}
                    >
                      {member.user.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="form-row">
              <div className="field-group">
                <label>Est. Cost (₹):</label>
                <input type="number" min="0" step="any" placeholder="0" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })} />
              </div>
              <div className="field-group">
                <label>Actual Spent (₹):</label>
                <input type="number" min="0" step="any" placeholder="0" value={form.actualCost} onChange={(e) => setForm({ ...form, actualCost: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="field-group">
                <label>Priority:</label>
                <CustomSelect
                  options={priorities}
                  value={form.priority}
                  onChange={(val) => setForm({ ...form, priority: val })}
                />
              </div>
              <div className="field-group">
                <label>Due Date:</label>
                <input required type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
            </div>
            <div className="form-actions">
              <button className="ghost" type="button" onClick={() => setOpen(false)}>Cancel</button>
              <button className="primary" type="submit"><CheckCircle2 size={16} />Create Task</button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </>
  );
}

function EditTaskModal({ task, project, role, user, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: task.title || "",
    description: task.description || "",
    assignedTo: Array.isArray(task.assignedTo)
      ? task.assignedTo.map((u) => u._id || u)
      : task.assignedTo ? [task.assignedTo._id || task.assignedTo] : [],
    priority: task.priority || "Medium",
    status: task.status || "Todo",
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
    estimatedCost: task.estimatedCost || 0,
    actualCost: task.actualCost || 0,
    subTasks: (task.subTasks || []).map((st) => ({
      _id: st._id,
      sequenceNo: st.sequenceNo || "",
      name: st.name || "",
      description: st.description || "",
      quantity: st.quantity || 1,
      status: st.status || "Order Placed",
      action: st.action || "Fabrication",
      assignedTo: st.assignedTo?._id || st.assignedTo || "",
      dueDate: st.dueDate ? new Date(st.dueDate).toISOString().slice(0, 10) : ""
    }))
  });

  const toggleAssignee = (userId) => {
    setForm((prev) => ({
      ...prev,
      assignedTo: prev.assignedTo.includes(userId)
        ? prev.assignedTo.filter((id) => id !== userId)
        : [...prev.assignedTo, userId]
    }));
  };

  async function submit(event) {
    event.preventDefault();
    await api(`/tasks/${task._id}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...form,
        estimatedCost: Number(form.estimatedCost) || 0,
        actualCost: Number(form.actualCost) || 0,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        subTasks: form.subTasks.map(r => ({
          sequenceNo: r.sequenceNo,
          name: r.name,
          description: r.description,
          quantity: r.quantity,
          status: r.status,
          action: r.action,
          assignedTo: r.assignedTo || null,
          dueDate: r.dueDate ? new Date(r.dueDate).toISOString() : null
        }))
      })
    });
    onSaved();
    onClose();
  }

  async function deleteTask() {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    await api(`/tasks/${task._id}`, { method: "DELETE" });
    onSaved();
    onClose();
  }

  const isAdmin = role === "Admin";
  const isAssignee = form.assignedTo.includes(user._id);

  const canEditMainFields = isAdmin;
  const canEditCostsAndStatus = isAdmin || isAssignee;

  return createPortal(
    <div className="modal-backdrop">
      <form className={`task-form modal-form ${form.subTasks.length > 0 ? "excel-import-modal" : ""}`} onSubmit={submit}>
        <div className="form-head">
          <h3>Edit Task / Assignees</h3>
          <button type="button" className="icon-button compact" onClick={onClose}><X size={16} /></button>
        </div>
        
        <div className="field-group">
          <label>Task Title</label>
          <input
            required
            minLength="2"
            placeholder="Task title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            disabled={!canEditMainFields}
          />
        </div>

        <div className="field-group">
          <label>Task Description</label>
          <textarea
            placeholder="Task description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            disabled={!canEditMainFields}
          />
        </div>

        <div className="picker-block">
          <label className="picker-label">Assign Members:</label>
          <div className="picker-options">
            {project.members.map((member) => {
              const selected = form.assignedTo.includes(member.user._id);
              return (
                <button
                  type="button"
                  key={member.user._id}
                  className={`picker-pill ${selected ? "selected" : ""}`}
                  onClick={() => toggleAssignee(member.user._id)}
                >
                  {member.user.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label>Est. Cost (₹):</label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="0"
              value={form.estimatedCost}
              onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })}
              disabled={!canEditCostsAndStatus}
            />
          </div>
          <div className="field-group">
            <label>Actual Spent (₹):</label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="0"
              value={form.actualCost}
              onChange={(e) => setForm({ ...form, actualCost: e.target.value })}
              disabled={!canEditCostsAndStatus}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label>Status:</label>
            <CustomSelect
              options={statuses}
              value={form.status}
              onChange={(val) => setForm({ ...form, status: val })}
              disabled={!canEditCostsAndStatus}
            />
          </div>
          <div className="field-group">
            <label>Priority:</label>
            <CustomSelect
              options={priorities}
              value={form.priority}
              onChange={(val) => setForm({ ...form, priority: val })}
              disabled={!canEditMainFields}
            />
          </div>
          <div className="field-group">
            <label>Due Date:</label>
            <input
              required
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              disabled={!canEditMainFields}
            />
          </div>
        </div>

        {form.subTasks.length > 0 && (
          <div className="subtasks-section">
            <label className="picker-label">Sub-tasks / Line Items</label>
            <div className="excel-table-container">
              <table className="excel-table">
                <thead>
                  <tr>
                    <th>Seq No</th>
                    <th>Sub-task Name</th>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Status</th>
                    <th>Action</th>
                    <th>Assignee</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {form.subTasks.map((row, idx) => (
                    <tr key={idx}>
                      <td>
                        <input
                          className="table-input"
                          value={row.sequenceNo}
                          onChange={(e) => {
                            const updated = [...form.subTasks];
                            updated[idx].sequenceNo = e.target.value;
                            setForm({ ...form, subTasks: updated });
                          }}
                        />
                      </td>
                      <td>
                        <input
                          required
                          className="table-input"
                          value={row.name}
                          onChange={(e) => {
                            const updated = [...form.subTasks];
                            updated[idx].name = e.target.value;
                            setForm({ ...form, subTasks: updated });
                          }}
                        />
                      </td>
                      <td>
                        <input
                          className="table-input"
                          placeholder="Optional"
                          value={row.description}
                          onChange={(e) => {
                            const updated = [...form.subTasks];
                            updated[idx].description = e.target.value;
                            setForm({ ...form, subTasks: updated });
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          className="table-input"
                          style={{ width: "65px" }}
                          value={row.quantity}
                          onChange={(e) => {
                            const updated = [...form.subTasks];
                            updated[idx].quantity = Number(e.target.value) || 0;
                            setForm({ ...form, subTasks: updated });
                          }}
                        />
                      </td>
                      <td>
                        <CustomSelect
                          className="table-select"
                          options={[
                            "Order Placed",
                            "Material in Transit",
                            "Order Received",
                            "Order Accepted",
                            "Order Rejected",
                            "Order Returned"
                          ]}
                          value={row.status}
                          onChange={(val) => {
                            const updated = [...form.subTasks];
                            updated[idx].status = val;
                            setForm({ ...form, subTasks: updated });
                          }}
                        />
                      </td>
                      <td>
                        <CustomSelect
                          className="table-select"
                          options={["Fabrication", "Purchase"]}
                          value={row.action}
                          onChange={(val) => {
                            const updated = [...form.subTasks];
                            updated[idx].action = val;
                            setForm({ ...form, subTasks: updated });
                          }}
                        />
                      </td>
                      <td>
                        <CustomSelect
                          className="table-select"
                          options={[
                            { value: "", label: "Unassigned" },
                            ...(project.members || []).map((m) => ({
                              value: m.user._id,
                              label: m.user.name
                            }))
                          ]}
                          value={row.assignedTo}
                          onChange={(val) => {
                            const updated = [...form.subTasks];
                            updated[idx].assignedTo = val;
                            setForm({ ...form, subTasks: updated });
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          className="table-input table-date"
                          value={row.dueDate}
                          onChange={(e) => {
                            const updated = [...form.subTasks];
                            updated[idx].dueDate = e.target.value;
                            setForm({ ...form, subTasks: updated });
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="form-actions">
          {isAdmin && (
            <button className="danger-button" type="button" onClick={deleteTask}>
              <Trash2 size={16} /> Delete
            </button>
          )}
          <button className="primary" type="submit">
            <CheckCircle2 size={16} /> Save Changes
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

function TaskExpenseModal({ task, user, role, onClose, onSaved }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = role === "Admin";
  const expensesList = task.expenses || [];

  async function handleAddExpense(e) {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    setLoading(true);
    setError("");
    try {
      await api(`/tasks/${task._id}/expenses`, {
        method: "POST",
        body: JSON.stringify({
          amount: parseFloat(amount),
          note
        })
      });
      setAmount("");
      setNote("");
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteExpense(expenseId) {
    if (!window.confirm("Remove this expense entry?")) return;
    try {
      await api(`/tasks/${task._id}/expenses/${expenseId}`, {
        method: "DELETE"
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  }

  return createPortal(
    <div className="modal-backdrop">
      <div className="task-form modal-form expense-log-modal">
        <div className="form-head">
          <div>
            <h3>Task Expenses</h3>
            <p className="subtitle">{task.title}</p>
          </div>
          <button type="button" className="icon-button compact" onClick={onClose}><X size={16} /></button>
        </div>

        {error && <p className="notice error">{error}</p>}

        <div className="task-expense-summary">
          <div className="summary-box">
            <span>Total Actual Spent</span>
            <strong className="text-accent">₹{(task.actualCost || 0).toLocaleString()}</strong>
          </div>
          <div className="summary-box">
            <span>Estimated Cost</span>
            <strong>₹{(task.estimatedCost || 0).toLocaleString()}</strong>
          </div>
        </div>

        <form className="add-expense-box" onSubmit={handleAddExpense}>
          <h4>Add Individual Expense</h4>
          <div className="form-row">
            <input
              type="number"
              min="0.01"
              step="any"
              required
              placeholder="Amount (₹)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <input
              type="text"
              placeholder="Note (e.g. Hosting, Software license)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button className="primary" type="submit" disabled={loading}>
              <Plus size={16} /> Log Expense
            </button>
          </div>
        </form>

        <div className="expense-history-section">
          <h4>Expense Breakdown ({expensesList.length})</h4>
          {expensesList.length > 0 ? (
            <div className="expense-history-list">
              {expensesList.map((item) => {
                const addedByName = item.addedBy?.name || item.addedBy || "Member";
                const addedById = item.addedBy?._id || item.addedBy;
                const canDelete = isAdmin || addedById === user._id;

                return (
                  <div className="expense-item-row" key={item._id}>
                    <div className="expense-item-info">
                      <div className="expense-item-head">
                        <strong>₹{item.amount.toLocaleString()}</strong>
                        <span className="expense-item-user">by {addedByName}</span>
                        <span className="expense-item-date">{new Date(item.date).toLocaleDateString()}</span>
                      </div>
                      {item.note && <p className="expense-item-note">{item.note}</p>}
                    </div>
                    {canDelete && (
                      <button
                        type="button"
                        className="icon-button compact danger-icon"
                        onClick={() => handleDeleteExpense(item._id)}
                        title="Delete expense entry"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="muted empty-expenses">No individual expenses logged yet for this task.</p>
          )}
        </div>

        <div className="form-actions">
          <button className="ghost" type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function TaskBoard({ tasks, role, user, project, onChange }) {
  const [editingTask, setEditingTask] = useState(null);
  const [expenseTask, setExpenseTask] = useState(null);

  const activeExpenseTask = useMemo(
    () => (expenseTask ? tasks.find((t) => t._id === expenseTask._id) || expenseTask : null),
    [tasks, expenseTask]
  );

  const grouped = useMemo(
    () => Object.fromEntries(statuses.map((status) => [status, tasks.filter((task) => task.status === status)])),
    [tasks]
  );

  async function updateStatus(task, status) {
    await api(`/tasks/${task._id}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    onChange();
  }

  const columnIcons = {
    "Todo": <Circle size={13} className="col-status-icon todo" />,
    "In Progress": <Clock size={13} className="col-status-icon progress" />,
    "Done": <CheckCircle2 size={13} className="col-status-icon done" />
  };

  const priorityIcons = {
    High: <ArrowUpRight size={12} />,
    Medium: <Minus size={12} />,
    Low: <ArrowDownRight size={12} />
  };

  return (
    <>
      <div className="task-board">
        {statuses.map((status) => (
          <section className="task-column" key={status}>
            <div className="column-head">
              <div className="column-title-group">
                {columnIcons[status] || <Circle size={13} />}
                <h3>{status}</h3>
              </div>
              <span>{grouped[status].length}</span>
            </div>
            {grouped[status].map((task) => {
              const assignees = Array.isArray(task.assignedTo)
                ? task.assignedTo
                : task.assignedTo ? [task.assignedTo] : [];

              const isAssignee = assignees.some((u) => (u._id || u) === user._id);
              const canChangeStatus = role === "Admin" || isAssignee;
              const isAdmin = role === "Admin";

              return (
                <article className="task-card" key={task._id}>
                  <div className="task-meta">
                    <span className={`priority priority-${task.priority}`}>
                      {priorityIcons[task.priority]}
                      <span>{task.priority}</span>
                    </span>
                    <span className="date">
                      <Calendar size={12} />
                      <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                    </span>
                    <div className="task-card-actions">
                      {canChangeStatus && (
                        <button
                          type="button"
                          className="icon-button compact log-expense-btn"
                          onClick={() => setExpenseTask(task)}
                          title="Log or view individual expenses"
                        >
                          <Receipt size={14} />
                        </button>
                      )}
                      <button className="icon-button compact edit-task-btn" type="button" onClick={() => setEditingTask(task)} title="Edit task / Assignees">
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>
                  <h4>{task.title}</h4>
                  {task.description && <p>{task.description}</p>}
                  <div className="assignees-row">
                    {assignees.length > 0 ? (
                      assignees.map((assignee) => (
                        <span key={assignee._id || assignee} className="assignee-tag">
                          {assignee.name || "Member"}
                        </span>
                      ))
                    ) : (
                      <small className="unassigned">Unassigned</small>
                    )}
                  </div>
                  {(task.estimatedCost > 0 || task.actualCost > 0 || (task.expenses && task.expenses.length > 0)) && (
                    <div
                      className="task-cost-badge clickable"
                      onClick={() => setExpenseTask(task)}
                      title="Click to view or log expenses"
                    >
                      <Receipt size={12} />
                      <span>Spent: ₹{task.actualCost || 0} / Est: ₹{task.estimatedCost || 0}</span>
                    </div>
                  )}
                  <CustomSelect
                    options={statuses}
                    value={task.status}
                    onChange={(val) => updateStatus(task, val)}
                    disabled={!canChangeStatus}
                  />
                </article>
              );
            })}
            {!grouped[status].length && <p className="muted empty-column">No tasks here yet</p>}
          </section>
        ))}
      </div>
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          project={project}
          role={role}
          user={user}
          onClose={() => setEditingTask(null)}
          onSaved={onChange}
        />
      )}
      {activeExpenseTask && (
        <TaskExpenseModal
          task={activeExpenseTask}
          user={user}
          role={role}
          onClose={() => setExpenseTask(null)}
          onSaved={onChange}
        />
      )}
    </>
  );
}

function TeamPanel({ project, isAdmin, onChanged }) {
  const [form, setForm] = useState({ email: "", role: "Member" });

  async function addMember(event) {
    event.preventDefault();
    await api(`/projects/${project._id}/members`, {
      method: "POST",
      body: JSON.stringify(form)
    });
    setForm({ email: "", role: "Member" });
    onChanged();
  }

  async function changeRole(userId, newRole) {
    await api(`/projects/${project._id}/members/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ role: newRole })
    });
    onChanged();
  }

  async function removeMember(userId) {
    if (!window.confirm("Are you sure you want to remove this member from the project?")) return;
    await api(`/projects/${project._id}/members/${userId}`, {
      method: "DELETE"
    });
    onChanged();
  }

  return (
    <>
      <div className="panel-title compact">
        <div>
          <h2>Team</h2>
          <p>{project.members.length} member{project.members.length === 1 ? "" : "s"}</p>
        </div>
        <Users size={21} />
      </div>
      {isAdmin && (
        <form className="member-form" onSubmit={addMember}>
          <div className="input-with-icon">
            <Search size={16} />
            <input type="email" required placeholder="Invite by email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <CustomSelect
            options={["Member", "Admin"]}
            value={form.role}
            onChange={(val) => setForm({ ...form, role: val })}
          />
          <button className="primary" type="submit"><Plus size={16} />Add</button>
        </form>
      )}
      <div className="member-list">
        {project.members.map((member) => {
          const isOwner = project.owner === member.user._id || project.owner?._id === member.user._id;

          return (
            <article key={member.user._id} className="member-item">
              <div className="avatar">{member.user.name.slice(0, 1).toUpperCase()}</div>
              <div className="member-info">
                <strong>{member.user.name}</strong>
                <span>{member.user.email}</span>
              </div>
              {isAdmin && !isOwner ? (
                <div className="member-actions">
                  <CustomSelect
                    className="role-select"
                    options={["Member", "Admin"]}
                    value={member.role}
                    onChange={(val) => changeRole(member.user._id, val)}
                  />
                  <button
                    type="button"
                    className="icon-button danger-icon"
                    onClick={() => removeMember(member.user._id)}
                    title="Remove member"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ) : (
                <em className={`role-badge role-${member.role}`}>{member.role}</em>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
