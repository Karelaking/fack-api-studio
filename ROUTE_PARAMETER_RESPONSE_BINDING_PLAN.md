# Implementation Plan: Route Parameter Response Binding

## Goal

Let a user define a parameterized route such as `/api/v2/users/:id`, then choose how the matching response field gets its value:

- **Use URL value:** A request to `/api/v2/users/295` returns `295` in the configured `id` response field.
- **Generate with a provider:** The field uses an existing Faker provider, regardless of the value in the URL. The parameter still participates in route matching.

The route path and the response field are separate concepts: the path parameter selects a route, while the field source controls what is returned.

> Use the slash-delimited form `/users/:id`. The existing matcher follows this syntax; `/users:id` is not the intended parameter segment form.

## Current implementation

- `lib/route-matcher.ts` supports named `:param` segments and returns decoded parameter values.
- `lib/mock-handler-core.ts` already receives matched parameters. Its response-template path exposes them as `request.params`, but schema-generated responses do not use them.
- `lib/schema-synthesizer.ts` converts visual fields to JSON Schema and back. It currently round-trips Faker metadata, but has no request-value source.
- `components/canvas/AddRouteDialog.tsx` accepts a route path. `NodeInspector` and `FieldInspector` edit route fields.
- Routes already store `path` and `responseSchema`. The binding can be persisted as JSON Schema metadata without adding a database column.

## Product behavior and defaults

1. Parse parameters from the effective route path, including the endpoint base path and route subpath.
2. Show discovered parameters in the route inspector.
3. When a route is first created with a path parameter, offer a same-named response field. If the starter schema already created that field, expose the parameter as its source option.
4. Default a newly created same-named field to **Use URL value** so the example request returns its ID directly. Users can switch the source to a Faker provider.
5. Do not silently replace a user's existing field configuration when they later edit a route path. Show the new parameter and let them add or bind a field.
6. Add a dashboard “Try request” interaction with an input for each route parameter. These are preview inputs; actual deployed requests still provide values in the URL.

## Data and runtime design

### Schema metadata

Add a discriminated field source to the visual schema model. Serialize a URL binding as a namespaced JSON Schema extension, for example:

```json
{
  "id": {
    "type": "string",
    "x-fack-source": { "type": "pathParam", "name": "id" }
  }
}
```

Update the schema parser and synthesizer so the binding survives save, reload, edits, nested fields, and schema preview. Treat Faker and URL parameter as mutually exclusive active sources for a field. Keep existing schemas without `x-fack-source` behaving exactly as they do now.

### Request-time resolution

1. Match the incoming request and get the decoded path parameters from the existing matcher.
2. Generate or retrieve the usual schema-based payload.
3. Apply configured URL bindings to a copy of the payload, after stateful data merging and before query processing and response formatting. This makes the configured URL value authoritative and avoids changing shared cached payloads.
4. Resolve only declared field bindings with a safe property lookup. Do not evaluate user-authored code or arbitrary expressions.
5. Support root fields, nested object fields, and object fields within arrays. For a bound scalar field, use the matched URL segment. Keep path parameters string-typed by default; if a user explicitly binds to a numeric or boolean field, perform strict conversion and return a clear client error for an invalid value.
6. If a schema binding references a parameter no longer present in the route, show a validation error when saving the route and prevent the stale binding from silently producing a misleading response.

Keep the existing `responseTemplate` behavior intact. It already offers an advanced way to use `{{request.params.id}}`, but it bypasses schema-generated field behavior.

## Work breakdown

### 1. Shared parameter discovery and validation

- Add a shared utility to extract named path parameters using the same syntax as the runtime matcher.
- Use the combined endpoint base path and route subpath wherever the full route is needed.
- Cover parameter names, repeated names, trailing slashes, encoded values, and unsupported/malformed patterns.
- Validate that saved field bindings reference parameters declared by the effective route.

### 2. Route editor and preview UI

- Show detected parameters in the route/node inspector with their names and required status.
- Add a field source control: **URL parameter** or **Faker provider**.
- When URL parameter is selected, let the user select among parameters in that route.
- Offer to add a same-named field when missing; preserve existing user field settings on route edits.
- Add “Try request” inputs that construct the concrete URL and display the returned response for the entered values.
- Keep the field editor consistent wherever the visual schema can be edited, including the compact inspector and advanced editor.

### 3. Schema persistence and round-trip support

- Extend `SchemaField` and the JSON Schema property type with the URL source metadata.
- Preserve the metadata in `parseSchemaToFields` and `synthesizeSchema`, including nested objects and array item schemas.
- Ensure JSON Schema preview, save/reload, field renames, and unrelated field edits do not drop or stale the binding.
- Keep existing `responseSchema` rows and older project backups compatible; no database migration is expected.

### 4. Request-time binding

- Add a small binding resolver that accepts a schema payload and matched path parameters.
- Clone cached/generated data before applying the request-specific values.
- Apply bindings after stateful response merging and before query filtering/formatting.
- Implement strict scalar conversion and a clear error response for invalid numeric/boolean bindings.
- Ensure bindings work for generated objects, nested objects, array items, and stateful responses.

### 5. Exports, docs, and compatibility

- Update OpenAPI generation to emit each route parameter as a required `in: path` parameter.
- Exclude the private `x-fack-source` runtime annotation from generated TypeScript types and public response schemas where it is not meaningful.
- Document route syntax, the two field source options, URL examples, and the distinction between parameter matching and response generation.
- Preserve existing Faker-only schemas, response templates, response wrappers, query filtering, and caching behavior.

## Acceptance criteria

- A route `/api/v2/users/:id` matches `/api/v2/users/295` and extracts `id` as `295`.
- With the `id` field set to **URL parameter**, the response payload contains `"id": "295"`.
- With the `id` field set to a Faker provider, the field uses that provider while the route continues to match on the supplied URL segment.
- A route parameter can be bound to a same-named or differently named response field.
- Bindings survive schema save/reload and edits to unrelated fields.
- Requests with different parameter values do not affect each other's cached payloads.
- Invalid or stale bindings produce a clear, actionable validation result.
- Existing routes and schemas without bindings behave as before.

## Verification plan for implementation

- Unit coverage for parameter discovery, schema metadata round-tripping, safe value resolution, and scalar conversion.
- Handler-level coverage for direct URL echo, Faker selection, nested/array fields, stateful data, and consecutive requests with different IDs while caching is enabled.
- UI coverage for adding a parameter field, switching its source, and sending a try request.
- Run the repository's configured checks after implementation. No code or tests are changed as part of this plan document.

## Scope boundary

The first release covers **path parameters**. Query and request-body values can later use the same field-source model, but should be separate source options with their own UI and validation rules.
