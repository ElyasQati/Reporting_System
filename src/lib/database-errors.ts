function mongoCode(error: Error) {
  return error.name === "MongoServerError" &&
    "code" in error &&
    typeof error.code === "number"
    ? error.code
    : undefined;
}

export function databaseFailure(error: unknown) {
  if (!(error instanceof Error)) return null;
  if (error.message === "DATABASE_NOT_CONFIGURED")
    return "DATABASE_NOT_CONFIGURED";
  // URI parsing can throw a same-named error from a driver dependency rather
  // than the MongoParseError constructor exported by mongodb itself.
  if (
    error.name === "MongoParseError" ||
    error.name === "MongoInvalidArgumentError"
  )
    return "DATABASE_CONFIGURATION_ERROR";
  if (error.name === "MongoServerError") {
    if (
      mongoCode(error) === 18 ||
      (mongoCode(error) === 8000 &&
        /bad auth|authentication failed/i.test(error.message))
    )
      return "DATABASE_AUTH_FAILED";
    if (mongoCode(error) === 13) return "DATABASE_PERMISSION_DENIED";
  }
  if (
    [
      "MongoNetworkError",
      "MongoNetworkTimeoutError",
      "MongoServerSelectionError",
    ].includes(error.name)
  )
    return "DATABASE_UNREACHABLE";
  return null;
}

// Raw driver messages, causes and stacks can contain credentials or private hosts.
export function safeErrorDetails(error: unknown) {
  return {
    name:
      error instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,79}$/.test(error.name)
        ? error.name
        : "UnknownError",
    diagnosis: databaseFailure(error) ?? "SERVER_UNAVAILABLE",
    ...(error instanceof Error && mongoCode(error) !== undefined
      ? { mongoCode: mongoCode(error) }
      : {}),
  };
}
