import { Check, Filter, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { apiFetch } from "./api";
import ReportAggregator from "./ReportAggregator";

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
const api = "http://localhost/reporting_system/backend/reports.php";
const classesApi = "http://localhost/reporting_system/backend/classes.php";
const curriculaApi = "http://localhost/reporting_system/backend/curricula.php";
const numbers = new Set(["tedad_shagerdan", "hazeran", "hafta"]);
const monthWeeks = ["1", "2", "3", "4"];

function Reports() {
  const { class_id: routeClassId } = useParams();
  const [reports, setReports] = useState([]);
  const [classes, setClasses] = useState([]);
  const [curricula, setCurricula] = useState([]);
  const [editReport, setEditReport] = useState(null);
  const [editClassName, setEditClassName] = useState("");
  const [filters, setFilters] = useState({
    nesab: [],
    month: [],
    month_week: [],
    absent_percentage: [],
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const refreshReports = () =>
    apiFetch(routeClassId ? `${api}?class_id=${routeClassId}` : api)
      .then((res) => res.json())
      .then(setReports)
      .catch(() => setReports([]));
  useEffect(() => {
    apiFetch(classesApi)
      .then((res) => res.json())
      .then((data) => {
        setClasses(data);
      })
      .catch(() => setClasses([]));
  }, [routeClassId]);
  useEffect(() => {
    apiFetch(curriculaApi)
      .then((res) => res.json())
      .then(setCurricula)
      .catch(() => setCurricula([]));
  }, []);
  useEffect(() => {
    apiFetch(routeClassId ? `${api}?class_id=${routeClassId}` : api)
      .then((res) => res.json())
      .then(setReports)
      .catch(() => setReports([]));
  }, [routeClassId]);

  const absentPercentage = (report) => {
    const students = Number(report.tedad_shagerdan || 0);
    const absent = Math.max(0, students - Number(report.hazeran || 0));
    return students > 0 ? (absent / students) * 100 : 0;
  };
  const filteredReports = reports.filter((report) =>
    Object.entries(filters).every(([key, values]) => {
      if (values.length === 0) return true;
      if (key === "absent_percentage") {
        return values.some(
          (threshold) => absentPercentage(report) < Number(threshold),
        );
      }
      return values.includes(String(report[key]));
    }),
  );
  const reportTotals = filteredReports.reduce(
    (totals, report) => {
      totals.classes.add(String(report.class_id));
      if (report.nesab) totals.curricula.add(report.nesab);
      if (report.month) totals.months.add(report.month);
      if (
        report.month_week !== null &&
        report.month_week !== undefined &&
        report.month_week !== ""
      ) {
        totals.monthWeeks.add(String(report.month_week));
      }
      totals.students += Number(report.tedad_shagerdan || 0);
      totals.present += Number(report.hazeran || 0);
      totals.absent += Math.max(
        0,
        Number(report.tedad_shagerdan || 0) - Number(report.hazeran || 0),
      );
      return totals;
    },
    {
      classes: new Set(),
      curricula: new Set(),
      months: new Set(),
      monthWeeks: new Set(),
      students: 0,
      present: 0,
      absent: 0,
    },
  );
  const filterOptions = {
    nesab: [
      ...new Set(reports.map((report) => report.nesab).filter(Boolean)),
    ].sort(),
    month: [
      ...new Set(reports.map((report) => report.month).filter(Boolean)),
    ].sort(),
    month_week: monthWeeks,
    absent_percentage: ["25", "50"],
  };
  const activeFilterCount = Object.values(filters).flat().length;
  const toggleFilter = (key, value) =>
    setFilters((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  const handleDelete = async (reportId) => {
    const result = await Swal.fire({
      title: "Delete this report?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!result.isConfirmed) return;
    await apiFetch(api, {
      method: "DELETE",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `report_id=${reportId}`,
    });
    refreshReports();
  };
  const saveEdit = async () => {
    const item = classes.find(
      (value) =>
        value.nam_senf.toLowerCase() === editClassName.trim().toLowerCase(),
    );
    if (!item) return;
    await apiFetch(api, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editReport,
        gheir_hazeran: Math.max(
          0,
          Number(editReport.tedad_shagerdan || 0) -
            Number(editReport.hazeran || 0),
        ),
        class_id: item.class_id,
      }),
    });
    setEditReport(null);
    refreshReports();
  };

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-sm font-bold uppercase tracking-widest text-blue-600">
            Attendance log
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Reports
          </h1>
        </div>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          {filteredReports.length} total
        </span>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilterOpen((open) => !open)}
          className="flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-blue-700 shadow-sm hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800"
        >
          <Filter size={17} /> Filters{" "}
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={() =>
              setFilters({
                nesab: [],
                month: [],
                month_week: [],
                absent_percentage: [],
              })
            }
            className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            Clear all
          </button>
        )}
        {Object.entries(filters).flatMap(([key, values]) =>
          values.map((value) => (
            <button
              type="button"
              key={`${key}-${value}`}
              onClick={() => toggleFilter(key, value)}
              className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-200"
            >
              {key === "absent_percentage"
                ? "Absent"
                : key === "nesab"
                  ? "Curriculum"
                  : key === "month_week"
                    ? "Month-week"
                    : "Month"}
              : {value} x
            </button>
          )),
        )}
      </div>
      {filterOpen && (
        <div className="mb-4 grid gap-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-3">
          {Object.entries(filterOptions).map(([key, options]) => (
            <fieldset key={key}>
              <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                {key === "absent_percentage"
                  ? "Absent percentage"
                  : key === "nesab"
                    ? "Curriculum"
                    : key === "month_week"
                      ? "Month-week"
                      : "Month"}
              </legend>
              <div className="flex flex-wrap gap-2">
                {options.map((option) => (
                  <label
                    key={option}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 text-sm dark:border-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={filters[key].includes(option)}
                      onChange={() => toggleFilter(key, option)}
                    />
                    {key === "absent_percentage"
                      ? `Less than ${option}%`
                      : option}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      )}
      <ReportAggregator reports={filteredReports} classes={classes} />
      <div className="overflow-x-auto rounded-2xl border border-blue-100 bg-white shadow-md shadow-blue-100/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <table className="w-full min-w-250 text-sm">
          <thead className="bg-blue-600 text-left text-xs uppercase tracking-wide text-white dark:bg-slate-800">
            <tr>
              {[
                "ID",
                "Class",
                "Students",
                "Present",
                "Absent",
                "Lesson",
                "Curriculum",
                "Week",
                "Month",
                "Month-week",
                "Actions",
              ].map((heading) => (
                <th key={heading} className="px-4 py-3">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b-2 border-blue-300 bg-blue-100 font-black text-blue-950 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100">
              <td colSpan={2} className="px-4 py-3 text-left">
                Totals: {reportTotals.classes.size} classes
              </td>
              <td className="px-4 py-3">{reportTotals.students}</td>
              <td className="px-4 py-3">{reportTotals.present}</td>
              <td className="px-4 py-3">{reportTotals.absent}</td>
              <td className="px-4 py-3">-</td>
              <td className="px-4 py-3">{reportTotals.curricula.size}</td>
              <td className="px-4 py-3">-</td>
              <td className="px-4 py-3">{reportTotals.months.size}</td>
              <td className="px-4 py-3">{reportTotals.monthWeeks.size}</td>
              <td className="px-4 py-3">-</td>
            </tr>
            {filteredReports.map((report) => {
              const reportClass = classes.find(
                (item) => String(item.class_id) === String(report.class_id),
              );
              return (
                <tr
                  key={report.report_id}
                  className="border-t border-sky-200 odd:bg-sky-50 even:bg-cyan-100/80 hover:bg-blue-200 dark:border-slate-700 dark:odd:bg-slate-900 dark:even:bg-blue-950/70 dark:hover:bg-blue-900"
                >
                  {editReport?.report_id === report.report_id ? (
                    <>
                      <td className="px-4 py-3">{report.report_id}</td>
                      <td className="px-4 py-3">
                        <input
                          list="edit-class-options"
                          value={editClassName}
                          onChange={(event) =>
                            setEditClassName(event.target.value)
                          }
                          className="w-full rounded-lg border bg-transparent px-2 py-1.5"
                        />
                      </td>
                      {fields.map(([key]) => (
                        <td key={key} className="px-4 py-3">
                          {key === "gheir_hazeran" ? (
                            <output className="block rounded-lg border border-slate-200 bg-slate-100 px-2 py-1.5 text-center dark:border-slate-700 dark:bg-slate-800">
                              {Math.max(
                                0,
                                Number(editReport.tedad_shagerdan || 0) -
                                  Number(editReport.hazeran || 0),
                              )}
                            </output>
                          ) : key === "nesab" ? (
                            <select
                              value={editReport[key] || ""}
                              onChange={(event) => {
                                const value = numbers.has(key)
                                  ? event.target.value.replace(/\D/g, "")
                                  : event.target.value;
                                const cappedValue =
                                  key === "hazeran" &&
                                  Number(value) >
                                    Number(editReport.tedad_shagerdan)
                                    ? editReport.tedad_shagerdan
                                    : value;
                                setEditReport({
                                  ...editReport,
                                  [key]: cappedValue,
                                });
                              }}
                              className="w-full rounded-lg border bg-white px-2 py-1.5 dark:bg-slate-900"
                            >
                              <option value="">Choose a curriculum</option>
                              {curricula.map((item) => (
                                <option
                                  key={item.curriculum_id}
                                  value={item.name}
                                >
                                  {item.name}
                                </option>
                              ))}
                            </select>
                          ) : key === "month_week" ? (
                            <select
                              value={editReport[key] || ""}
                              onChange={(event) =>
                                setEditReport({
                                  ...editReport,
                                  [key]: event.target.value,
                                })
                              }
                              className="w-full rounded-lg border bg-white px-2 py-1.5 dark:bg-slate-900"
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
                              type="text"
                              value={editReport[key] || ""}
                              onChange={(event) =>
                                setEditReport({
                                  ...editReport,
                                  [key]: event.target.value,
                                })
                              }
                              className="w-full rounded-lg border bg-transparent px-2 py-1.5"
                            />
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <button
                          title="Save"
                          aria-label="Save report"
                          onClick={saveEdit}
                          className="mr-1 rounded-lg bg-emerald-600 p-2 text-white"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          title="Cancel"
                          aria-label="Cancel edit"
                          onClick={() => setEditReport(null)}
                          className="rounded-lg bg-slate-500 p-2 text-white"
                        >
                          <X size={16} />
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">{report.report_id}</td>
                      <td className="px-4 py-3 font-semibold">
                        {reportClass?.nam_senf || "Unknown"}
                      </td>
                      <td className="px-4 py-3">{report.tedad_shagerdan}</td>
                      <td className="px-4 py-3">{report.hazeran}</td>
                      <td className="px-4 py-3">
                        {Math.max(
                          0,
                          Number(report.tedad_shagerdan || 0) -
                            Number(report.hazeran || 0),
                        )}
                      </td>
                      <td className="px-4 py-3">{report.onvan_dars}</td>
                      <td className="px-4 py-3">{report.nesab}</td>
                      <td className="px-4 py-3">{report.hafta}</td>
                      <td className="px-4 py-3">{report.month}</td>
                      <td className="px-4 py-3">{report.month_week}</td>
                      <td className="px-4 py-3">
                        <button
                          title="Edit"
                          aria-label="Edit report"
                          onClick={() => {
                            setEditReport(report);
                            setEditClassName(reportClass?.nam_senf || "");
                          }}
                          className="mr-1 rounded-lg p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          title="Delete"
                          aria-label="Delete report"
                          onClick={() => handleDelete(report.report_id)}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <Trash2 size={17} />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <datalist id="edit-class-options">
        {classes.map((item) => (
          <option key={item.class_id} value={item.nam_senf} />
        ))}
      </datalist>
    </section>
  );
}
export default Reports;
