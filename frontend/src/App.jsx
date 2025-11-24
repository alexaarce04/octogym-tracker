import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [workouts, setWorkouts] = useState([]);
  const [form, setForm] = useState({
    id: "",
    type: "",
    duration_minutes: "",
    intensity: "",
  });

  // grobs workout from mem when app loads
  useEffect(() => {
    fetch("http://127.0.0.1:8000/workouts")
      .then((res) => res.json())
      .then((data) => setWorkouts(data))
      .catch((err) => console.error("Error fetching workouts:", err));
  }, []);

  // deals with any changes in the form
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // works with form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.id || !form.type || !form.duration_minutes || !form.intensity) {
      alert("Please fill in all fields");
      return;
    }

    const payload = {
      id: Number(form.id),
      type: form.type,
      duration_minutes: Number(form.duration_minutes),
      intensity: form.intensity,
    };

    try {
      const res = await fetch("http://127.0.0.1:8000/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const newWorkout = await res.json();
      setWorkouts((prev) => [...prev, newWorkout]);
      setForm({ id: "", type: "", duration_minutes: "", intensity: "" });
    } catch (err) {
      console.error("Error creating workout:", err);
    }
  };

  const totalMinutes = workouts.reduce(
    (sum, w) => sum + (w.duration_minutes || 0),
    0
  );

  return (
    <div className="app">
      <h1>OctoGym Tracker 🐙</h1>
      <p className="subtitle">
        Log your workouts, see past workouts, and watch your hard work add up!
      </p>

      <div className="grid">
        <form className="card" onSubmit={handleSubmit}>
          <h2>Add Workout</h2>

          <label>
            ID
            <input
              name="id"
              type="number"
              value={form.id}
              onChange={handleChange}
              placeholder="1"
            />
          </label>

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
              placeholder="Low, medium, high"
            />
          </label>

          <button type="submit">Save Workout</button>
        </form>

        <div className="card">
          <h2>Workout History</h2>
          {workouts.length === 0 ? (
            <p>No workouts yet. LOCK IN! 👟</p>
          ) : (
            <ul className="workout-list">
              {workouts.map((w) => (
                <li key={w.id}>
                  <strong>{w.type}</strong> — {w.duration_minutes} min (
                  {w.intensity})
                </li>
              ))}
            </ul>
          )}

          <div className="stats">
            <p>
              <strong>Total workouts:</strong> {workouts.length}
            </p>
            <p>
              <strong>Total minutes:</strong> {totalMinutes}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
