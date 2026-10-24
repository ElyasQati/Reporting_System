import {
  Archive,
  BarChart3,
  BookOpen,
  Download,
  FileText,
  Library,
  LogOut,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

const backupApi = "http://localhost/reporting_system/backend/backup.php";

function Sidebar({ open, onClose, onLogout }) {
  const closeAfterNavigate = () => onClose();

  return (
    <>
      {open && (
        <button
          aria-label="Close menu"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-slate-200 bg-white p-6 text-slate-800 shadow-xl transition-transform dark:border-slate-800 dark:bg-slate-900 dark:text-white lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="mb-10 flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tight text-blue-700 dark:text-blue-300">
            Report Desk
          </h2>
          <button
            aria-label="Close menu"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-white/10 lg:hidden"
          >
            <X size={22} />
          </button>
        </div>
        <nav className="flex h-[calc(100vh-7rem)] flex-col gap-2">
          <Link
            onClick={closeAfterNavigate}
            to="/classes/new"
            className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold transition hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <Plus size={19} /> Add class
          </Link>
          <Link
            onClick={closeAfterNavigate}
            to="/reports/new"
            className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold transition hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <Plus size={19} /> Add report
          </Link>
          <Link
            onClick={closeAfterNavigate}
            to="/curricula"
            className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold transition hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <Library size={19} /> Curriculum
          </Link>
          <Link
            onClick={closeAfterNavigate}
            to="/classes"
            className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold transition hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <BookOpen size={19} /> Classes
          </Link>
          <Link
            onClick={closeAfterNavigate}
            to="/reports"
            className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold transition hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <FileText size={19} /> Reports
          </Link>
          <Link
            onClick={closeAfterNavigate}
            to="/graphical-report"
            className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold transition hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <BarChart3 size={19} /> Graphical report
          </Link>
          <Link
            onClick={closeAfterNavigate}
            to="/deleted-classes"
            className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold transition hover:bg-red-50 hover:text-red-700 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <Trash2 size={19} /> Archived classes
          </Link>
          <Link
            onClick={closeAfterNavigate}
            to="/deleted-reports"
            className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold transition hover:bg-red-50 hover:text-red-700 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <Archive size={19} /> Archived reports
          </Link>
          <a
            href={backupApi}
            onClick={closeAfterNavigate}
            className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold transition hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <Download size={19} /> Download backup
          </a>
          <button
            onClick={onLogout}
            className="mt-auto flex items-center gap-3 rounded-xl px-4 py-3 text-left font-semibold text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            <LogOut size={19} /> Sign out
          </button>
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
