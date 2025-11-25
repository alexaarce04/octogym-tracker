import { useEffect, useState } from "react";
import "./App.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const API_BASE = "http://127.0.0.1:8000";
const DAILY_GOAL_MINUTES = 30;

const TEMPLATES = [
  { label: "Jogging 30 min (Medium)", type: "Jogging", duration_minutes: 30, intensity: "Medium" },
  { label: "Weights 45 min (High)", type: "Weightlifting", duration_minutes: 45, intensity: "High" },
  { label: "Yoga 20 min (Low)", type: "Yoga", duration_minutes: 20, intensity: "Low" },
];

const getLast7DaysSummary = (workouts) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString(undefined, { weekday: "short" }); 

    const minutes = workouts
      .filter((w) => w.date === iso)
      .reduce((sum, w) => sum + (w.duration_minutes || 0), 0);

    result.push({ day: label, minutes });
  }
  return result;
};

const getIntensityData = (workouts) => {
  const counts = { Low: 0, Medium: 0, High: 0, Other: 0 };

  workouts.forEach((w) => {
    const raw = (w.intensity || "").toLowerCase().trim();
    if (raw.startsWith("low")) counts.Low += w.duration_minutes || 0;
    else if (raw.startsWith("med")) counts.Medium += w.duration_minutes || 0;
    else if (raw.startsWith("high")) counts.High += w.duration_minutes || 0;
    else counts.Other += w.duration_minutes || 0;
  });

  return Object.entries(counts)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));
};

const PIE_COLORS = ["#22c55e", "#06b6d4", "#f97316", "#e11d48"];

