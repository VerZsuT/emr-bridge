# Electron main-renderer bridge (emr-bridge)

_Only for Electron_  
JS library for easily providing access to the **main** from the **renderer** process

## Table of contents

- [Installation](#installation)
- [Usage](#usage)
  - [static](#static-methods-and-properties)
  - [non-static](#methods-and-properties)
  - [functions and variables](#functions-and-variables)
  - [scopes](#scopes)
  - [access](#restricting-access-to-variables)
  - [usage in renderer](#access-from-renderer-and-preload)
  - [promises](#promises)
  - [events](#events-system)

## Installation

```text
npm i emr-bridge
```

## Usage

*If you need CommonJS modules, then use `emr-bridge/cjs`*

There are three ways to use

> In any of the cases, you need to insert this code into preload

```js
// Preload process
import { provideFromMain } from 'emr-bridge'

provideFromMain(true /* context isolation */)
```

> To use experimental non-static decorators, it is required to wrap the creation of a class instance in the `providePublic` function

```js
// Main process
import { providePublic } from 'emr-bridge/exp'

class MainPublic { /*...*/ }

const instance = providePublic(new MainPublic())
```

> All experimental decorators can be found in `emr-bridge/exp`

### Static methods and properties

Use **publicMethod**/**publicProperty**/**publicGetter**/**publicSetter**.

```ts
// Main process
import { publicMethod, publicProperty, publicGetter, publicSetter, Access } from 'emr-bridge'

class User {
  private static name = 'Name'
  private static age = 20
  private static money = 1000
  
  @publicGetter('userBalance')
  static get balance(): string {
    return `${this.money}$`
  }
  
  @publicSetter('userBalance')
  static set balance(newBalance: string) {
    this.money = Number(newBalance.split('$')[0])
  }
  
  @publicGetter({
    name: 'userInfo',
    access: Access.get
  })
  static get info(): string {
    return `Name: '${this.name}'; Age: '${this.age}'; Money: '${this.money}';`
  }

  @publicProperty()
  static id = 'ID_AJWD3KLW23DK231K'
  
  @publicMethod()
  static setName(newName: string): void {
    this.name = newName
  }
  
  @publicMethod('getUserAge')
  static getAge(): number {
    return this.age
  }
}
```

### Methods and properties

Use **publicMethod**/**publicProperty**/**publicGetter**/**publicSetter**.

```ts
// Main process
import { publicMethod, publicProperty, publicGetter, publicSetter, Access } from 'emr-bridge'

class User {
  private name = 'Name'
  private age = 20
  private money = 1000

  @publicProperty()
  id = 'ID_AJWD3KLW23DK231K'
  
  @publicGetter()
  get balance(): string {
    return `${this.money}$`
  }
  
  @publicSetter()
  set balance(newBalance: string) {
    this.money = Number(newBalance.split('$')[0])
  }
  
  @publicGetter({
    name: 'userInfo',
    access: Access.get
  })
  get info(): string {
    return `Name: '${this.name}'; Age: '${this.age}'; Money: '${this.money}';`
  }
  
  @publicMethod()
  setName(newName: string): void {
    this.name = newName
  }
  
  @publicMethod('getUserAge')
  getAge(): number {
    return this.age
  }
}

const user = new User()
```

### Functions and variables

Use **publicFunction** and **publicVariable**.

```ts
// Main process
import { publicFunction, publicVariable } from 'emr-bridge'

publicFunction('sayHello', sayHello)
publicFunction('getUserName', getName)
publicVariable('count', {
  get(): number {
    return count
  },
  set(value: number) {
    count = value
  }
})

let count = 0

const user = {
  name: 'Name',
  age: 20
}

function sayHello(name: string): string {
  return `Hello, ${name}!`
}

function getName(): string {
  return user.name
}
```

### Scopes

In order to set a specific scope, use the **scope** property.

Accessing an entity outside the specified scope will result in an error being thrown.

```ts
// Main process

// static and non-static
import { Scope, Access, publicMethod, publicGetter } from 'emr-bridge'

class User {
  private static age = 20
  private name = 'Name'
  
  @publicGetter({
    scope: Scope.preload,
    access: Access.get
  })
  get count(): number {
    return 30
  }
  
  @publicMethod({ scope: Scope.preload })
  static getAge(): number {
    return this.age
  }
  
  @publicMethod({
    name: 'getUserName',
    scope: Scope.renderer
  })
  getName(): string {
    return this.name
  }
}

new User()
```

```ts
// Main process
// functions and variables
import { publicFunction, publicVariable, Scope } from 'emr-bridge'

publicFunction('getName', getName, [Scope.preload])
publicVariable('count', {
  get(): number {
    return count
  },
  set(value: number) {
    count = value
  }
}, [Scope.renderer])

let count = 0

function getName(): string {
  return 'Name'
}
```

By default, the entity is available in any scope.  
Using an entity outside the specified scope _will cause an error_.

### Restricting access to variables

```ts
// Main process
// static and non-static
import { publicGetter, Access } from 'emr-bridge'

class User {
  private static name = 'Name'
  private static surname = 'Surname'
  
  @publicGetter({ access: Access.get })
  static get fullName(): string {
    return `${this.name} ${this.surname}`
  }
  
  @publicProperty({
    name: 'userAge',
    access: Access.get
  })
  get age(): number {
    return 20
  }
}

new User()
```

```ts
// Main process
// for variables
import { publicVariable } from 'emr-bridge'

publicVariable('count', {
  // get access
  get(): number {
    return count
  },
  // set access
  set(value: number) {
    count = value
  }
})

let count = 0
```

### Access from renderer and preload

For _preload_, use **Main**

```ts
// Preload process
import { Main, provideFromMain } from 'emr-bridge/preload'

provideFromMain()

interface IProvidedPublic {
  getUserName(): string
  setUserAge(newAge: number): void
  count: number
}

const main = Main.as<IProvidedPublic>()

main.getUserName()
main.count++
main.setUserAge(20)
```

For _renderer_, use **Bridge**

```ts
// Renderer process
import { Bridge } from 'emr-bridge/renderer'

interface IProvidedPublic {
  getUserName(): string
  setUserAge(newAge: number): void
  count: number
}

const bridge = Bridge.as<IProvidedPubic>()

bridge.getUserName()
bridge.count--
bridge.setUserAge(30)
```

### Promises

The library also allows you to pass Promises from main to renderer

```ts
// Main process
import { publicFunction } from 'emr-bridge'

publicFunction('delay1s', () => {
  return new Promise<void>(resolve => {
    setTimeout(resolve, 1000)
  })
})
```

```ts
// Renderer process
import { Bridge } from 'emr-bridge/renderer'

interface IPublic {
  delay1s(): Promise<void>
}

const bridge = Bridge.as<IPublic>()

bridge.delay1s().then(() => console.log('After 1 second'))
```

### Events system

If the event source is the **main** process

```ts
// Main process
import { publicMainEvent, publicClassMainEvent } from 'emr-bridge'

const tickWithReceiver = publicMainEvent('tickWithReceiver', () => (new Date().toTimeString()))
setInterval(tickWithReceiver, 1000)

// Or
const tick = publicMainEvent('tick')
setInterval(() => tick(new Date().toTimeString()), 1000)

// The passed function receives the argument passed to the event and returns the value passed to the renderer process
const pay = publicMainEvent('pay', (count: number) => `${count} $`)
pay(200) // Send the string '200 $' to the renderer process


// Or with classes
class MainPublicEvents {
  @publicClassMainEvent()
  tick() {}

  @publicClassMainEvent()
  tickWithReceiver() { return new Date().toTimeString() }

  @publicClassMainEvent()
  pay(count: number) { return `${count} $` }
}
const events = new MainPublicEvents()
setInterval(events.tickWithReceiver, 1000)
setInterval(() => events.tick(new Date().toTimeString()), 1000)
events.pay(200)
```

```ts
// Renderer process
import { Bridge, MainEvent } from 'emr-bridge/renderer'

interface IPublic {
  onTick: MainEvent<string>
  onTickWithReceiver: MainEvent<string>
  onPay: MainEvent<string>
}

const bridge = Bridge.as<IPublic>()
// on + Capitalize<EventName>
bridge.onTick(time => `Time from tick: ${console.log(time)}`)
bridge.onTickWithReceiver(time => `Time from receiver: ${console.log(time)}`)
bridge.onPay(count => `Dollars: ${count}`)
```

If the event source is the **renderer** process

```ts
// Main process
import { publicRendererEvent, publicClassRendererEvent, RendererEvent } from 'emr-bridge'

const onMessage = publicRendererEvent<string>('onMessage'/* or 'message' */)
onMessage(message => console.log(message))

// With receiver
const onMessageWithReceiver = publicRendererEvent('onMessageWithReceiver', (message: string) => `Message: ${message}`)
onMessageWithReceiver(message => console.log(message))


// Classes
class RendererPublicEvents {
  @publicClassRendererEvent()
  onMessage!: RendererEvent<string>

  @publicClassRendererEvent((message: string) => `Message: ${message}`)
  onMessageWithReceiver!: RendererEvent<string>
}
const events = new RendererPublicEvents()
events.onMessage(message => console.log(message))
events.onMessageWithReceiver(message => console.log(message))
```

```ts
// Renderer process
import { Bridge } from 'emr-bridge/renderer'

interface IPublic {
  message(message: string): void
  messageWithReceiver(message: string): void
}

const bridge = Bridge.as<IPublic>()
// Uncapitalize<EventNameWithoutON>
bridge.message('Message from renderer')
bridge.messageWithReceiver('Hello, main process')
```

**NOTE**: The transmitted value can be `Promise`. In this case, the receiving party will wait for it to resolve and only then will call the handler
