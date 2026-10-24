import { Plus } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "./api";

const emptyClass = {
  shomara: "",
  nam_senf: "",
  ostad_senf: "",
  negaran_senf: "",
  mahal_dars: "",
  time_senf: "",
};
const fields = [
  ["shomara", "Class number", "text"],
  ["nam_senf", "Class name", "text"],
  ["ostad_senf", "Teacher", "text"],
  ["negaran_senf", "Supervisor", "text"],
  ["mahal_dars", "Location", "text"],
  ["time_senf", "Class duration", "text"],
];
const validate = (value) => ({
  shomara: !value.shomara.trim()
    ? "Class number is required"
    : !/^\d+$/.test(value.shomara)
      ? "Numbers only"
      : "",
  nam_senf: !value.nam_senf.trim() ? "Class name is required" : "",
  ostad_senf: !value.ostad_senf.trim() ? "Teacher is required" : "",
  negaran_senf: !value.negaran_senf.trim() ? "Supervisor is required" : "",
  mahal_dars: !value.mahal_dars.trim() ? "Location is required" : "",
  time_senf: !value.time_senf.trim() ? "Class duration is required" : "",
});
const api = "http://localhost/reporting_system/backend/classes.php";

function AddClass() {
  const navigate = useNavigate();
  const [newClass, setNewClass] = useState(emptyClass);
  const [errors, setErrors] = useState({});
  const formRefs = useRef([]);
  const valid = Object.values(validate(newClass)).every((error) => !error);

  const updateField = (key, value) => {
    const next = {
      ...newClass,
      [key]: key === "shomara" ? value.replace(/\D/g, "") : value,
    };
    setNewClass(next);
    setErrors(validate(next));
  };

  const handleAdd = async (event) => {
    event.preventDefault();
    setErrors(validate(newClass));
    if (!valid) return;
    await apiFetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newClass),
    });
    navigate("/classes");
  };

  return (
    <section>
      <div className="mb-6">
        <p className="mb-1 text-sm font-bold uppercase tracking-widest text-blue-600">
          Workspace
        </p>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
          Add class
        </h1>
      </div>
      <form
        onSubmit={handleAdd}
        className="rounded-2xl border border-blue-100 bg-white p-4 shadow-md shadow-blue-100/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:p-6"
      >
        <div className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Plus size={20} className="text-blue-600" /> New class details
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(([key, label, type], index) => (
            <label key={key} className="block text-sm font-semibold">
              <span>{label}</span>
              <div>
                <input
                  ref={(element) => {
                    formRefs.current[index] = element;
                  }}
                  type={type}
                  inputMode={key === "shomara" ? "numeric" : undefined}
                  value={newClass[key]}
                  onChange={(event) => updateField(key, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && index < fields.length - 1) {
                      event.preventDefault();
                      formRefs.current[index + 1]?.focus();
                    }
                  }}
                  className={`mt-1 w-full rounded-xl border bg-transparent px-3 py-2.5 outline-none transition focus:ring-2 ${errors[key] ? "border-red-500 focus:ring-red-200" : "border-slate-300 focus:border-blue-500 focus:ring-blue-100 dark:border-slate-700"}`}
                  placeholder={
                    key === "time_senf" ? "05:00 to 06:00 pm" : label
                  }
                />
              </div>
              {errors[key] && (
                <span className="mt-1 block text-xs font-medium text-red-600">
                  {errors[key]}
                </span>
              )}
            </label>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            disabled={!valid}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={18} /> Add class
          </button>
          <button
            type="button"
            onClick={() => navigate("/classes")}
            className="rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

export default AddClass;
