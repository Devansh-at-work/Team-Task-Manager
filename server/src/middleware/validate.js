export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query
    });

    if (!result.success) {
      const error = new Error(result.error.issues[0]?.message || "Invalid request");
      error.status = 400;
      return next(error);
    }

    req.validated = result.data;
    next();
  };
}
