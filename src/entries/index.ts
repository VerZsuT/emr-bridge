/*
	Главная точка входа.
	Экспорт только типов потому что одновременный импорт для разных процессов приводит к ошибке.
*/

export type { EventListener, EventUnsubscribe, HasSnapshotClass, IBridge, IHasSnapshot } from '../types.js'

/*
	Ошибки не зависят от процессов, поэтому их можно безопасно
	экспортировать из общей точки входа.
*/
export * from '../errors.js'

