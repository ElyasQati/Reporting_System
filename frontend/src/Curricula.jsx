import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { apiFetch } from "./api";

const api = "http://localhost/reporting_system/backend/curricula.php";
const emptyCurriculum = { name: "", pages: "" };

function Curricula() {
  const [curricula, setCurricula] = useState([]);
  const [form, setForm] = useState(emptyCurriculum);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  const refresh = () =>
    apiFetch(api)
      .then((res) => res.json())
      .then(setCurricula)
      .catch(() => setCurricula([]));
  useEffect(() => {
    refresh();
  }, []);

  const save = async (event) => {
    event.preventDefault();
    if (
      !form.name.trim() ||
      !/^\d+$/.test(form.pages) ||
      Number(form.pages) < 1
    ) {
      setError("Enter a name and a positive page count.");
      return;
    }
    const response = await apiFetch(api, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editing ? { ...form, curriculum_id: editing.curriculum_id } : form,
      ),
    });
    const data = await response.json();
    if (data.error) {
      setError(data.error);
      return;
    }
    setForm(emptyCurriculum);
    setEditing(null);
    setError("");
    refresh();
  };
  const remove = async (id) => {
    const result = await Swal.fire({
      title: "Delete this curriculum?",
      text: "Curriculum used by reports cannot be deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!result.isConfirmed) return;
    const response = await apiFetch(api, {
      method: "DELETE",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `curriculum_id=${id}`,
    });
    const data = await response.json();
    if (data.error) {
      await Swal.fire("Cannot delete", data.error, "error");
      return;
    }
    refresh();
  };

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-sm font-bold uppercase tracking-widest text-blue-600">
            Library
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Curriculum
          </h1>
        </div>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          {curricula.length} total
        </span>
      </div>
      <form
        onSubmit={save}
        className="mb-8 rounded-2xl border border-blue-100 bg-white p-4 shadow-md shadow-blue-100/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Curriculum name
            <input
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2.5 dark:border-slate-700"
              placeholder="e.g. Mathematics"
            />
          </label>
          <label className="text-sm font-semibold">
            Number of pages
            <input
              type="text"
              inputMode="numeric"
              value={form.pages}
              onChange={(event) =>
                setForm({
                  ...form,
                  pages: event.target.value.replace(/\D/g, ""),
                })
              }
              className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2.5 dark:border-slate-700"
              placeholder="Pages"
            />
          </label>
        </div>
        {error && (
          <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>
        )}
        <div className="mt-5 flex gap-2">
          <button className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700">
            <Plus size={18} />{" "}
            {editing ? "Update curriculum" : "Add curriculum"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(emptyCurriculum);
                setError("");
              }}
              className="rounded-xl px-4 py-3 font-semibold text-slate-500"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      <div className="overflow-x-auto rounded-2xl border border-blue-100 bg-white shadow-md shadow-blue-100/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <table className="w-full min-w-[500px] text-sm">
          <thead className="bg-blue-600 text-left text-xs uppercase tracking-wide text-white dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Pages</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {curricula.map((item) => (
              <tr
                key={item.curriculum_id}
                className="border-t border-sky-200 odd:bg-sky-50 even:bg-cyan-100/80 hover:bg-blue-200 dark:border-slate-700 dark:odd:bg-slate-900 dark:even:bg-blue-950/70 dark:hover:bg-blue-900"
              >
                <td className="px-4 py-3">{item.curriculum_id}</td>
                <td className="px-4 py-3 font-semibold">{item.name}</td>
                <td className="px-4 py-3">{item.pages}</td>
                <td className="px-4 py-3">
                  <button
                    title="Edit"
                    aria-label="Edit curriculum"
                    onClick={() => {
                      setEditing(item);
                      setForm({ name: item.name, pages: String(item.pages) });
                    }}
                    className="mr-1 rounded-lg p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                  >
                    <Pencil size={17} />
                  </button>
                  <button
                    title="Delete"
                    aria-label="Delete curriculum"
                    onClick={() => remove(item.curriculum_id)}
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <Trash2 size={17} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default Curricula;
