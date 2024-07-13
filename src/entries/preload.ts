/*
	Экспорт для `preload` процесса.
	Нельзя объединить с `renderer` из-за ошибки импорта electron.
*/

export { default as Bridge } from '../scripts/preload/bridge.js'
export { default as provideFromMain } from '../scripts/preload/provider.js'
export * from './index.js'

