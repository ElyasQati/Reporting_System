import { BarChart3, Filter, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "./api";

const reportsApi = "http://localhost/reporting_system/backend/reports.php";
const classesApi = "http://localhost/reporting_system/backend/classes.php";
const curriculaApi = "http://localhost/reporting_system/backend/curricula.php";
const filterFields = [
  ["teacher", "Teacher"],
  ["supervisor", "Supervisor"],
  ["location", "Location"],
  ["className", "Class name"],
  ["curriculum", "Curriculum"],
];
const emptyFilters = {
  month: "",
  teacher: "",
  supervisor: "",
  location: "",
  className: "",
  curriculum: "",
};

function GraphicalReport() {
  const [reports, setReports] = useState([]);
  const [classes, setClasses] = useState([]);
  const [curricula, setCurricula] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch(reportsApi).then((response) => response.json()),
      apiFetch(classesApi).then((response) => response.json()),
      apiFetch(curriculaApi).then((response) => response.json()),
    ])
      .then(([reportData, classData, curriculumData]) => {
        if (!Array.isArray(reportData) || !Array.isArray(classData)) {
          throw new Error("Unable to load graphical report data");
        }
        setReports(reportData);
        setClasses(classData);
        setCurricula(Array.isArray(curriculumData) ? curriculumData : []);
        setFilters((current) => ({
          ...current,
          month:
            [
              ...new Set(
                reportData.map((report) => report.month).filter(Boolean),
              ),
            ].sort()[0] || "",
        }));
      })
      .catch((error) => setLoadError(error.message));
  }, []);

  const classById = useMemo(
    () => new Map(classes.map((item) => [String(item.class_id), item])),
    [classes],
  );
  const options = useMemo(() => {
    const getValues = (key) => {
      if (key === "curriculum") return curricula.map((item) => item.name);
      const classKey = {
        teacher: "ostad_senf",
        supervisor: "negaran_senf",
        location: "mahal_dars",
        className: "nam_senf",
      }[key];
      return classes.map((item) => item[classKey]);
    };
    return Object.fromEntries(
      filterFields.map(([key]) => [
        key,
        [...new Set(getValues(key).filter(Boolean))].sort(),
      ]),
    );
  }, [classes, curricula]);
  const months = useMemo(
    () =>
      [
        ...new Set(reports.map((report) => report.month).filter(Boolean)),
      ].sort(),
    [reports],
  );
  const filteredReports = useMemo(
    () =>
      reports.filter((report) => {
        const classItem = classById.get(String(report.class_id));
        const matches = {
          teacher: classItem?.ostad_senf,
          supervisor: classItem?.negaran_senf,
          location: classItem?.mahal_dars,
          className: classItem?.nam_senf,
          curriculum: report.nesab,
        };
        return Object.entries(filters).every(([key, value]) => {
          if (!value) return true;
          if (key === "month") return String(report.month) === value;
          return String(matches[key] || "")
            .toLowerCase()
            .includes(value.toLowerCase());
        });
      }),
    [classById, filters, reports],
  );
  const totals = filteredReports.reduce(
    (summary, report) => {
      summary.students += Number(report.tedad_shagerdan || 0);
      summary.present += Number(report.hazeran || 0);
      summary.absent += Math.max(
        0,
        Number(report.tedad_shagerdan || 0) - Number(report.hazeran || 0),
      );
      return summary;
    },
    { students: 0, present: 0, absent: 0 },
  );
  const chartMax = Math.max(totals.students, totals.present, totals.absent, 1);
  const updateFilter = (key, value) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const resetFilters = () =>
    setFilters({ ...emptyFilters, month: months[0] || "" });

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-sm font-bold uppercase tracking-widest text-emerald-600">
            Visual overview
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Graphical report
          </h1>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {filteredReports.length} reports
        </span>
      </div>
      {loadError && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {loadError}
        </p>
      )}
      <div className="mb-6 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-lg font-black text-emerald-700 dark:text-emerald-300">
            <Filter size={19} /> Report filters
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <RotateCcw size={16} /> Reset
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-bold">
            Month
            <select
              value={filters.month}
              onChange={(event) => updateFilter("month", event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">All months</option>
              {months.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </label>
          {filterFields.map(([key, label]) => (
            <label key={key} className="text-sm font-bold">
              {label}
              <input
                list={`graphical-${key}`}
                value={filters[key]}
                onChange={(event) => updateFilter(key, event.target.value)}
                placeholder={`Search or choose ${label.toLowerCase()}`}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2.5 font-normal outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700"
              />
              <datalist id={`graphical-${key}`}>
                {options[key].map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-md shadow-emerald-100/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:p-6">
        <div className="mb-6 flex items-center gap-2 text-lg font-black">
          <BarChart3 size={21} className="text-emerald-600" />
          {filters.month
            ? `${filters.month} attendance totals`
            : "Attendance totals"}
        </div>
        <div className="space-y-5">
          {[
            ["Students", totals.students, "bg-emerald-500"],
            ["Present", totals.present, "bg-blue-500"],
            ["Absent", totals.absent, "bg-orange-500"],
          ].map(([label, value, color]) => (
            <div key={label}>
              <div className="mb-1 flex items-center justify-between text-sm font-bold">
                <span>{label}</span>
                <span>{value}</span>
              </div>
              <div className="h-9 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-lg ${color} transition-all duration-500`}
                  style={{ width: `${(value / chartMax) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm font-semibold text-slate-500">
          {filteredReports.length === 0
            ? "No reports match the selected filters."
            : `${filteredReports.length} matching report records across ${new Set(filteredReports.map((report) => report.class_id)).size} classes.`}
        </p>
      </div>
    </section>
  );
}

export default GraphicalReport;
