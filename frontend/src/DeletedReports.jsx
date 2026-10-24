import { Filter, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { apiFetch } from "./api";
import ReportAggregator from "./ReportAggregator";

const api =
  "http://localhost/reporting_system/backend/deleted_classes_reports.php";
const classesApi =
  "http://localhost/reporting_system/backend/deleted_classes.php";
const fields = [
  ["tedad_shagerdan", "Students"],
  ["hazeran", "Present"],
  ["onvan_dars", "Lesson"],
  ["nesab", "Curriculum"],
  ["hafta", "Week"],
  ["month", "Month"],
  ["month_week", "Month-week"],
];

function DeletedReports() {
  const { class_id: routeClassId } = useParams();
  const [reports, setReports] = useState([]);
  const [classes, setClasses] = useState([]);
  const [editReport, setEditReport] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [filters, setFilters] = useState({
    nesab: [],
    month: [],
    month_week: [],
    absent_percentage: [],
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const refresh = useCallback(() => {
    apiFetch(routeClassId ? `${api}?class_id=${routeClassId}` : api)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !Array.isArray(data)) {
          throw new Error(data.error || "Unable to load archived reports");
        }
        setReports(data);
        setLoadError("");
      })
      .catch((error) => {
        setReports([]);
        setLoadError(error.message);
      });
  }, [routeClassId]);
  useEffect(() => {
    refresh();
    apiFetch(classesApi)
      .then((res) => res.json())
      .then(setClasses)
      .catch(() => setClasses([]));
  }, [refresh]);

  const remove = async (reportId) => {
    const result = await Swal.fire({
      title: "Permanently delete this report?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete permanently",
    });
    if (!result.isConfirmed) return;
    await apiFetch(api, {
      method: "DELETE",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `report_id=${reportId}`,
    });
    refresh();
  };
  const save = async () => {
    const total = Number(editReport.tedad_shagerdan || 0);
    const present = Math.min(total, Number(editReport.hazeran || 0));
    await apiFetch(api, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editReport,
        tedad_shagerdan: total,
        hazeran: present,
      }),
    });
    setEditReport(null);
    refresh();
  };
  const className = (classId) =>
    classes.find((item) => String(item.class_id) === String(classId))
      ?.nam_senf || "Unknown";
  const absent = (report) =>
    Math.max(
      0,
      Number(report.tedad_shagerdan || 0) - Number(report.hazeran || 0),
    );
  const absentPercentage = (report) => {
    const students = Number(report.tedad_shagerdan || 0);
    return students > 0 ? (absent(report) / students) * 100 : 0;
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
      totals.absent += absent(report);
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
    month_week: ["1", "2", "3", "4"],
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

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-sm font-bold uppercase tracking-widest text-red-600">
            Archive
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Archived reports
          </h1>
        </div>
        <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
          {filteredReports.length} total
        </span>
      </div>
      {loadError && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {loadError}
        </p>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilterOpen((open) => !open)}
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-700 shadow-sm hover:bg-red-50 dark:border-slate-700 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-slate-800"
        >
          <Filter size={17} /> Filters
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
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
              className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 dark:bg-red-950 dark:text-red-200"
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
        <div className="mb-4 grid gap-3 rounded-2xl border border-red-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-3">
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
      <ReportAggregator reports={filteredReports} classes={classes} archived />
      <div className="overflow-x-auto rounded-2xl border border-red-100 bg-white shadow-md shadow-red-100/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <table className="w-full min-w-250 text-sm">
          <thead className="bg-red-600 text-left text-xs uppercase tracking-wide text-white dark:bg-slate-800">
            <tr>
              {[
                "ID",
                "Class",
                "Students",
                "Present",
                "Absent",
                ...fields.slice(2).map(([, label]) => label),
                "Actions",
              ].map((heading) => (
                <th key={heading} className="px-4 py-3">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b-2 border-red-300 bg-red-100 font-black text-red-950 dark:border-red-700 dark:bg-red-950 dark:text-red-100">
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
            {filteredReports.length === 0 && !loadError ? (
              <tr>
                <td
                  colSpan={fields.length + 4}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  {reports.length === 0
                    ? "No archived reports found."
                    : "No reports match the selected filters."}
                </td>
              </tr>
            ) : (
              filteredReports.map((report) => (
                <tr
                  key={report.report_id}
                  className="border-t border-red-100 odd:bg-red-50 even:bg-orange-50 hover:bg-red-100 dark:border-slate-700 dark:odd:bg-slate-900 dark:even:bg-red-950/40 dark:hover:bg-red-900/50"
                >
                  {editReport?.report_id === report.report_id ? (
                    <>
                      <td className="px-4 py-3">{report.report_id}</td>
                      <td className="px-4 py-3">
                        {className(report.class_id)}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={editReport.tedad_shagerdan || ""}
                          onChange={(event) =>
                            setEditReport({
                              ...editReport,
                              tedad_shagerdan: event.target.value,
                            })
                          }
                          className="w-full rounded-lg border bg-transparent px-2 py-1.5"
                          placeholder="Students"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={editReport.hazeran || ""}
                          onChange={(event) =>
                            setEditReport({
                              ...editReport,
                              hazeran: event.target.value,
                            })
                          }
                          className="w-full rounded-lg border bg-transparent px-2 py-1.5"
                          placeholder="Present"
                        />
                      </td>
                      <td className="px-4 py-3">{absent(editReport)}</td>
                      {fields.slice(2).map(([key, label]) => (
                        <td key={key} className="px-4 py-3">
                          <input
                            value={editReport[key] || ""}
                            onChange={(event) =>
                              setEditReport({
                                ...editReport,
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
                      <td className="px-4 py-3">{report.report_id}</td>
                      <td className="px-4 py-3 font-semibold">
                        {className(report.class_id)}
                      </td>
                      <td className="px-4 py-3">{report.tedad_shagerdan}</td>
                      <td className="px-4 py-3">{report.hazeran}</td>
                      <td className="px-4 py-3">{absent(report)}</td>
                      {fields.slice(2).map(([key]) => (
                        <td key={key} className="px-4 py-3">
                          {report[key]}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <button
                          title="Edit"
                          aria-label="Edit archived report"
                          onClick={() => setEditReport(report)}
                          className="mr-1 rounded-lg p-2 text-amber-600 hover:bg-amber-50"
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          title="Delete permanently"
                          aria-label="Delete permanently"
                          onClick={() => remove(report.report_id)}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={17} />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default DeletedReports;
