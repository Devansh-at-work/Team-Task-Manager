import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertCircle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Eye,
  EyeOff,
  FolderKanban,
  LogOut,
  Moon,
  Plus,
  Search,
  Sparkles,
  Sun,
  Users
} from "lucide-react";
import { api, getToken, setToken } from "./api/client";
import "./styles.css";

const statuses = ["Todo", "In Progress", "Done"];
const priorities = ["Low", "Medium", "High"];

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
  const pointerRef = useRef({ x: -120, y: -120 });
  const currentRef = useRef({ x: -120, y: -120 });
  const [active, setActive] = useState(false);

  useEffect(() => {
    let frame = 0;
    const move = (event) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };
    };
    const enter = () => setActive(true);
    const leave = () => setActive(false);
    const render = () => {
      const current = currentRef.current;
      const pointer = pointerRef.current;
      current.x += (pointer.x - current.x) * 0.18;
      current.y += (pointer.y - current.y) * 0.18;

      if (auraRef.current) {
        auraRef.current.style.transform = `translate3d(${current.x}px, ${current.y}px, 0) translate(-50%, -50%)`;
      }

      frame = window.requestAnimationFrame(render);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerdown", enter);
    window.addEventListener("pointerup", leave);
    window.addEventListener("pointerleave", leave);
    frame = window.requestAnimationFrame(render);

    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", enter);
      window.removeEventListener("pointerup", leave);
      window.removeEventListener("pointerleave", leave);
      window.cancelAnimationFrame(frame);
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
              <Sparkles size={18} />
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

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="header-main">
          <div className="sidebar-head">
            <div className="brand-mark"><FolderKanban size={26} /></div>
            <div>
              <strong>Task Manager</strong>
              <span>{user.name}</span>
            </div>
          </div>
          <nav className="project-list" aria-label="Projects">
            {projects.map((project) => (
              <button
                key={project._id}
                className={selectedProjectId === project._id ? "active" : ""}
                onClick={() => setSelectedProjectId(project._id)}
              >
                <FolderKanban size={16} />
                <span>{project.name}</span>
              </button>
            ))}
          </nav>
          <div className="header-actions">
            <CreateProject onCreated={async () => refresh()} />
            <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
            <button className="ghost logout" onClick={onLogout}><LogOut size={17} />Logout</button>
          </div>
        </div>
      </header>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>{selectedProject?.name || "Create a project to begin"}</h1>
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
          <span className={`role role-${role || "Member"}`}>{role || "Member"}</span>
        </header>

        {message && <p className="notice">{message}</p>}
        <Stats dashboard={dashboard} />

        {selectedProject ? (
          <div className="work-grid">
            <section className="panel main-panel">
              <div className="panel-title">
                <div>
                  <h2>Tasks</h2>
                  <p>{tasks.length} task{tasks.length === 1 ? "" : "s"} in this project</p>
                </div>
                {isAdmin && <TaskForm project={selectedProject} onSaved={refresh} />}
              </div>
              <TaskBoard tasks={tasks} role={role} user={user} project={selectedProject} onChange={refresh} />
            </section>
            <section className="panel side-panel">
              <TeamPanel project={selectedProject} isAdmin={isAdmin} onChanged={refresh} />
            </section>
          </div>
        ) : (
          <section className="empty-state">
            <FolderKanban size={46} />
            <h2>No projects yet</h2>
            <p>Create your first project from the top bar.</p>
          </section>
        )}
      </section>
    </main>
  );
}

function CreateProject({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  async function submit(event) {
    event.preventDefault();
    await api("/projects", { method: "POST", body: JSON.stringify(form) });
    setForm({ name: "", description: "" });
    setOpen(false);
    onCreated();
  }

  return open ? (
    <form className="mini-form" onSubmit={submit}>
      <input placeholder="Project name" required minLength="2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <button className="primary" type="submit"><Plus size={16} />Create</button>
    </form>
  ) : (
    <button className="primary wide" onClick={() => setOpen(true)}><Plus size={17} />New project</button>
  );
}

function Stats({ dashboard }) {
  const counts = dashboard?.counts || {};
  const items = [
    ["Projects", counts.projects || 0, <FolderKanban size={20} />],
    ["Tasks", counts.total || 0, <BarChart3 size={20} />],
    ["In progress", counts.inProgress || 0, <CalendarClock size={20} />],
    ["Overdue", counts.overdue || 0, <AlertCircle size={20} />]
  ];

  return (
    <section className="stats">
      {items.map(([label, value, icon], index) => (
        <article key={label} className={`stat-card stat-${index + 1}`}>
          {icon}
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}

function TaskForm({ project, onSaved }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignedTo: "",
    priority: "Medium",
    dueDate: ""
  });

  async function submit(event) {
    event.preventDefault();
    await api(`/tasks/project/${project._id}`, {
      method: "POST",
      body: JSON.stringify({
        ...form,
        assignedTo: form.assignedTo || null,
        dueDate: new Date(form.dueDate).toISOString()
      })
    });
    setForm({ title: "", description: "", assignedTo: "", priority: "Medium", dueDate: "" });
    setOpen(false);
    onSaved();
  }

  if (!open) return <button className="primary" onClick={() => setOpen(true)}><Plus size={16} />Task</button>;

  return (
    <form className="task-form" onSubmit={submit}>
      <input required minLength="2" placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}>
        <option value="">Unassigned</option>
        {project.members.map((member) => (
          <option key={member.user._id} value={member.user._id}>{member.user.name}</option>
        ))}
      </select>
      <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
        {priorities.map((priority) => <option key={priority}>{priority}</option>)}
      </select>
      <input required type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
      <button className="primary" type="submit"><CheckCircle2 size={16} />Save</button>
    </form>
  );
}

function TaskBoard({ tasks, role, user, project, onChange }) {
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

  return (
    <div className="task-board">
      {statuses.map((status) => (
        <section className="task-column" key={status}>
          <div className="column-head">
            <h3>{status}</h3>
            <span>{grouped[status].length}</span>
          </div>
          {grouped[status].map((task) => {
            const canChange = role === "Admin" || task.assignedTo?._id === user._id;
            return (
              <article className="task-card" key={task._id}>
                <div className="task-meta">
                  <span className={`priority priority-${task.priority}`}>{task.priority}</span>
                  <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                </div>
                <h4>{task.title}</h4>
                {task.description && <p>{task.description}</p>}
                <small>{task.assignedTo?.name || "Unassigned"}</small>
                <select disabled={!canChange} value={task.status} onChange={(e) => updateStatus(task, e.target.value)}>
                  {statuses.map((item) => <option key={item}>{item}</option>)}
                </select>
              </article>
            );
          })}
          {!grouped[status].length && <p className="muted empty-column">No tasks here yet</p>}
        </section>
      ))}
    </div>
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
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option>Member</option>
            <option>Admin</option>
          </select>
          <button className="primary" type="submit"><Plus size={16} />Add</button>
        </form>
      )}
      <div className="member-list">
        {project.members.map((member) => (
          <article key={member.user._id}>
            <div className="avatar">{member.user.name.slice(0, 1).toUpperCase()}</div>
            <div>
              <strong>{member.user.name}</strong>
              <span>{member.user.email}</span>
            </div>
            <em>{member.role}</em>
          </article>
        ))}
      </div>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
