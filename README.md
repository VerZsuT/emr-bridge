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

## Installation

```text
npm i emr-bridge
```

## Usage

There are three ways to use

**IMPORTANT**: In any of the cases, you need to insert this code into preload

```js
// Preload process
import { provideFromMain } from 'emr-bridge/preload'

const contextIsolation = true

provideFromMain(contextIsolation)
```

### Static methods and properties

Use **publicStaticMethod**/**publicStaticProperty** decorators

```ts
// Main process
import { publicStaticMethod, publicStaticProperty, Access } from 'emr-bridge'

class User {
  private static name = 'Name'
  private static age = 20
  private static money = 1000
  
  @publicStaticProperty('userBalance')
  static get balance(): string {
    return `${this.money}$`
  }
  
  static set balance(newBalance: string) {
    this.money = Number(newBalance.split('$')[0])
  }
  
  @publicStaticProperty({
    name: 'userInfo',
    access: Access.get
  })
  static get info(): string {
    return `Name: '${this.name}'; Age: '${this.age}'; Money: '${this.money}';`
  }
  
  @publicStaticMethod()
  static setName(newName: string): void {
    this.name = newName
  }
  
  @publicStaticMethod('getUserAge')
  static getAge(): number {
    return this.age
  }
}
```

### Methods and properties

Use **providePublic** and **publicMethod**/**publicProperty** decorators.

Without calling **providePublic**, public methods will not be accessible from renderer.

```ts
// Main process
import { providePublic, publicMethod, publicProperty, Access } from 'emr-bridge'

class User {
  private name = 'Name'
  private age = 20
  private money = 1000
  
  @publicProperty()
  get balance(): string {
    return `${this.money}$`
  }
  
  set balance(newBalance: string) {
    this.money = Number(newBalance.split('$')[0])
  }
  
  @publicProperty({
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

const user = providePublic(new User())
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
import { Scope, Access, providePublic, publicStaticMethod, publicMethod, publicProperty } from 'emr-bridge'

class User {
  private static age = 20
  private name = 'Name'
  
  @publicProperty({
    scope: Scope.preload,
    access: Access.get
  })
  get count(): number {
    return 30
  }
  
  @publicStaticMethod({ scope: Scope.preload })
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

providePublic(new User())

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
import { publicStaticProperty, publicProperty, providePublic, Access } from 'emr-bridge'

class User {
  private static name = 'Name'
  private static surname = 'Surname'
  
  @publicStaticProperty({ access: Access.get })
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

providePublic(new User())

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

For _preload_, use **Main** from 'emr-bridge/preload'

```ts
// Preload process
import { Main, provideFromMain } from 'emr-bridge/preload'

provideFromMain()

type ProvidedPublic = {
  getUserName(): string
  setUserAge(newAge: number): void
  count: number
}

const main = Main.as<ProvidedPublic>()

main.getUserName()
main.count++
main.setUserAge(20)
```

For _renderer_, use **Bridge** from 'emr-bridge/renderer'

```ts
// Renderer process
import { Bridge } from 'emr-bridge/renderer'

type ProvidedPublic = {
  getUserName(): string
  setUserAge(newAge: number): void
  count: number
}

const bridge = Bridge.as<ProvidedPubic>()

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
