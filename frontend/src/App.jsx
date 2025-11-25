import { useEffect, useState } from "react";
import "./App.css";

const DAILY_GOAL_MINUTES = 30;

const TEMPLATES = [
  { label: "Jogging 30 min (Medium)", type: "Jogging", duration_minutes: 30, intensity: "Medium" },
  { label: "Weights 45 min (High)", type: "Weightlifting", duration_minutes: 45, intensity: "High" },
  { label: "Yoga 20 min (Low)", type: "Yoga", duration_minutes: 20, intensity: "Low" },
];

function App() {
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

  // will retrieve the workouts when loaded
  useEffect(() => {
    setLoading(true);
    fetch("http://127.0.0.1:8000/workouts")
      .then((res) => res.json())
      .then((data) => setWorkouts(data))
      .catch(() => setError("Could not load workouts. Check backend."))
      .finally(() => setLoading(false));
  }, []);

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

    const payload = {
      type: form.type,
      duration_minutes: Number(form.duration_minutes),
      intensity: form.intensity,
      date: form.date || null,
    };

    try {
      if (editingId === null) {
        const res = await fetch("http://127.0.0.1:8000/workouts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const newWorkout = await res.json();
        setWorkouts((prev) => [...prev, newWorkout]);
      } else {
        const res = await fetch(`http://127.0.0.1:8000/workouts/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const updated = await res.json();
        setWorkouts((prev) => prev.map((w) => (w.id === editingId ? updated : w)));
      }

      resetForm();
    } catch (err) {
      setError("Error saving workout.");
      console.error(err);
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
    try {
      await fetch(`http://127.0.0.1:8000/workouts/${id}`, { method: "DELETE" });
      setWorkouts((prev) => prev.filter((w) => w.id !== id));
      if (editingId === id) resetForm();
    } catch (err) {
      setError("Error deleting workout.");
    }
  };

  // shows stats
  const totalMinutes = workouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);
  const averageDuration = workouts.length ? Math.round(totalMinutes / workouts.length) : 0;

  const todayISO = new Date().toISOString().slice(0, 10);
  const todaysMinutes = workouts
    .filter((w) => w.date === todayISO)
    .reduce((sum, w) => sum + (w.duration_minutes || 0), 0);

  const goalProgress = Math.min(100, Math.round((todaysMinutes / DAILY_GOAL_MINUTES) * 100));

  return (
    <div className="app">
      <header>
        <h1>OctoGym Tracker 🐙</h1>
        <p className="subtitle">Log your workouts, see past workouts, and watch your hard work add up!</p>
      </header>

      <main className="grid">
        
        {/* LEFT CARD — FORM */}
        <section className="card">
          <h2>{editingId ? "Edit Workout" : "Add Workout"}</h2>

          {error && <p className="error">{error}</p>}

          {/* ⭐ FORM IS NOW USING className="form" */}
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

        {/* RIGHT CARD — HISTORY */}
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

          <div className="goal">
            <p>
              <strong>Today:</strong> {todaysMinutes} / {DAILY_GOAL_MINUTES} min
            </p>
            <div className="goal-bar">
              <div className="goal-bar-fill" style={{ width: `${goalProgress}%` }} />
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

export default App;
