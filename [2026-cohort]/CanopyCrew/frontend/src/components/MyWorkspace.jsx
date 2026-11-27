import { useEffect, useMemo, useState } from "react";
import Icon from "./Icon";
import { getPlantImage } from "../data/plantimages";
import { getSiteImage } from "../data/siteimages";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../firebase/config";


const WORKSPACE_KEY = "canopycrew.demo.workspace";
const taskTypes = ["Watering", "Mulching", "Compost", "Pruning"];

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function AuthGate() {
  const [mode, setMode] = useState("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
  event.preventDefault();
  setError("");

  if (mode === "signup" && password !== confirm) {
    setError("Your passwords do not match.");
    return;
  }

  try {
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    if (mode === "signup") {
      await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        password,
      );
    } else {
      await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password,
      );
    }
  } catch (error) {
    const messages = {
      "auth/email-already-in-use":
        "An account already exists with this email. Try logging in.",
      "auth/invalid-email":
        "Please enter a valid email address.",
      "auth/weak-password":
        "Your password is too weak. Please choose a stronger one.",
      "auth/invalid-credential":
        "Incorrect email or password. Please try again.",
      "auth/user-disabled":
        "This account has been disabled.",
      "auth/too-many-requests":
        "Too many attempts. Please try again later.",
      "auth/network-request-failed":
        "Network error. Check your internet connection.",
    };

    setError(
      messages[error.code] || "Authentication failed. Please try again.",
    );
  } finally {
    setLoading(false);
  }
};
  return (
    <section className="workspace-auth-card">
      <div className="workspace-leaf">
        <Icon name="leaf" size={27} />
      </div>
      <p className="eyebrow">
        <span /> YOUR GROWING SPACE
      </p>
      <h1>{mode === "signup" ? "Make room to grow." : "Welcome back."}</h1>
      <p className="workspace-intro">
        Sign in to keep your planting sites, native plants, and care reminders
        together.
      </p>
      <div className="auth-tabs" role="tablist">
        <button
          className={mode === "signup" ? "selected" : ""}
          onClick={() => {
            setMode("signup");
            setError("");
          }}
        >
          Create account
        </button>
        <button
          className={mode === "login" ? "selected" : ""}
          onClick={() => {
            setMode("login");
            setError("");
          }}
        >
          Log in
        </button>
      </div>
      <form onSubmit={submit}>
        <label>
          Email address
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            minLength="8"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </label>
        {mode === "signup" && (
          <label>
            Confirm password
            <input
              type="password"
              autoComplete="new-password"
              minLength="8"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Enter your password again"
            />
          </label>
        )}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <button className="button workspace-submit" type="submit">
          {mode === "signup" ? "Create my workspace" : "Log in to workspace"}
          <Icon name="arrow" size={17} />
        </button>
      </form>
      <p className="demo-note">
        Demo mode: account access is stored in this browser only. No password is
        saved or sent to a server.
      </p>
    </section>
  );
}

function calendarCells(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 35 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(dateKey, amount) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return localDateKey(date);
}

function sundayFor(dateKey) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() - date.getDay());
  return localDateKey(date);
}

function normalizeWorkspace(value) {
  const workspace = value || {
    sites: [],
    selected: {},
    done: {},
    activeSite: null,
  };
  const today = localDateKey(new Date());
  const selected = Object.fromEntries(
    Object.entries(workspace.selected || {}).map(([siteId, plants]) => [
      siteId,
      Array.isArray(plants)
        ? Object.fromEntries(plants.map((id) => [id, { addedAt: today }]))
        : plants,
    ]),
  );
  return {
    sites: [],
    selected: {},
    done: {},
    activeSite: null,
    ...workspace,
    selected,
  };
}

function taskCategories(task, phase) {
  const value = task.toLowerCase();
  const types = [];
  if (
    value.includes("water") ||
    value.includes("irrigat") ||
    value.includes("moisture")
  )
    types.push("Watering");
  if (value.includes("mulch") || value.includes("leaf-litter"))
    types.push("Mulching");
  if (
    value.includes("compost") ||
    value.includes("top-dress") ||
    value.includes("castings")
  )
    types.push("Compost");
  if (
    value.includes("prun") ||
    value.includes("trim") ||
    value.includes("deadhead")
  )
    types.push("Pruning");
  return types.length
    ? types
    : [
        phase === "annual"
          ? "Pruning"
          : phase === "maintenance_quarterly"
            ? "Compost"
            : "Watering",
      ];
}

