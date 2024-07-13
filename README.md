# Electron main-renderer bridge (emr-bridge)

_Только для Electron._

_Полная поддержка TypeScript._

Уменьшает boilerplate при работе с **Electron IPC**:
- Функционал событий.
- Лёгкая передача экземпляров классов.
- Простое использование промисов.
- Быстрая публикация переменных и функций из `main` в `renderer` / `preload`.

## Содержание

- [Установка](#установка)
- [Использование](#использование)
  - [публикация](#публикация-функций-и-переменных)
  - [renderer и preload](#использование-в-renderer-и-preload)
  - [промисы](#промисы)
  - [события](#события)
  - [передача экземпляров классов](#передача-экземпляров-классов)

## Установка

```cmd
npm i emr-bridge@latest
```

Для работы библиотеки требуется вставить следующий код в preload процесс.

```js
import { provideFromMain } from 'emr-bridge/preload'

provideFromMain(true /* context isolation */)
```

## Использование

*Если требуется CommonJS, то используем `emr-bridge/cjs`*.

### Публикация функций и переменных

Для публикации функций и переменных из `main` процесса библиотека предоставляет
функции `publishFunction` и `publishVariable` из **emr-bridge/main**.

```js
// Main process
import { publishFunction, publishVariable } from 'emr-bridge/main'

publishFunction('sayHello', name => {
  return `Hello, ${name}!`
})

publishFunction('getUser', () => {
  return {
    name: 'Name',
    age: 20
  }
})

let count = 0

publishVariable('count', {
  get: () => count,
  set: value => count = value
})
```

### Использование в renderer и preload

Пример использования ранее опубликованных функций и переменных.

```js
// Renderer process
import { Bridge } from 'emr-bridge/renderer'

// `as` в TypeScript позволяет кастовать в нужный тип.
const bridge = Bridge.as()

// Выведет текущее значение count из main (0).
console.log(bridge.count)

// Увеличит значение count в main на единицу.
bridge.count++

// { name: 'Name', age: 20 }.
bridge.getUser()

// 'Hello, Aleksandr!'.
bridge.seyHello('Aleksandr')
```

Для `preload` процесса всё идентично, но требуется импортировать из **emr-bridge/preload**.

### Промисы

Поддержка промисов реализована "из коробки".

```js
// Main process
import { publishFunction } from 'emr-bridge/main'

publishFunction('after1s', () => {
  return new Promise(resolve => {
    setTimeout(() => resolve('after1s'), 1000)
  })
})
```

```js
// Renderer process
import { Bridge } from 'emr-bridge/renderer'

const bridge = Bridge.as()

async function foo() {
  const result = await bridge.after1s()

  // Через 1 секунду выведет сообщение 'after1s', полученное из main.
  console.log(result)
}
```

### События

Пример обработки события, которое вызывается из `renderer` или `preload`.

```js
// Main process
import { on, once } from 'emr-bridge/main'

on('message-from-renderer', message => console.log(message))
// once('message-from-renderer', message => console.log(message))
```

```js
// Renderer process
import { Bridge } from 'emr-bridge/renderer'

const bridge = Bridge.as()

// Вызовет событие и выведет в консоль main процесса 'Hello from renderer'
bridge.emit('message-from-renderer', 'Hello from renderer')
```

Пример обработки события, которое вызывается из `main`.

```js
// Main process
import { emitEvent } from 'emr-bridge/main'

// Вызовет событие и выведет в консоль renderer процесса 'Hello from main'
emitEvent('message-from-main', 'Hello from main')
```

```js
// Renderer process
import { Bridge } from 'emr-bridge/renderer'

const bridge = Bridge.as()

bridge.on('message-from-main', message => console.log(message))
```

### Передача экземпляров классов

По умолчанию, передача экземпляров пользовательских классов через IPC невозможна.

Библиотека решает эту проблему путём реализации паттерна 'Снимок'.

Передаваемый класс должен реализовать функции `getSnapshot` и `updateFromSnapshot`, а также иметь конструктор без параметров.

```js
// Human.js
export default class Human {
  name = undefined
  age = undefined

  constructor(
    name = 'Aleksandr',
    age = 30
  ) {
    this.name = name
    this.age = age
  }

  getSnapshot() {
    return {
      name: this.name,
      age: this.age
    }
  }

  updateFromSnapshot(snapshot) {
    this.name = snapshot.name
    this.age = snapshot.age
  }
}
```

Для передачи экземпляра класса требуется на **принимающей** стороне передать сам класс в качестве аргумента функции:

```js
// Main process
import { publishFunction } from 'emr-bridge/main'
import Human from './Human'

// Выводим имя человека, переданного из `preload` или `renderer`.
publishFunction(
  'displayName',
  human => console.log(human.name),
  /* Говорим какие классы надо принять.
     Порядок в массиве соответствует порядку таких аргументов в функции.
     Для (human, car, engine) будет [Human, Car, Engine].
     Для (human, surname, car) будет [Human, Car], так как 'surname' имеет стандартный тип String.
     Стандартные типы (String, Number..) указывать не требуется. */
  [Human]
)

/* У событий также есть такой аргумент
  on('displayName', human => console.log(human.name), [Human])
  once('displayName', human => console.log(human.name), [Human])
*/
```

```js
// Renderer process
import { Bridge } from 'emr-bridge/renderer'
import Human from './Human'

const bridge = Bridge.as()

// Передаст данные через создание снимка.
bridge.displayName(new Human('Dima', 25))
```

Для получения экземпляра класса из `main` в `renderer` или `preload` нужно использовать `bridge.call`.

_Такое требование связано со сложностью реализации._

```js
// Main process
import { publishFunction } from 'emr-bridge/main'
import Human from './Human'

// Передаём человека в `preload` или `renderer` процесс.
publishFunction('getHuman', () => new Human('Artem', 40))
```

```js
// Renderer process
import { Bridge } from 'emr-bridge/renderer'
import Human from './Human'

const bridge = Bridge.as()

// Выведет в консоль 25
console.log(
  bridge.call(bridge.getHuman, Human).name
)

/* Альтернативный вариант
// Оборачиваем оригинал новой функцией, которая автоматически преобразует ответ в нужный класс.
bridge.getHuman = bridge.returns(bridge.getHuman, Human)

console.log(bridge.getHuman().name)
*/
```
