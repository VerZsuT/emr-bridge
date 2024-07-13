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
	 * @param value - Значение из IPC.
	 */
	public static isSnapshotValue(value: unknown): value is ISnapshotValue {
		return (
			!!value
			&& typeof value === 'object'
			&& '__type__' in value
			&& '__snapshot__' in value
			&& value.__type__ === 'snapshot'
			&& !!value.__snapshot__)
	}

	/**
	 * Может ли значение вернуть снимок.
	 * @param value - Значение.
	 */
	public static isHasSnapshot(value: unknown): value is IHasSnapshot {
		return (
			!!value
			&& typeof value === 'object'
			&& 'takeSnapshot' in value
			&& 'fromSnapshot' in value)
	}
}
