/*
	Экспорт для `renderer` процесса.
	Нельзя объединить с `preload` из-за ошибки импорта electron.
*/

export { default as Bridge } from '../scripts/renderer/bridge.js'
export * from './index.js'