function buildCareTasks(site, compatible, selected) {
  const tasks = [];
  compatible
    .filter((plant) => selected[plant.species_id])
    .forEach((plant) => {
      const addedAt =
        selected[plant.species_id].addedAt || localDateKey(new Date());
      const schedule = plant.volunteer_care_schedule || {};
      Object.entries(schedule).forEach(([phase, entries]) =>
        entries.forEach((entry, entryIndex) => {
          const frequency = entry.frequency.toLowerCase();
          let offsets = [];
          if (phase === "initial_month") {
            const interval = frequency.includes("3 days")
              ? 3
              : frequency.includes("weekly") && !frequency.includes("twice")
                ? 7
                : frequency.includes("biweekly")
                  ? 14
                  : frequency.includes("twice")
                    ? 3
                    : 7;
            offsets = Array.from(
              { length: Math.floor(28 / interval) },
              (_, i) => interval * (i + 1),
            );
          } else if (phase === "maintenance_quarterly") {
            offsets = [90, 180, 270, 360];
          } else if (phase === "annual") {
            offsets = [365];
          }
          offsets.forEach((offset, occurrence) => {
            const date = shiftDate(addedAt, offset);
            tasks.push({
              id: `${site.site_id}-${plant.species_id}-${phase}-${entryIndex}-${occurrence}`,
              title: entry.task,
              type: taskCategories(entry.task, phase)[0],
              types: taskCategories(entry.task, phase),
              date,
              note: `${plant.botanical.common_name_pt} · ${entry.frequency}`,
              addedAt,
            });
          });
        }),
      );
    });
  return tasks.sort((a, b) => a.date.localeCompare(b.date));
}

