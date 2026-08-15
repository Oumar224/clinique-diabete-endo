import 'reflect-metadata'

export function SchemaField(): PropertyDecorator {
  return (_target, _propertyKey) => {
    // Decorator marker — emitDecoratorMetadata infers the type at runtime
  }
}

export function buildDocumentSchema(EntityClass: Function): Record<string, unknown> {
  const prototype = EntityClass.prototype
  const instance = new (EntityClass as new () => object)()
  const schema: Record<string, unknown> = {}
  for (const key of Object.keys(instance)) {
    if (key === 'id') continue
    const designType = Reflect.getMetadata('design:type', prototype, key)
    schema[key] = { type: designType?.name ?? 'unknown' }
  }
  return schema
}
