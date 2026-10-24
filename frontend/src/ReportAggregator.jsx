import { BarChart3 } from "lucide-react";
import { useMemo, useState } from "react";

const dimensions = [
  ["ostad_senf", "Teacher"],
  ["negaran_senf", "Supervisor"],
  ["mahal_dars", "Location"],
];

function ReportAggregator({ reports, classes, archived = false }) {
  const [open, setOpen] = useState(false);
  const [groupBy, setGroupBy] = useState([]);
  const [valueFilters, setValueFilters] = useState({
    ostad_senf: "",
    negaran_senf: "",
    mahal_dars: "",
  });

  const classById = useMemo(
    () => new Map(classes.map((item) => [String(item.class_id), item])),
    [classes],
  );
  const options = useMemo(
    () =>
      Object.fromEntries(
        dimensions.map(([key]) => [
          key,
          [
            ...new Set(
              classes.map((item) => item[key]).filter((value) => value),
            ),
          ].sort(),
        ]),
      ),
    [classes],
  );
  const matchingReports = useMemo(
    () =>
      reports.filter((report) =>
        dimensions.every(([key]) => {
          const selected = valueFilters[key].trim().toLowerCase();
          if (!selected) return true;
          return String(classById.get(String(report.class_id))?.[key] || "")
            .toLowerCase()
            .includes(selected);
        }),
      ),
    [classById, reports, valueFilters],
  );
  const groups = useMemo(() => {
    if (groupBy.length === 0) return [];
    const grouped = new Map();
    matchingReports.forEach((report) => {
      const classItem = classById.get(String(report.class_id));
      const key = groupBy
        .map(([field]) => String(classItem?.[field] || "Unknown"))
        .join("\u0001");
      if (!grouped.has(key)) {
        grouped.set(key, {
          labels: groupBy.map(
            ([field, label]) => `${label}: ${classItem?.[field] || "Unknown"}`,
          ),
          classes: new Set(),
          studentsByClass: new Map(),
          reports: 0,
          present: 0,
          absent: 0,
        });
      }
      const group = grouped.get(key);
      const classId = String(report.class_id);
      group.classes.add(classId);
      const students = Number(report.tedad_shagerdan || 0);
      group.studentsByClass.set(
        classId,
        Math.max(group.studentsByClass.get(classId) || 0, students),
      );
      group.reports += 1;
      group.present += Number(report.hazeran || 0);
      group.absent += Math.max(
        0,
        Number(report.tedad_shagerdan || 0) - Number(report.hazeran || 0),
      );
    });
    return [...grouped.values()];
  }, [classById, groupBy, matchingReports]);

  const toggleDimension = (dimension) => {
    setGroupBy((current) =>
      current.some(([field]) => field === dimension[0])
        ? current.filter(([field]) => field !== dimension[0])
        : [...current, dimension],
    );
  };
  const borderColor = archived ? "border-red-100" : "border-blue-100";
  const titleColor = archived
    ? "text-red-700 dark:text-red-300"
    : "text-blue-700 dark:text-blue-300";
  const buttonColor = archived
    ? "border-red-200 text-red-700 hover:bg-red-50 dark:text-red-300"
    : "border-blue-200 text-blue-700 hover:bg-blue-50 dark:text-blue-300";

  return (
    <div
      className={`mb-4 rounded-2xl border ${borderColor} bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900`}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex items-center gap-2 rounded-xl border bg-transparent px-3 py-2 text-sm font-bold ${buttonColor}`}
      >
        <BarChart3 size={17} /> Aggregator
        {groupBy.length > 0 && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs text-white ${archived ? "bg-red-600" : "bg-blue-600"}`}
          >
            {groupBy.length}
          </span>
        )}
      </button>
      {open && (
        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
          <p
            className={`mb-3 text-sm font-black uppercase tracking-wide ${titleColor}`}
          >
            Group reports by
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {dimensions.map((dimension) => {
              const [key, label] = dimension;
              const checked = groupBy.some(([field]) => field === key);
              return (
                <label
                  key={key}
                  className={`rounded-xl border p-3 ${checked ? (archived ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/40" : "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/40") : "border-slate-200 dark:border-slate-700"}`}
                >
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDimension(dimension)}
                    />
                    {label}
                  </span>
                  <input
                    list={`aggregator-${archived ? "archived-" : ""}${key}`}
                    value={valueFilters[key]}
                    onChange={(event) =>
                      setValueFilters((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                    placeholder={`Search or choose ${label.toLowerCase()}`}
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700"
                  />
                  <datalist
                    id={`aggregator-${archived ? "archived-" : ""}${key}`}
                  >
                    {options[key].map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </label>
              );
            })}
          </div>
          {groupBy.length === 0 ? (
            <p className="mt-4 text-sm font-semibold text-slate-500">
              Select at least one grouping option.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full min-w-190 text-sm">
                <thead
                  className={
                    archived
                      ? "bg-red-600 text-white"
                      : "bg-blue-600 text-white"
                  }
                >
                  <tr>
                    {groupBy.map(([, label]) => (
                      <th key={label} className="px-3 py-2 text-left">
                        {label}
                      </th>
                    ))}
                    {[
                      "Classes",
                      "Reports",
                      "Students",
                      "Present",
                      "Absent",
                    ].map((heading) => (
                      <th key={heading} className="px-3 py-2 text-left">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groups.length === 0 ? (
                    <tr>
                      <td
                        colSpan={groupBy.length + 5}
                        className="px-3 py-6 text-center text-slate-500"
                      >
                        No matching reports.
                      </td>
                    </tr>
                  ) : (
                    groups.map((group) => (
                      <tr
                        key={group.labels.join("|")}
                        className="border-t border-slate-200 odd:bg-slate-50 dark:border-slate-700 dark:odd:bg-slate-800/60"
                      >
                        {group.labels.map((label) => (
                          <td key={label} className="px-3 py-2 font-semibold">
                            {label.split(": ").slice(1).join(": ")}
                          </td>
                        ))}
                        <td className="px-3 py-2">{group.classes.size}</td>
                        <td className="px-3 py-2">{group.reports}</td>
                        <td className="px-3 py-2">
                          {[...group.studentsByClass.values()].reduce(
                            (total, students) => total + students,
                            0,
                          )}
                        </td>
                        <td className="px-3 py-2">{group.present}</td>
                        <td className="px-3 py-2">{group.absent}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ReportAggregator;