function App() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("octogym_theme") || "dark"
  );

  useEffect(() => {
    localStorage.setItem("octogym_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const [token, setToken] = useState(() => localStorage.getItem("octogym_token") || "");
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem("octogym_email") || "");

  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
    mode: "login", 
  });
  const [authError, setAuthError] = useState("");

  const [workouts, setWorkouts] = useState([]);
  const [form, setForm] = useState({
    type: "",
    duration_minutes: "",
    intensity: "",
    date: "",
  });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setWorkouts([]);
      return;
    }

    const fetchWorkouts = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${API_BASE}/workouts`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          handleLogout();
          setError("Session expired. Please log in again.");
          return;
        }

        const data = await res.json();
        setWorkouts(data);
      } catch (err) {
        console.error(err);
        setError("Could not load workouts. Check backend.");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkouts();
  }, [token]);

  const handleAuthChange = (e) => {
    const { name, value } = e.target;
    setAuthForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleAuthMode = () => {
    setAuthError("");
    setAuthForm((prev) => ({
      ...prev,
      mode: prev.mode === "login" ? "register" : "login",
    }));
  };

  const saveAuth = (newToken, email) => {
    setToken(newToken);
    setUserEmail(email);
    localStorage.setItem("octogym_token", newToken);
    localStorage.setItem("octogym_email", email);
  };

  const handleLogout = () => {
    setToken("");
    setUserEmail("");
    localStorage.removeItem("octogym_token");
    localStorage.removeItem("octogym_email");
    setWorkouts([]);
    setEditingId(null);
  };

  const loginRequest = async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login-json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const msg = res.status === 401 ? "Incorrect email or password." : "Login failed.";
      throw new Error(msg);
    }

    const data = await res.json();
    return data.access_token;
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");

    const { email, password, mode } = authForm;
    if (!email || !password) {
      setAuthError("Please enter email and password.");
      return;
    }

    try {
      if (mode === "register") {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const msg = data.detail || "Registration failed.";
          throw new Error(msg);
        }

        const newToken = await loginRequest(email, password);
        saveAuth(newToken, email);
      } else {
        const newToken = await loginRequest(email, password);
        saveAuth(newToken, email);
      }

      setAuthForm((prev) => ({ ...prev, password: "" }));
    } catch (err) {
      console.error(err);
      setAuthError(err.message || "Authentication error.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const applyTemplate = (template) => {
    setForm({
      ...form,
      type: template.type,
      duration_minutes: String(template.duration_minutes),
      intensity: template.intensity,
    });
  };

  const resetForm = () => {
    setForm({
      type: "",
      duration_minutes: "",
      intensity: "",
      date: "",
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.type || !form.duration_minutes || !form.intensity) {
      setError("Please fill in type, duration, and intensity.");
      return;
    }

    if (!token) {
      setError("You must be logged in to save workouts.");
      return;
    }

    const payload = {
      type: form.type,
      duration_minutes: Number(form.duration_minutes),
      intensity: form.intensity,
      date: form.date || null,
    };

    try {
      if (editingId === null) {
        const res = await fetch(`${API_BASE}/workouts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (res.status === 401) {
          handleLogout();
          setError("Session expired. Please log in again.");
          return;
        }

        const newWorkout = await res.json();
        setWorkouts((prev) => [...prev, newWorkout]);
      } else {
        const res = await fetch(`${API_BASE}/workouts/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (res.status === 401) {
          handleLogout();
          setError("Session expired. Please log in again.");
          return;
        }

        const updated = await res.json();
        setWorkouts((prev) => prev.map((w) => (w.id === editingId ? updated : w)));
      }

      resetForm();
    } catch (err) {
      console.error(err);
      setError("Error saving workout.");
    }
  };

  const handleEdit = (workout) => {
    setEditingId(workout.id);
    setForm({
      type: workout.type,
      duration_minutes: String(workout.duration_minutes),
      intensity: workout.intensity,
      date: workout.date || "",
    });
  };

  const handleDelete = async (id) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/workouts/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        handleLogout();
        setError("Session expired. Please log in again.");
        return;
      }

      setWorkouts((prev) => prev.filter((w) => w.id !== id));
      if (editingId === id) resetForm();
    } catch (err) {
      setError("Error deleting workout.");
    }
  };

  const totalMinutes = workouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);
  const averageDuration = workouts.length ? Math.round(totalMinutes / workouts.length) : 0;

  const todayISO = new Date().toISOString().slice(0, 10);
  const todaysMinutes = workouts
    .filter((w) => w.date === todayISO)
    .reduce((sum, w) => sum + (w.duration_minutes || 0), 0);

  const goalProgress = Math.min(100, Math.round((todaysMinutes / DAILY_GOAL_MINUTES) * 100));

  const weeklyData = getLast7DaysSummary(workouts);
  const intensityData = getIntensityData(workouts);

  const weeklyTotalMinutes = weeklyData.reduce((sum, d) => sum + d.minutes, 0);
  const activeDaysThisWeek = weeklyData.filter((d) => d.minutes > 0).length;

  const streakDays = (() => {
    let s = 0;
    for (let i = weeklyData.length - 1; i >= 0; i--) {
      if (weeklyData[i].minutes > 0) s++;
      else break;
    }
    return s;
  })();

  return (
    <div className={`app ${theme === "light" ? "light" : "dark"}`}>
      <header>
        <div className="header-row">
          <div>
            <h1>OctoGym Tracker 🐙</h1>
            <p className="subtitle">
              Log your workouts, see past workouts, and watch your hard work add up!
            </p>
          </div>

          <div className="header-right">
            <button
              type="button"
              className="secondary small theme-toggle"
              onClick={toggleTheme}
            >
              {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
            </button>

            {token && (
              <div className="user-info">
                <p className="user-email">{userEmail}</p>
                <button className="secondary small" type="button" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* If not logged in, show auth layout */}
      {!token ? (
        <main>
          <section className="auth-layout">
            <div className="auth-hero">
              <div className="auth-badge">Track smarter · Stay consistent</div>
              <h2>Own your training data, not just your PRs.</h2>
              <p>
                OctoGym helps you log workouts, track streaks, and visualize progress with
                clean charts — all behind a secure, personal account.
              </p>

              <ul className="auth-features">
                <li>🔐 Secure login with JWT-based authentication</li>
                <li>📊 Weekly minutes, streaks, and intensity breakdown</li>
                <li>🐙 Clean dashboard for tracking your training over time</li>
              </ul>

              <p className="auth-note">
                Small sessions add up — a few logged workouts a week can still show real progress.
              </p>
            </div>

            <section className="card auth-card">
              <h2>
                {authForm.mode === "login"
                  ? "Welcome back to OctoGym"
                  : "Create your OctoGym account"}
              </h2>

              {authError && <p className="error">{authError}</p>}

              <form className="form" onSubmit={handleAuthSubmit}>
                <label>
                  Email
                  <input
                    type="email"
                    name="email"
                    value={authForm.email}
                    onChange={handleAuthChange}
                    placeholder="you@example.com"
                  />
                </label>

                <label>
                  Password
                  <input
                    type="password"
                    name="password"
                    value={authForm.password}
                    onChange={handleAuthChange}
                    placeholder="At least 8 characters"
                  />
                </label>

                <div className="auth-hint">
                  <span>Use a strong password.</span>
                </div>

                <div className="button-row">
                  <button type="submit">
                    {authForm.mode === "login" ? "Log In" : "Sign Up"}
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={toggleAuthMode}
                  >
                    {authForm.mode === "login"
                      ? "Need an account? Sign up"
                      : "Already have an account? Log in"}
                  </button>
                </div>
              </form>
            </section>
          </section>
        </main>
      ) : (
        <main>
          {/* DASHBOARD CARD */}
          <section className="card dashboard-card">
            <div className="dashboard-header">
              <div>
                <h2>Dashboard</h2>
                <p className="dashboard-subtitle">
                  Welcome back{userEmail ? `, ${userEmail.split("@")[0]}` : ""}. Here’s your week at a glance.
                </p>
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="dashboard-stat">
                <span className="dashboard-label">Today&apos;s minutes</span>
                <strong className="dashboard-value">{todaysMinutes} min</strong>
                <span className="dashboard-muted">Goal: {DAILY_GOAL_MINUTES} min</span>
                <div className="goal-bar dashboard-goal-bar">
                  <div
                    className="goal-bar-fill"
                    style={{ width: `${goalProgress}%` }}
                  />
                </div>
              </div>

              <div className="dashboard-stat">
                <span className="dashboard-label">This week</span>
                <strong className="dashboard-value">{weeklyTotalMinutes} min</strong>
                <span className="dashboard-muted">
                  Active days: {activeDaysThisWeek} / 7
                </span>
              </div>

              <div className="dashboard-stat">
                <span className="dashboard-label">Streak</span>
                <strong className="dashboard-value">
                  {streakDays} day{streakDays === 1 ? "" : "s"}
                </strong>
                <span className="dashboard-muted">Consecutive days with activity</span>
              </div>
            </div>
          </section>

          {/* MAIN GRID */}
          <div className="grid">
            {/* LEFT CARD — FORM */}
            <section className="card">
              <h2>{editingId ? "Edit Workout" : "Add Workout"}</h2>

              {error && <p className="error">{error}</p>}

              <form className="form" onSubmit={handleSubmit}>
                <label>
                  Type
                  <input
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    placeholder="Jogging, lifting, yoga..."
                  />
                </label>

                <label>
                  Duration (minutes)
                  <input
                    name="duration_minutes"
                    type="number"
                    value={form.duration_minutes}
                    onChange={handleChange}
                    placeholder="30"
                  />
                </label>

                <label>
                  Intensity
                  <input
                    name="intensity"
                    value={form.intensity}
                    onChange={handleChange}
                    placeholder="Low, Medium, High"
                  />
                </label>

                <label>
                  Date
                  <input
                    name="date"
                    type="date"
                    value={form.date}
                    onChange={handleChange}
                  />
                </label>

                <div className="button-row">
                  <button type="submit">{editingId ? "Save Changes" : "Save Workout"}</button>
                  {editingId && (
                    <button type="button" className="secondary" onClick={resetForm}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              {/* Quick templates */}
              <div className="templates">
                <p className="templates-label">Quick templates:</p>
                <div className="templates-row">
                  {TEMPLATES.map((t) => (
                    <button key={t.label} type="button" className="chip" onClick={() => applyTemplate(t)}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* MIDDLE CARD — HISTORY */}
            <section className="card">
              <h2>Workout History</h2>

              {loading ? (
                <p>Loading...</p>
              ) : workouts.length === 0 ? (
                <p>No workouts yet. LOCK IN! 👟</p>
              ) : (
                <ul className="workout-list">
                  {workouts.map((w) => (
                    <li key={w.id} className="workout-item">
                      <div>
                        <strong>{w.type}</strong> — {w.duration_minutes} min ({w.intensity})
                        <div className="meta">
                          <span>Date: {w.date}</span>
                        </div>
                      </div>

                      <div className="item-buttons">
                        <button className="small secondary" type="button" onClick={() => handleEdit(w)}>
                          Edit
                        </button>
                        <button className="small danger" type="button" onClick={() => handleDelete(w.id)}>
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="stats">
                <p><strong>Total workouts:</strong> {workouts.length}</p>
                <p><strong>Total minutes:</strong> {totalMinutes}</p>
                <p><strong>Average duration:</strong> {averageDuration} min</p>
              </div>
            </section>

            {/* RIGHT CARD — CHARTS / INSIGHTS */}
            <section className="card">
              <h2>Insights</h2>
              <div className="chart-grid">
                <div className="chart-block">
                  <h3>Last 7 days</h3>
                  <p className="chart-caption">Total minutes per day</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={weeklyData}>
                      <CartesianGrid stroke="rgba(148,163,184,0.3)" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="day"
                        interval={0}
                        tick={{ fill: "#e5e7eb", fontSize: 12 }}
                        axisLine={{ stroke: "rgba(148,163,184,0.6)" }}
                        tickLine={{ stroke: "rgba(148,163,184,0.6)" }}
                      />
                      <YAxis
                        tick={{ fill: "#9ca3af", fontSize: 12 }}
                        axisLine={{ stroke: "rgba(148,163,184,0.6)" }}
                        tickLine={{ stroke: "rgba(148,163,184,0.6)" }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#020617", border: "1px solid #4b5563" }}
                        labelStyle={{ color: "#e5e7eb" }}
                        itemStyle={{ color: "#e5e7eb" }}
                      />
                      <Bar
                        dataKey="minutes"
                        radius={[6, 6, 0, 0]}
                        fill="#38bdf8"
                        isAnimationActive={true}
                        animationDuration={700}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-block">
                  <h3>Intensity breakdown</h3>
                  <p className="chart-caption">Minutes by intensity</p>
                  {intensityData.length === 0 ? (
                    <p className="chart-empty">No intensity data yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={intensityData}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={80}
                          label
                        >
                          {intensityData.map((entry, index) => (
                            <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#020617", border: "1px solid #4b5563" }}
                          labelStyle={{ color: "#e5e7eb" }}
                          itemStyle={{ color: "#e5e7eb" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </section>
          </div>
        </main>
      )}
    </div>
  );
}

export default App;