export default function MyWorkspace({ sites, recommendationsBySite, email, onEmailChange }) {
  const [workspace, setWorkspace] = useState(() =>
    normalizeWorkspace(readJson(WORKSPACE_KEY, null)),
  );
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [detailPlant, setDetailPlant] = useState(null);
  useEffect(() => {
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
  }, [workspace]);

  const userSites = workspace.sites
    .map((id) => sites.find((site) => site.site_id === id))
    .filter(Boolean);
  const activeSite =
    userSites.find((site) => site.site_id === workspace.activeSite) ||
    userSites[0] ||
    null;
  const compatible = activeSite
    ? recommendationsBySite[activeSite.site_id] || []
    : [];
  const selected = workspace.selected[activeSite?.site_id] || {};
  const selectedPlants = Object.keys(selected);
  const allTasks = useMemo(
    () => (activeSite ? buildCareTasks(activeSite, compatible, selected) : []),
    [activeSite, compatible, selected],
  );
  const today = localDateKey(new Date());
  const weekStart = sundayFor(today);
  const weekEnd = shiftDate(weekStart, 6);
  const currentWeekStart = sundayFor(today);
  const weekTasks = allTasks.filter(
    (task) => task.date >= weekStart && task.date <= weekEnd,
  );
  const selectedDayTasks = selectedDate
    ? allTasks.filter((task) => task.date === selectedDate)
    : [];
  const selectedDateIsPastWeek = selectedDate
    ? sundayFor(selectedDate) < currentWeekStart
    : false;
  const careStart = selectedPlants.length
    ? Object.values(selected)
        .map((entry) => entry.addedAt || localDateKey(new Date()))
        .sort()[0]
    : localDateKey(new Date());
  const canViewPreviousMonth =
    `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-01` >
    careStart.slice(0, 7) + "-01";
  const doneCount = weekTasks.filter((task) => workspace.done[task.id]).length;
  const cells = calendarCells(month);
  const moveMonth = (delta) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  const addSite = (id) =>
    setWorkspace((old) => ({
      ...old,
      sites: old.sites.includes(id) ? old.sites : [...old.sites, id],
      activeSite: old.activeSite || id,
    }));
  const addPlant = (id) =>
    setWorkspace((old) => ({
      ...old,
      selected: {
        ...old.selected,
        [activeSite.site_id]: {
          ...(old.selected[activeSite.site_id] || {}),
          [id]: { addedAt: localDateKey(new Date()) },
        },
      },
    }));
  const removePlant = (id) =>
    setWorkspace((old) => {
      const next = { ...(old.selected[activeSite.site_id] || {}) };
      delete next[id];
      return {
        ...old,
        selected: { ...old.selected, [activeSite.site_id]: next },
      };
    });

  if (!email)
  return (
    <main className="workspace-page">
      <AuthGate />
    </main>
  );
  return (
    <main className="workspace-page">
      <div className="workspace-wrap">
        <header className="workspace-heading">
          <div>
            <p className="eyebrow">
              <span /> PLANTING WORKSPACE
            </p>
            <h1>
              Your little corner
              <br />
              <em>of the forest.</em>
            </h1>
            <p>{email} · Let’s keep your native plantings thriving.</p>
          </div>
          <div className="workspace-illustration">
            <Icon name="leaf" size={76} />
          </div>
        </header>
        <section className="workspace-sites">
          <div className="workspace-section-heading">
            <div>
              <p className="eyebrow">
                <span /> YOUR SITES
              </p>
              <h2>Where you're growing</h2>
            </div>
            <span>{userSites.length} of 3 sites</span>
          </div>
          <div className="workspace-site-grid">
            {userSites.map((site) => (
              <article
                className={`workspace-site-card ${activeSite?.site_id === site.site_id ? "current" : ""}`}
                key={site.site_id}
              >
                <button
                  className="workspace-site-select"
                  onClick={() =>
                    setWorkspace((old) => ({
                      ...old,
                      activeSite: site.site_id,
                    }))
                  }
                >
                  <img src={getSiteImage(site)} alt="" />
                  <span>
                    <b>{site.archetype_label}</b>
                    <small>{site.name}</small>
                  </span>
                </button>
                <button
                  aria-label={`Remove ${site.archetype_label}`}
                  onClick={() => {
                    const hasCare =
                      Object.keys(workspace.selected[site.site_id] || {})
                        .length > 0;
                    if (
                      hasCare &&
                      !window.confirm(
                        `Remove ${site.archetype_label} and its care schedule from your workspace?`,
                      )
                    )
                      return;
                    setWorkspace((old) => ({
                      ...old,
                      sites: old.sites.filter((id) => id !== site.site_id),
                      selected: { ...old.selected, [site.site_id]: {} },
                      activeSite:
                        old.activeSite === site.site_id ? null : old.activeSite,
                    }));
                  }}
                >
                  ×
                </button>
              </article>
            ))}
            {sites
              .filter((site) => !workspace.sites.includes(site.site_id))
              .map((site) => (
                <button
                  className="add-site-card"
                  key={site.site_id}
                  onClick={() => addSite(site.site_id)}
                >
                  <span>＋</span>
                  <b>Add {site.archetype_label}</b>
                  <small>{site.name}</small>
                </button>
              ))}
          </div>
        </section>
        {!activeSite ? (
          <div className="workspace-empty">
            <Icon name="leaf" size={32} />
            <h2>Choose a site to get started</h2>
            <p>
              Add one of the three São Paulo site types above to see its
              compatible native plants and care schedule.
            </p>
          </div>
        ) : (
          <>
            <section className="workspace-plants">
              <div className="workspace-section-heading">
                <div>
                  <p className="eyebrow">
                    <span /> NATIVE PLANTS
                  </p>
                  <h2>
                    Choose plants for {activeSite.archetype_label.toLowerCase()}
                  </h2>
                </div>
                <span>{selectedPlants.length} selected</span>
              </div>
              <div className="workspace-plant-row">
                {compatible.map((plant, i) => {
                  const isAdded = Boolean(selected[plant.species_id]);
                  return (
                    <article
                      className={`workspace-plant ${isAdded ? "picked" : ""}`}
                      key={plant.species_id}
                    >
                      <img src={getPlantImage(plant, i)} alt="" />
                      <span>
                        <b>{plant.botanical.common_name_pt}</b>
                        <i>{plant.botanical.scientific_name}</i>
                      </span>
                      <div className="workspace-plant-actions">
                        <button
                          type="button"
                          onClick={() => setDetailPlant(plant)}
                        >
                          View details
                        </button>
                        <button
                          type="button"
                          disabled={isAdded}
                          onClick={() => addPlant(plant.species_id)}
                        >
                          {isAdded ? "Added" : "Add to site"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              {!compatible.length && (
                <p className="workspace-muted">
                  Plant recommendations are loading or unavailable right now.
                </p>
              )}
            </section>
            <section className="workspace-calendar-layout">
              <div className="workspace-calendar">
                <div className="calendar-heading">
                  <h2>
                    {month.toLocaleDateString("en", {
                      month: "long",
                      year: "numeric",
                    })}
                  </h2>
                  <div>
                    <button
                      onClick={() => moveMonth(-1)}
                      aria-label="Previous month"
                      disabled={!canViewPreviousMonth}
                    >
                      ‹
                    </button>
                    <button
                      onClick={() => moveMonth(1)}
                      aria-label="Next month"
                    >
                      ›
                    </button>
                  </div>
                </div>
                <div className="calendar-grid">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <span className="calendar-weekday" key={day}>
                        {day}
                      </span>
                    ),
                  )}
                  {cells.map((date) => {
                    const key = localDateKey(date);
                    const types = [
                      ...new Set(
                        allTasks
                          .filter((task) => task.date === key)
                          .flatMap((task) => task.types),
                      ),
                    ];
                    const disabled = key < careStart;
                    return (
                      <button
                        key={key}
                        disabled={disabled}
                        className={`${date.getMonth() !== month.getMonth() ? "outside" : ""} ${key === selectedDate ? "active" : ""}`}
                        aria-pressed={key === selectedDate}
                        onClick={() =>
                          setSelectedDate((current) =>
                            current === key ? null : key,
                          )
                        }
                      >
                        {date.getDate()}
                        {types.length > 0 && (
                          <span className="calendar-markers">
                            {types.map((type) => (
                              <i
                                className={`task-dot ${type.toLowerCase()}`}
                                key={type}
                              />
                            ))}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="calendar-start-note">
                  Care reminders begin when each plant is added to this site.
                  Select a date to view its tasks; select it again to clear.
                </p>
              </div>
              <aside className="task-legend">
                <p className="eyebrow">
                  <span /> TASKS
                </p>
                {taskTypes.map((type) => (
                  <span key={type}>
                    <i className={`task-dot ${type.toLowerCase()}`} />
                    {type}
                  </span>
                ))}
                <div className="legend-message">
                  <Icon name="leaf" size={21} />
                  <p>Consistent care helps your plants thrive!</p>
                </div>
              </aside>
            </section>
            {selectedDate && (
              <section className="selected-day-care">
                <p className="eyebrow">
                  <span />{" "}
                  {new Date(`${selectedDate}T12:00:00`)
                    .toLocaleDateString("en", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })
                    .toUpperCase()}
                </p>
                {selectedDayTasks.length ? (
                  selectedDayTasks.map((task) => {
                    const cannotCheck =
                      selectedDateIsPastWeek || task.date > today;
                    return (
                      <label
                        className={`care-check-row ${workspace.done[task.id] ? "done" : ""} ${cannotCheck ? "read-only" : ""}`}
                        key={`day-${task.id}`}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(workspace.done[task.id])}
                          disabled={cannotCheck}
                          aria-label={`${workspace.done[task.id] ? "Completed" : "Mark complete"}: ${task.title}`}
                          onChange={(event) =>
                            setWorkspace((old) => ({
                              ...old,
                              done: {
                                ...old.done,
                                [task.id]: event.target.checked,
                              },
                            }))
                          }
                        />
                        <span className="fake-check">✓</span>
                        <span className="care-check-copy">
                          <b>{task.title}</b>
                          <small>
                            Due{" "}
                            {new Date(
                              `${task.date}T12:00:00`,
                            ).toLocaleDateString("en", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            · {task.note}
                            {cannotCheck
                              ? selectedDateIsPastWeek
                                ? " · Past week"
                                : " · Not available until due"
                              : ""}
                          </small>
                        </span>
                        <i className={`task-dot ${task.type.toLowerCase()}`} />
                      </label>
                    );
                  })
                ) : (
                  <p className="selected-day-empty">
                    No care tasks are scheduled for this date.
                  </p>
                )}
              </section>
            )}
            <section className="week-care">
              <header>
                <div>
                  <p className="eyebrow">
                    <span /> YOUR ROUTINE
                  </p>
                  <h2>This week’s care tasks</h2>
                  <small className="week-range">
                    {new Date(`${weekStart}T12:00:00`).toLocaleDateString(
                      "en",
                      { month: "short", day: "numeric" },
                    )}{" "}
                    –{" "}
                    {new Date(`${weekEnd}T12:00:00`).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    · Sunday–Saturday
                  </small>
                </div>
                <span>
                  {doneCount} of {weekTasks.length} complete
                </span>
              </header>
              {weekTasks.length ? (
                weekTasks.map((task) => {
                  const cannotCheck = task.date > today;
                  return (
                    <label
                      className={`care-check-row ${workspace.done[task.id] ? "done" : ""} ${cannotCheck ? "read-only" : ""}`}
                      key={task.id}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(workspace.done[task.id])}
                        disabled={cannotCheck}
                        aria-label={`${workspace.done[task.id] ? "Completed" : "Mark complete"}: ${task.title}`}
                        onChange={(event) =>
                          setWorkspace((old) => ({
                            ...old,
                            done: {
                              ...old.done,
                              [task.id]: event.target.checked,
                            },
                          }))
                        }
                      />
                      <span className="fake-check">✓</span>
                      <span className="care-check-copy">
                        <b>{task.title}</b>
                        <small>
                          Due{" "}
                          {new Date(`${task.date}T12:00:00`).toLocaleDateString(
                            "en",
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            },
                          )}{" "}
                          · {task.note}
                          {task.date > today
                            ? " · Not available until due"
                            : ""}
                        </small>
                      </span>
                      <i className={`task-dot ${task.type.toLowerCase()}`} />
                    </label>
                  );
                })
              ) : (
                <div className="workspace-empty small">
                  <p>
                    No care tasks are scheduled for this week. Choose another
                    week or add a compatible plant.
                  </p>
                </div>
              )}
              {weekTasks.length > 0 && doneCount === weekTasks.length && (
                <div className="week-complete">
                  <Icon name="leaf" size={34} />
                  <div>
                    <h3>Week complete!</h3>
                    <p>
                      Every care task is done. Your new plants are off to a
                      strong start.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
        {detailPlant && (
          <div
            className="plant-detail-backdrop"
            role="presentation"
            onClick={() => setDetailPlant(null)}
          >
            <section
              className="plant-detail-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="plant-detail-title"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="plant-detail-close"
                onClick={() => setDetailPlant(null)}
                aria-label="Close plant details"
              >
                ×
              </button>
              <img src={getPlantImage(detailPlant)} alt="" />
              <p className="eyebrow">
                <span /> NATIVE ATLANTIC FOREST SPECIES
              </p>
              <h2 id="plant-detail-title">
                {detailPlant.botanical.common_name_pt}
              </h2>
              <p className="plant-detail-scientific">
                {detailPlant.botanical.scientific_name} ·{" "}
                {detailPlant.botanical.common_name_en}
              </p>
              <p className="plant-detail-role">
                {detailPlant.ecological_interactions.ecological_role}
              </p>
              <h3>Care schedule</h3>
              {Object.entries(detailPlant.volunteer_care_schedule).map(
                ([phase, entries]) => (
                  <div className="plant-care-phase" key={phase}>
                    <b>{phase.replaceAll("_", " ")}</b>
                    {entries.map((entry) => (
                      <p key={entry.task}>
                        {entry.task}
                        <small>{entry.frequency}</small>
                      </p>
                    ))}
                  </div>
                ),
              )}
              {selected[detailPlant.species_id] ? (
                <button
                  className="button workspace-submit"
                  onClick={() => {
                    removePlant(detailPlant.species_id);
                    setDetailPlant(null);
                  }}
                >
                  Remove from site
                </button>
              ) : (
                <button
                  className="button workspace-submit"
                  onClick={() => {
                    addPlant(detailPlant.species_id);
                    setDetailPlant(null);
                  }}
                >
                  Add to site
                </button>
              )}
            </section>
          </div>
        )}
        {/* <p className="workspace-footnote">
          A simple local demo workspace · Your selections and checkoffs stay in
          this browser.
        </p> */}
      </div>
    </main>
  );
}
