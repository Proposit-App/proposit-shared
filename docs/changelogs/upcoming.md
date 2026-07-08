# Changelog — upcoming

## Added

- `createApiClient` gains `importArgument(data: TCreateArgument): Promise<Result<TArgumentCreateTask>>`
  — `POST /api/v1/argument/import/{data.origin}`, returning the immediately-created
  `argument_create` task (its `data.{argumentId, version}` are present right away). Mirrors
  `createArgument` and the web app's previously hand-rolled `createArgumentTask`, so import
  flows no longer need to reach around the published client. Purely additive.
