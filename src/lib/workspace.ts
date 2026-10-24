import type {
  Collection,
  CountDocumentsOptions,
  DeleteOptions,
  Document,
  Filter,
  FindOptions,
  BulkWriteOptions,
  InsertOneOptions,
  OptionalUnlessRequiredId,
  UpdateFilter,
  UpdateOptions,
} from "mongodb";
import { collections } from "./db";
import { defaultSettings } from "./dates";

type Record = Document & { _id: string; ownerId?: string };

// Every business read/write is scoped here; HTTP input never chooses the owner.
class WorkspaceCollection<T extends Record> {
  constructor(
    private readonly source: Collection<T>,
    private readonly ownerId: string,
  ) {}

  private filter(filter: Filter<T> = {}): Filter<T> {
    return { $and: [{ ownerId: this.ownerId }, filter] } as Filter<T>;
  }

  find(filter: Filter<T> = {}, options?: FindOptions) {
    return this.source.find(this.filter(filter), options);
  }

  findOne(filter: Filter<T> = {}, options?: FindOptions) {
    return this.source.findOne(this.filter(filter), options);
  }

  countDocuments(filter: Filter<T> = {}, options?: CountDocumentsOptions) {
    return this.source.countDocuments(this.filter(filter), options);
  }

  insertOne(document: T, options?: InsertOneOptions) {
    return this.source.insertOne(
      { ...document, ownerId: this.ownerId } as OptionalUnlessRequiredId<T>,
      options,
    );
  }

  insertMany(documents: T[], options?: BulkWriteOptions) {
    return this.source.insertMany(
      documents.map((document) => ({
        ...document,
        ownerId: this.ownerId,
      })) as OptionalUnlessRequiredId<T>[],
      options,
    );
  }

  updateOne(
    filter: Filter<T>,
    update: UpdateFilter<T>,
    options?: UpdateOptions,
  ) {
    return this.source.updateOne(
      this.filter(filter),
      {
        ...update,
        $set: { ...update.$set, ownerId: this.ownerId },
      } as UpdateFilter<T>,
      options,
    );
  }

  deleteOne(filter: Filter<T>, options?: DeleteOptions) {
    return this.source.deleteOne(this.filter(filter), options);
  }

  deleteMany(filter: Filter<T>, options?: DeleteOptions) {
    return this.source.deleteMany(this.filter(filter), options);
  }
}

export async function workspaceCollections(ownerId: string) {
  if (!ownerId) throw new Error("WORKSPACE_OWNER_REQUIRED");
  const c = await collections();
  return {
    classes: new WorkspaceCollection(c.classes, ownerId),
    people: new WorkspaceCollection(c.people, ownerId),
    curricula: new WorkspaceCollection(c.curricula, ownerId),
    reports: new WorkspaceCollection(c.reports, ownerId),
    settings: new WorkspaceCollection(c.settings, ownerId),
    collection: (entity: "classes" | "people" | "curricula" | "reports") =>
      new WorkspaceCollection(c.db.collection<Record>(entity), ownerId),
  };
}

export function initialSettings(ownerId: string) {
  return { ...defaultSettings, _id: ownerId, ownerId };
}
