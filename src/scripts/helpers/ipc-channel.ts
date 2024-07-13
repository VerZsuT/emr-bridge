/**
 * Хелпер для работы с каналом IPC.
 */
export default class IpcChannel {
	/**
	 * Информация о публичных сущностях.
	 */
	public static readonly publicInfo = {
		/**
		 * Получить канал получения информации.
		 * @returns Канал получения информации
		 */
		get: () => 'GET_PUBLIC_INFO'
	}

	/**
	 * Публичная функция.
	 */
	public static readonly func = {
		/**
		 * Получить канал вызова функции.
		 * @param name - Имя функции.
		 * @returns Канал вызова функции.
		 */
		call: (name: string) => `FUNCTION_CALL_${name}`
	}

	/**
	 * Публичное событие.
	 */
	public static readonly event = {
		/**
		 * Получить канал отслеживания события.
		 * @returns Канал отслеживания события.
		 */
		on: () => 'EVENT_ON',

		/**
		 * Получить канал однократного отслеживания события.
		 * @returns Канал однократного отслеживания события.
		 */
		once: () => 'EVENT_ONCE',

		/**
		 * Получить канал вызова события.
		 * @param name - Название события.
		 * @returns Канал вызова события.
		 */
		emit: (name: string) => `EVENT_EMIT_${name}`
	}

	/**
	 * Публичное свойство.
	 */
	public static readonly prop = {
		/**
		 * Получить канал получения значения свойства.
		 * @param name - Имя свойства.
		 * @returns Канал получения значения свойства.
		 */
		get: (name: string) => `PROPERTY_GET_${name}`,

		/**
		 * Получить канал установки значения свойства.
		 * @param name - Имя свойства.
		 * @returns Канал получения установки значения свойства.
		 */
		set: (name: string) => `PROPERTY_SET_${name}`
	}

	/**
	 * Обещание.
	 */
	public static readonly promise = {
		/**
		 * Получить канал обработки обещания.
		 * @param channel - Канал, который возвращает обещание.
		 * @returns Канал обработки обещания.
		 */
		get: (channel: string) => `${channel}_PROMISE`
	}
}
