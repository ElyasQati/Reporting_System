import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "./api";

const emptyReport = {
  class_id: "",
  tedad_shagerdan: "",
  hazeran: "",
  gheir_hazeran: "",
  onvan_dars: "",
  nesab: "",
  hafta: "",
  month: "",
  month_week: "",
};
const fields = [
  ["tedad_shagerdan", "Students"],
  ["hazeran", "Present"],
  ["gheir_hazeran", "Absent"],
  ["onvan_dars", "Lesson"],
  ["nesab", "Curriculum"],
  ["hafta", "Week"],
  ["month", "Month"],
  ["month_week", "Month-week"],
];
const addFields = fields.filter(([key]) => key !== "gheir_hazeran");
const api = "http://localhost/reporting_system/backend/reports.php";
const classesApi = "http://localhost/reporting_system/backend/classes.php";
const curriculaApi = "http://localhost/reporting_system/backend/curricula.php";
const numbers = new Set(["tedad_shagerdan", "hazeran", "hafta"]);
const monthWeeks = ["1", "2", "3", "4"];

function AddReport() {
  const { class_id: routeClassId } = useParams();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [curricula, setCurricula] = useState([]);
  const [newReport, setNewReport] = useState({
    ...emptyReport,
    class_id: routeClassId || "",
  });
  const [className, setClassName] = useState("");
  const [errors, setErrors] = useState({});
  const refs = useRef([]);

  useEffect(() => {
    apiFetch(classesApi)
      .then((res) => res.json())
      .then((data) => {
        setClasses(data);
        const item = data.find(
          (value) => String(value.class_id) === String(routeClassId),
        );
        if (item) setClassName(item.nam_senf);
      })
      .catch(() => setClasses([]));
    apiFetch(curriculaApi)
      .then((res) => res.json())
      .then(setCurricula)
      .catch(() => setCurricula([]));
  }, [routeClassId]);

  const valid = Boolean(
    newReport.class_id &&
    newReport.tedad_shagerdan &&
    newReport.hazeran &&
    newReport.onvan_dars &&
    newReport.nesab &&
    newReport.hafta &&
    newReport.month &&
    newReport.month_week,
  );
  const absentStudents = Math.max(
    0,
    Number(newReport.tedad_shagerdan || 0) - Number(newReport.hazeran || 0),
  );
  const update = (key, value) => {
    let nextValue = numbers.has(key) ? value.replace(/\D/g, "") : value;
    let nextReport = { ...newReport, [key]: nextValue };
    if (
      key === "tedad_shagerdan" &&
      nextValue &&
      Number(newReport.hazeran) > Number(nextValue)
    ) {
      nextReport = { ...nextReport, hazeran: nextValue };
    }
    if (
      key === "hazeran" &&
      nextValue &&
      Number(nextValue) > Number(newReport.tedad_shagerdan)
    ) {
      nextValue = newReport.tedad_shagerdan;
      nextReport = { ...nextReport, hazeran: nextValue };
    }
    setNewReport(nextReport);
    setErrors({ ...errors, [key]: nextValue.trim() ? "" : "Required" });
  };
  const chooseClass = (value) => {
    const item = classes.find(
      (entry) => entry.nam_senf.toLowerCase() === value.trim().toLowerCase(),
    );
    setClassName(value);
    setNewReport({ ...newReport, class_id: item?.class_id || "" });
    setErrors({
      ...errors,
      class_id: item ? "" : "Choose a class from the list",
    });
  };
  const chooseCurriculum = (value) => {
    setNewReport({ ...newReport, nesab: value });
    setErrors({
      ...errors,
      nesab: value ? "" : "Choose a curriculum from the list",
    });
  };
  const handleAdd = async (event) => {
    event.preventDefault();
    if (!valid) {
      setErrors({
        ...errors,
        class_id: newReport.class_id ? "" : "Choose a class from the list",
        nesab: newReport.nesab ? "" : "Choose a curriculum from the list",
        form: "Complete all required fields",
      });
      return;
    }
    await apiFetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newReport, gheir_hazeran: absentStudents }),
    });
    navigate(routeClassId ? `/reports/${routeClassId}` : "/reports");
  };

  return (
    <section>
      <div className="mb-6">
        <p className="mb-1 text-sm font-bold uppercase tracking-widest text-blue-600">
          Attendance log
        </p>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
          Add report
        </h1>
      </div>
      <form
        onSubmit={handleAdd}
        className="rounded-2xl border border-blue-100 bg-white p-4 shadow-md shadow-blue-100/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:p-6"
      >
        <div className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Plus size={20} className="text-blue-600" /> New report details
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-semibold">
            Class name
            <input
              list="class-options"
              value={className}
              onChange={(event) => chooseClass(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  refs.current[0]?.focus();
                }
              }}
              className={`mt-1 w-full rounded-xl border bg-transparent px-3 py-2.5 outline-none focus:ring-2 ${errors.class_id ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}
              placeholder="Type or choose a class"
            />
            <datalist id="class-options">
              {classes.map((item) => (
                <option key={item.class_id} value={item.nam_senf} />
              ))}
            </datalist>
            {errors.class_id && (
              <span className="mt-1 block text-xs text-red-600">
                {errors.class_id}
              </span>
            )}
          </label>
          {addFields.map(([key, label], index) => (
            <label key={key} className="text-sm font-semibold">
              {label}
              {key === "nesab" ? (
                <select
                  ref={(element) => {
                    refs.current[index] = element;
                  }}
                  value={newReport[key]}
                  onChange={(event) => chooseCurriculum(event.target.value)}
                  className={`mt-1 w-full rounded-xl border bg-white px-3 py-2.5 outline-none focus:ring-2 dark:bg-slate-900 ${errors[key] ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}
                >
                  <option value="">Choose a curriculum</option>
                  {curricula.map((item) => (
                    <option key={item.curriculum_id} value={item.name}>
                      {item.name} ({item.pages} pages)
                    </option>
                  ))}
                </select>
              ) : key === "month_week" ? (
                <select
                  ref={(element) => {
                    refs.current[index] = element;
                  }}
                  value={newReport[key]}
                  onChange={(event) => update(key, event.target.value)}
                  className={`mt-1 w-full rounded-xl border bg-white px-3 py-2.5 outline-none focus:ring-2 dark:bg-slate-900 ${errors[key] ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}
                >
                  <option value="">Choose week</option>
                  {monthWeeks.map((week) => (
                    <option key={week} value={week}>
                      {week}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  ref={(element) => {
                    refs.current[index] = element;
                  }}
                  type="text"
                  inputMode={numbers.has(key) ? "numeric" : undefined}
                  value={newReport[key]}
                  onChange={(event) => update(key, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && index < addFields.length - 1) {
                      event.preventDefault();
                      refs.current[index + 1]?.focus();
                    }
                  }}
                  className={`mt-1 w-full rounded-xl border bg-transparent px-3 py-2.5 outline-none focus:ring-2 ${errors[key] ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}
                  placeholder={label}
                />
              )}
              {errors[key] && (
                <span className="mt-1 block text-xs text-red-600">
                  {errors[key]}
                </span>
              )}
            </label>
          ))}
        </div>
        {errors.form && (
          <p className="mt-3 text-sm font-semibold text-red-600">
            {errors.form}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            disabled={!valid}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={18} /> Add report
          </button>
          <button
            type="button"
            onClick={() =>
              navigate(routeClassId ? `/reports/${routeClassId}` : "/reports")
            }
            className="rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

export default AddReport;
