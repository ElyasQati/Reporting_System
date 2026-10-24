import { ArchiveRestore, Eye, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { apiFetch } from "./api";

const api = "http://localhost/reporting_system/backend/deleted_classes.php";
const fields = [
  ["shomara", "Number"],
  ["nam_senf", "Name"],
  ["ostad_senf", "Teacher"],
  ["negaran_senf", "Supervisor"],
  ["mahal_dars", "Location"],
  ["time_senf", "Time"],
];
const filterFields = [
  ["ostad_senf", "Teacher"],
  ["negaran_senf", "Supervisor"],
  ["mahal_dars", "Location"],
];

function DeletedClasses() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [editClass, setEditClass] = useState(null);
  const [filters, setFilters] = useState(() =>
    Object.fromEntries(filterFields.map(([key]) => [key, ""])),
  );
  const refresh = () =>
    apiFetch(api)
      .then((res) => res.json())
      .then(setClasses)
      .catch(() => setClasses([]));
  useEffect(() => {
    refresh();
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

  const remove = async (classId) => {
    const result = await Swal.fire({
      title: "Permanently delete this class?",
      text: "Its archived reports will also be permanently deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete permanently",
    });
    if (!result.isConfirmed) return;
    await apiFetch(api, {
      method: "DELETE",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `class_id=${classId}`,
    });
    refresh();
  };

  const save = async () => {
    await apiFetch(api, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editClass),
    });
    setEditClass(null);
    refresh();
  };

  const unarchive = async (classId) => {
    const result = await Swal.fire({
      title: "Unarchive this class?",
      text: "The class and all of its archived reports will return to the live tables.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      confirmButtonText: "Unarchive",
    });
    if (!result.isConfirmed) return;

    const response = await apiFetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unarchive", class_id: classId }),
    });
    const data = await response.json();
    if (data.error) {
      await Swal.fire("Unable to unarchive class", data.error, "error");
      return;
    }
    refresh();
  };

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-sm font-bold uppercase tracking-widest text-red-600">
            Archive
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Archived classes
          </h1>
        </div>
        <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
          {filteredClasses.length} total
        </span>
      </div>
      <div className="mb-4 rounded-2xl border border-red-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 text-sm font-black uppercase tracking-wide text-red-700 dark:text-red-300">
          Filter archived classes
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {filterFields.map(([key, label]) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">
                {label}
              </label>
              <input
                list={`archived-classes-filter-${key}`}
                value={filters[key]}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
                aria-label={`Search or select ${label}`}
                placeholder={`Search or select ${label.toLowerCase()}`}
                className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:border-slate-700"
              />
              <datalist id={`archived-classes-filter-${key}`}>
                {filterOptions[key].map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-red-100 bg-white shadow-md shadow-red-100/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <table className="w-full min-w-212.5 text-sm">
          <thead className="bg-red-600 text-left text-xs uppercase tracking-wide text-white dark:bg-slate-800">
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
                className="border-t border-red-100 odd:bg-red-50 even:bg-orange-50 hover:bg-red-100 dark:border-slate-700 dark:odd:bg-slate-900 dark:even:bg-red-950/40 dark:hover:bg-red-900/50"
              >
                {editClass?.class_id === item.class_id ? (
                  <>
                    <td className="px-4 py-3">{item.class_id}</td>
                    {fields.map(([key, label]) => (
                      <td key={key} className="px-4 py-3">
                        <input
                          type="text"
                          value={editClass[key] || ""}
                          onChange={(event) =>
                            setEditClass({
                              ...editClass,
                              [key]: event.target.value,
                            })
                          }
                          className="w-full rounded-lg border bg-transparent px-2 py-1.5"
                          placeholder={label}
                        />
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <button
                        onClick={save}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                      >
                        Save
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">{item.class_id}</td>
                    {fields.map(([key]) => (
                      <td key={key} className="px-4 py-3">
                        {item[key]}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          title="Edit"
                          aria-label="Edit archived class"
                          onClick={() => setEditClass(item)}
                          className="rounded-lg p-2 text-amber-600 hover:bg-amber-50"
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          title="View archived reports"
                          aria-label="View archived reports"
                          onClick={() =>
                            navigate(`/deleted-reports/${item.class_id}`)
                          }
                          className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                        >
                          <Eye size={17} />
                        </button>
                        <button
                          title="Unarchive"
                          aria-label="Unarchive class"
                          onClick={() => unarchive(item.class_id)}
                          className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"
                        >
                          <ArchiveRestore size={17} />
                        </button>
                        <button
                          title="Delete permanently"
                          aria-label="Delete permanently"
                          onClick={() => remove(item.class_id)}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={17} />
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

export default DeletedClasses;
