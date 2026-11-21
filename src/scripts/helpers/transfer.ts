import type { IHasSnapshot, ISnapshotValue } from '../../types.js'

/**
 * Хелпер для передачи значений через IPC.
 */
export default class Transfer {
	/**
	 * Получить значение из снимка.
	 * @param value - Значение-снимок.
	 * @param Class - Класс, экземпляр которого будет создан из снимка.
	 * @returns Значение из снимка.
	 */
	public static getFromSnapshot<
		TSnapshot,
		TClass extends { new(): IHasSnapshot<TSnapshot> }
	>(value: ISnapshotValue<TSnapshot>, Class: TClass) {
		const instance = new Class()

		instance.updateFromSnapshot(value.__snapshot__)

		return instance as InstanceType<TClass>
	}

	/**
	 * Преобразовать значение в передаваемое по IPC.
	 * 
	 * Если возможно, создаст снимок.
	 * @param value - Преобразуемое значение.
	 * @returns Значение, передаваемое по IPC.
	 */
	public static toTransferable<T>(value: T): ISnapshotValue | T {
		if (this.isHasSnapshot(value)) {
			return {
				__type__: 'snapshot',
				__snapshot__: value.takeSnapshot()
			} satisfies ISnapshotValue
		}

		return value
	}

	/**
	 * Является ли переданное по IPC значение снимком.
	 *
	 * Проверяются собственные свойства, а не унаследованные, и допускаются
	 * любые falsy-снимки (`0`, `false`, `''`, `null`).
	 * @param value - Значение из IPC.
	 */
	public static isSnapshotValue(value: unknown): value is ISnapshotValue {
		if (typeof value !== 'object' || value === null) {
			return false
		}

		return (
			Object.prototype.hasOwnProperty.call(value, '__type__')
			&& Object.prototype.hasOwnProperty.call(value, '__snapshot__')
			&& (value as ISnapshotValue).__type__ === 'snapshot')
	}

	/**
	 * Может ли значение вернуть снимок.
	 * @param value - Значение.
	 */
	public static isHasSnapshot(value: unknown): value is IHasSnapshot {
		if (typeof value !== 'object' || value === null) {
			return false
		}

		const candidate = value as Partial<IHasSnapshot>

		return (
			typeof candidate.takeSnapshot === 'function'
			&& typeof candidate.updateFromSnapshot === 'function')
	}

	/**
	 * Является ли значение обещанием (или "thenable").
	 * @param value - Значение.
	 */
	public static isPromiseLike<T = unknown>(value: unknown): value is PromiseLike<T> {
		return (
			typeof value === 'object'
			&& value !== null
			&& typeof (value as PromiseLike<T>).then === 'function')
	}
}
