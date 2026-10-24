"use client";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  classSchema,
  curriculumSchema,
  personSchema,
  reportSchema,
} from "@/lib/validation";
import { dateKey } from "@/lib/dates";
import { errorText } from "@/lib/i18n";
import { num, request, RequestError } from "@/lib/client";
import type {
  Curriculum,
  Person,
  Report,
  SchoolClass,
  Topic,
  Workspace,
} from "@/lib/types";
import { useI18n } from "./providers";
import { Button, Field, IconButton, Modal } from "./ui";
import { DateField, TimeField } from "./date-controls";
import { PlusIcon, TrashIcon } from "./icons";
export type Entity = "classes" | "people" | "curricula" | "reports";
export type Editable = SchoolClass | Person | Curriculum | Report;
export interface Editor {
  entity: Entity;
  record?: Editable;
  kind?: "teacher" | "supervisor";
  classId?: string;
}
export function EntityForm({
  editor,
  data,
  onClose,
  onSaved,
}: {
  editor: Editor;
  data: Workspace;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const { entity, record, kind } = editor;
  const old = (record ?? {}) as Partial<
    SchoolClass & Person & Curriculum & Report
  >;
  const [form, setForm] = useState({
    name: old.name ?? "",
    number: old.number ?? "",
    teacherId: old.teacherId ?? "",
    supervisorId: old.supervisorId ?? "",
    location: old.location ?? "",
    startTime: old.startTime ?? "08:00",
    endTime: old.endTime ?? "09:00",
    startedOn:
      old.startedOn ??
      (record ? "" : dateKey(new Date(), data.settings.timezone)),
    studentCount: old.studentCount ?? 0,
    kind: old.kind ?? kind ?? "teacher",
    phone: old.phone ?? "",
    email: old.email ?? "",
    active: old.active ?? true,
    pages: old.pages ?? 100,
    topics: old.topics ?? ([] as Topic[]),
    classId: old.classId ?? editor.classId ?? "",
    curriculumId: old.curriculumId ?? "",
    topicIds: old.topicIds ?? ([] as string[]),
    lesson: old.lesson ?? "",
    totalStudents:
      old.totalStudents ??
      data.classes.find((c) => c._id === editor.classId)?.studentCount ??
      0,
    present: old.present ?? 0,
    reportDate:
      old.reportDate ??
      (record ? "" : dateKey(new Date(), data.settings.timezone)),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState<string[]>([]);
  const update = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => {
    setForm((f) => ({ ...f, [key]: value }));
    setInvalid((v) => v.filter((k) => k !== key));
  };
  const schema = {
    classes: classSchema,
    people: personSchema,
    curricula: curriculumSchema,
    reports: reportSchema,
  }[entity];
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setInvalid(parsed.error.issues.map((i) => String(i.path[0])));
      setError(errorText("VALIDATION_ERROR", locale));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await request(`/api/${entity}${record ? `/${record._id}` : ""}`, {
        method: record ? "PUT" : "POST",
        body: JSON.stringify(parsed.data),
      });
      toast.success(t("saved"));
      await onSaved();
      onClose();
    } catch (e) {
      setError(
        errorText(
          e instanceof RequestError ? e.code : "SERVER_UNAVAILABLE",
          locale,
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  const text = (key: "name" | "number" | "location" | "phone" | "email") => (
    <input
      required={!["phone", "email"].includes(key)}
      aria-invalid={invalid.includes(key)}
      value={form[key]}
      type={key === "email" ? "email" : "text"}
      maxLength={key === "number" ? 30 : 150}
      onChange={(e) => update(key, e.target.value)}
    />
  );
  const count = (
    key: "studentCount" | "pages" | "totalStudents" | "present",
    min = 0,
  ) => (
    <input
      type="number"
      min={min}
      max={100000}
      required
      aria-invalid={invalid.includes(key)}
      value={form[key]}
      onChange={(e) =>
        update(key, e.target.value === "" ? 0 : Number(e.target.value))
      }
    />
  );
  const personSelect = (key: "teacherId" | "supervisorId") => (
    <select
      required
      value={form[key]}
      aria-invalid={invalid.includes(key)}
      onChange={(e) => update(key, e.target.value)}
    >
      <option value="">{t("choose")}</option>
      {data.people
        .filter(
          (p) =>
            p.kind === (key === "teacherId" ? "teacher" : "supervisor") &&
            p.active &&
            !p.archivedAt,
        )
        .map((p) => (
          <option key={p._id} value={p._id}>
            {p.name}
          </option>
        ))}
    </select>
  );
  const title = t(
    record
      ? "edit"
      : entity === "classes"
        ? "addClass"
        : entity === "reports"
          ? "addReport"
          : entity === "curricula"
            ? "addCurriculum"
            : kind === "supervisor"
              ? "addSupervisor"
              : "addTeacher",
  );
  const curriculum = data.curricula.find((c) => c._id === form.curriculumId);
  return (
    <Modal
      title={title}
      description={entity === "reports" ? t("reportHint") : undefined}
      onClose={() => !busy && onClose()}
      wide={entity === "reports" || entity === "curricula"}
    >
      <form onSubmit={submit} className="entity-form" noValidate>
        <div className="form-grid">
          {entity === "people" && (
            <>
              <Field label={t("name")}>{text("name")}</Field>
              <Field label={t("phone")}>{text("phone")}</Field>
              <Field label={t("email")}>{text("email")}</Field>
              <Field label={t("status")}>
                <select
                  value={form.active ? "active" : "inactive"}
                  onChange={(e) =>
                    update("active", e.target.value === "active")
                  }
                >
                  <option value="active">{t("active")}</option>
                  <option value="inactive">{t("inactive")}</option>
                </select>
              </Field>
            </>
          )}
          {entity === "classes" && (
            <>
              <Field label={t("number")}>{text("number")}</Field>
              <Field label={t("name")}>{text("name")}</Field>
              <Field label={t("teacher")}>{personSelect("teacherId")}</Field>
              <Field label={t("supervisor")}>
                {personSelect("supervisorId")}
              </Field>
              <Field label={t("location")}>{text("location")}</Field>
              <Field label={t("studentCount")}>{count("studentCount")}</Field>
              <TimeField
                label={t("startTime")}
                value={form.startTime}
                onChange={(v) => update("startTime", v)}
              />
              <TimeField
                label={t("endTime")}
                value={form.endTime}
                onChange={(v) => update("endTime", v)}
              />
              <DateField
                label={t("startedOn")}
                value={form.startedOn}
                onChange={(v) => update("startedOn", v)}
              />
            </>
          )}
          {entity === "curricula" && (
            <>
              <Field label={t("name")}>{text("name")}</Field>
              <Field label={t("pages")}>{count("pages", 1)}</Field>
              <section className="form-full topic-editor">
                <div className="section-heading">
                  <h3>{t("topics")}</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      update("topics", [
                        ...form.topics,
                        {
                          id: crypto.randomUUID(),
                          title: "",
                          startPage: 1,
                          endPage: form.pages,
                        },
                      ])
                    }
                  >
                    <PlusIcon />
                    {t("addTopic")}
                  </Button>
                </div>
                {!form.topics.length && (
                  <p className="muted">{t("noTopics")}</p>
                )}
                {form.topics.map((topic, i) => (
                  <div className="topic-row" key={topic.id}>
                    <Field label={t("topic")}>
                      <input
                        value={topic.title}
                        required
                        onChange={(e) =>
                          update(
                            "topics",
                            form.topics.map((p, j) =>
                              j === i ? { ...p, title: e.target.value } : p,
                            ),
                          )
                        }
                      />
                    </Field>
                    <Field label={t("startPage")}>
                      <input
                        type="number"
                        min={1}
                        max={form.pages}
                        value={topic.startPage}
                        onChange={(e) =>
                          update(
                            "topics",
                            form.topics.map((p, j) =>
                              j === i
                                ? { ...p, startPage: Number(e.target.value) }
                                : p,
                            ),
                          )
                        }
                      />
                    </Field>
                    <Field label={t("endPage")}>
                      <input
                        type="number"
                        min={topic.startPage}
                        max={form.pages}
                        value={topic.endPage}
                        onChange={(e) =>
                          update(
                            "topics",
                            form.topics.map((p, j) =>
                              j === i
                                ? { ...p, endPage: Number(e.target.value) }
                                : p,
                            ),
                          )
                        }
                      />
                    </Field>
                    <IconButton
                      label={t("delete")}
                      onClick={() =>
                        update(
                          "topics",
                          form.topics.filter((_, j) => j !== i),
                        )
                      }
                    >
                      <TrashIcon />
                    </IconButton>
                  </div>
                ))}
              </section>
            </>
          )}
          {entity === "reports" && (
            <>
              <Field label={t("class")}>
                <select
                  required
                  value={form.classId}
                  aria-invalid={invalid.includes("classId")}
                  onChange={(e) => {
                    const c = data.classes.find(
                      (c) => c._id === e.target.value,
                    );
                    setForm((f) => ({
                      ...f,
                      classId: e.target.value,
                      totalStudents: c?.studentCount ?? 0,
                      present: Math.min(f.present, c?.studentCount ?? 0),
                    }));
                  }}
                >
                  <option value="">{t("choose")}</option>
                  {data.classes
                    .filter((c) => !c.archivedAt)
                    .map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.number} · {c.name} ·{" "}
                        {data.people.find((p) => p._id === c.teacherId)?.name}
                      </option>
                    ))}
                </select>
              </Field>
              <DateField
                label={t("reportDate")}
                value={form.reportDate}
                onChange={(v) => update("reportDate", v)}
              />
              <Field label={t("curriculum")}>
                <select
                  required
                  value={form.curriculumId}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      curriculumId: e.target.value,
                      topicIds: [],
                    }))
                  }
                >
                  <option value="">{t("choose")}</option>
                  {data.curricula
                    .filter((c) => !c.archivedAt)
                    .map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label={t("totalStudents")}>{count("totalStudents")}</Field>
              <Field label={t("present")}>{count("present")}</Field>
              <Field label={t("absent")}>
                <output className="calculated-value">
                  {num(Math.max(0, form.totalStudents - form.present), locale)}
                </output>
              </Field>
              {curriculum && (
                <fieldset className="form-full topic-options">
                  <legend className="field-label">{t("topics")}</legend>
                  {!curriculum.topics.length ? (
                    <p className="muted">{t("noTopics")}</p>
                  ) : (
                    curriculum.topics.map((topic) => (
                      <label key={topic.id}>
                        <input
                          type="checkbox"
                          checked={form.topicIds.includes(topic.id)}
                          onChange={(e) => {
                            const ids = e.target.checked
                              ? [...form.topicIds, topic.id]
                              : form.topicIds.filter((v) => v !== topic.id);
                            setForm((f) => ({
                              ...f,
                              topicIds: ids,
                              lesson:
                                !f.lesson ||
                                curriculum.topics
                                  .filter((t) => f.topicIds.includes(t.id))
                                  .map((t) => t.title)
                                  .join("، ") === f.lesson
                                  ? curriculum.topics
                                      .filter((t) => ids.includes(t.id))
                                      .map((t) => t.title)
                                      .join("، ")
                                  : f.lesson,
                            }));
                          }}
                        />
                        <span>
                          {topic.title}
                          <small>
                            {num(topic.startPage, locale)}–
                            {num(topic.endPage, locale)} {t("pages")}
                          </small>
                        </span>
                      </label>
                    ))
                  )}
                </fieldset>
              )}
              <Field label={t("lesson")}>
                <textarea
                  value={form.lesson}
                  maxLength={2000}
                  required
                  aria-invalid={invalid.includes("lesson")}
                  onChange={(e) => update("lesson", e.target.value)}
                  rows={3}
                />
              </Field>
            </>
          )}
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <Button type="button" onClick={onClose} disabled={busy}>
            {t("cancel")}
          </Button>
          <Button variant="primary" disabled={busy} type="submit">
            {t(busy ? "saving" : record ? "save" : "create")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
