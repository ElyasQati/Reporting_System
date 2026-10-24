import { Eye, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { apiFetch } from "./api";

const fields = [
  ["shomara", "Class number", "text"],
  ["nam_senf", "Class name", "text"],
  ["ostad_senf", "Teacher", "text"],
  ["negaran_senf", "Supervisor", "text"],
  ["mahal_dars", "Location", "text"],
  ["time_senf", "Class duration", "text"],
];
const filterFields = [
  ["ostad_senf", "Teacher"],
  ["negaran_senf", "Supervisor"],
  ["mahal_dars", "Location"],
];

function Classes() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [editClass, setEditClass] = useState(null);
  const [filters, setFilters] = useState(() =>
    Object.fromEntries(filterFields.map(([key]) => [key, ""])),
  );
  const api = "http://localhost/reporting_system/backend/classes.php";

  const refreshClasses = () =>
    apiFetch(api)
      .then((res) => res.json())
      .then(setClasses)
      .catch(() => setClasses([]));
  useEffect(() => {
    refreshClasses();
  }, []);

  const filteredClasses = classes.filter((item) =>
    filterFields.every(([key]) => {
      const value = String(item[key] || "");
      const filter = filters[key].toLowerCase();
      return !filter || value.toLowerCase().includes(filter);
    }),
  );
  const filterOptions = Object.fromEntries(
    filterFields.map(([key]) => [
      key,
      [...new Set(classes.map((item) => item[key]).filter(Boolean))].sort(),
    ]),
  );

  const handleDelete = async (classId) => {
    const result = await Swal.fire({
      title: "Delete this class?",
      text: "This class will be removed from the class list.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!result.isConfirmed) return;
    const response = await apiFetch(api, {
      method: "DELETE",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `class_id=${classId}`,
    });
    const data = await response.json();
    if (data.error) {
      await Swal.fire("Cannot delete class", data.error, "error");
      return;
    }
    refreshClasses();
  };

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-sm font-bold uppercase tracking-widest text-blue-600">
            Workspace
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Classes
          </h1>
        </div>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          {filteredClasses.length} total
        </span>
      </div>
      <div className="mb-4 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 text-sm font-black uppercase tracking-wide text-blue-700 dark:text-blue-300">
          Filter classes
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {filterFields.map(([key, label]) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">
                {label}
              </label>
              <input
                list={`classes-filter-${key}`}
                value={filters[key]}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
                aria-label={`Search or select ${label}`}
                placeholder={`Search or select ${label.toLowerCase()}`}
                className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700"
              />
              <datalist id={`classes-filter-${key}`}>
                {filterOptions[key].map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-blue-100 bg-white shadow-md shadow-blue-100/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <table className="w-full min-w-212.5 text-sm">
          <thead className="bg-blue-600 text-left text-xs uppercase tracking-wide text-white dark:bg-slate-800">
            <tr>
              {[
                "ID",
                "Number",
                "Name",
                "Teacher",
                "Supervisor",
                "Location",
                "Time",
                "Actions",
              ].map((heading) => (
                <th key={heading} className="px-4 py-3">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredClasses.map((item) => (
              <tr
                key={item.class_id}
                className="border-t border-sky-200 odd:bg-sky-50 even:bg-cyan-100/80 hover:bg-blue-200 dark:border-slate-700 dark:odd:bg-slate-900 dark:even:bg-blue-950/70 dark:hover:bg-blue-900"
              >
                <td className="px-4 py-3">{item.class_id}</td>
                {editClass?.class_id === item.class_id ? (
                  <>
                    <td colSpan="6" className="px-4 py-3">
                      <div className="grid gap-2 sm:grid-cols-3">
                        {fields.map(([key, label, type]) => (
                          <input
                            key={key}
                            type={type}
                            value={editClass[key] || ""}
                            onChange={(event) =>
                              setEditClass({
                                ...editClass,
                                [key]:
                                  key === "shomara"
                                    ? event.target.value.replace(/\D/g, "")
                                    : event.target.value,
                              })
                            }
                            className="rounded-lg border border-slate-300 bg-transparent px-2 py-1.5 dark:border-slate-700"
                            placeholder={label}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        title="Save"
                        aria-label="Save class"
                        onClick={async () => {
                          await apiFetch(api, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(editClass),
                          });
                          setEditClass(null);
                          refreshClasses();
                        }}
                        className="rounded-lg bg-emerald-600 p-2 text-white"
                      >
                        <span className="text-xs">Save</span>
                      </button>
                      <button
                        type="button"
                        title="Cancel"
                        aria-label="Cancel class edit"
                        onClick={() => setEditClass(null)}
                        className="ml-1 rounded-lg bg-slate-500 p-2 text-white hover:bg-slate-600"
                      >
                        <span className="text-xs">Cancel</span>
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">{item.shomara}</td>
                    <td className="px-4 py-3 font-semibold">{item.nam_senf}</td>
                    <td className="px-4 py-3">{item.ostad_senf}</td>
                    <td className="px-4 py-3">{item.negaran_senf}</td>
                    <td className="px-4 py-3">{item.mahal_dars}</td>
                    <td className="px-4 py-3">{item.time_senf}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          title="Edit"
                          aria-label="Edit class"
                          onClick={() => setEditClass(item)}
                          className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          title="Delete"
                          aria-label="Delete class"
                          onClick={() => handleDelete(item.class_id)}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <Trash2 size={17} />
                        </button>
                        <button
                          title="View reports"
                          aria-label="View reports"
                          onClick={() => navigate(`/reports/${item.class_id}`)}
                          className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                        >
                          <Eye size={17} />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default Classes;
