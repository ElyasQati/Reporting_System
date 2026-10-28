import { z } from "zod";
import { validDate } from "./dates";
const name = z.string().trim().min(1).max(150);
const id = z.uuid();
const date = z.string().refine(validDate, "INVALID_DATE");
const count = z.coerce.number().int().min(0).max(100000);
export const personSchema = z.object({
  kind: z.enum(["teacher", "supervisor"]),
  name,
  phone: z.string().trim().max(40).default(""),
  email: z.union([z.email(), z.literal("")]).default(""),
  active: z.boolean().default(true),
});
export const classSchema = z
  .object({
    number: z.string().trim().min(1).max(30),
    name,
    teacherId: id,
    supervisorId: id,
    location: name,
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    studentCount: count,
    startedOn: date,
  })
  .refine((v) => v.endTime > v.startTime, {
    path: ["endTime"],
    message: "INVALID_TIME_RANGE",
  });
export const curriculumSchema = z
  .object({
    name,
    pages: z.coerce.number().int().min(1).max(10000),
    topics: z
      .array(
        z.object({
          id,
          title: name,
          startPage: z.coerce.number().int().min(1),
          endPage: z.coerce.number().int().min(1),
        }),
      )
      .max(300),
  })
  .superRefine((v, ctx) => {
    const seen = new Set<string>();
    v.topics.forEach((topic, i) => {
      if (topic.startPage > topic.endPage || topic.endPage > v.pages)
        ctx.addIssue({
          code: "custom",
          path: ["topics", i],
          message: "INVALID_PAGE_RANGE",
        });
      if (seen.has(topic.id))
        ctx.addIssue({
          code: "custom",
          path: ["topics", i],
          message: "DUPLICATE_TOPIC",
        });
      seen.add(topic.id);
    });
  });
export const reportSchema = z
  .object({
    classId: id,
    curriculumId: id,
    topicIds: z.array(id).max(100),
    lesson: z.string().trim().min(1).max(2000),
    totalStudents: count,
    present: count,
    reportDate: date,
  })
  .refine((v) => v.present <= v.totalStudents, {
    path: ["present"],
    message: "PRESENT_EXCEEDS_TOTAL",
  });
export const settingsSchema = z
  .object({
    organization: name,
    timezone: z.enum(["Asia/Kabul", "Asia/Tehran", "UTC"]),
    weekStartsOn: z.coerce.number().int().min(0).max(6),
    deadlineDay: z.coerce.number().int().min(0).max(6),
    deadlineHour: z.coerce.number().int().min(0).max(23),
    rankingWeeks: z.coerce.number().int().min(2).max(52),
    weights: z.object({
      timeliness: count,
      attendance: count,
      stability: count,
    }),
  })
  .refine(
    (v) =>
      v.weights.timeliness + v.weights.attendance + v.weights.stability === 100,
    { message: "WEIGHTS_MUST_TOTAL_100" },
  );
