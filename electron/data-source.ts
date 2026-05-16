export abstract class IAppDataSource<T> {
  abstract getInstance(): T
  abstract initialize(): Promise<T>
  abstract destroy(): Promise<void>
}
