# kalpavriksha-book-library

An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

## IPC Controller Architecture

This project uses a type-safe, minimal-boilerplate approach for exposing main process controllers to the renderer process.

### Adding Methods to Existing Controllers

To add a new method to an existing controller (e.g., `booksController`):

1. **Add the method to the controller object** in `src/main/controllers/books.ts`:

```typescript
export const booksController = {
  getAll: async () => {
    /* existing method */
  },
  getById: async (isbn: string) => {
    /* existing method */
  },

  // Add your new method here
  deleteBook: async (isbn: string) => {
    return await prisma.book.delete({
      where: { isbn }
    })
  }
}
```

2. **Expose the method in the preload script** in `src/preload/index.ts`:

```typescript
const api = {
  books: {
    getAll: () => ipcRenderer.invoke('books:getAll'),
    getById: (isbn: string) => ipcRenderer.invoke('books:getById', isbn),
    // Add the corresponding IPC invoke call
    deleteBook: (isbn: string) => ipcRenderer.invoke('books:deleteBook', isbn)
  }
}
```

3. **Use it in the renderer process** with full type safety:

```typescript
await window.api.books.deleteBook('123-456')
```

That's it! The IPC handler is automatically registered via the `registerController` helper in `src/main/index.ts`.

### Adding a New Controller

To create a completely new controller (e.g., for users):

1. **Create the controller file** at `src/main/controllers/users.ts`:

```typescript
import { prisma } from '../lib/prisma'

export const usersController = {
  getAll: async () => {
    return await prisma.user.findMany()
  },

  getById: async (id: number) => {
    return await prisma.user.findUnique({
      where: { id }
    })
  }
}

export type UsersController = typeof usersController
```

2. **Register the controller** in `src/main/index.ts`:

```typescript
import { booksController } from './controllers/books'
import { usersController } from './controllers/users' // Import

app.whenReady().then(() => {
  // ... existing code ...

  registerController('books', booksController)
  registerController('users', usersController) // Register

  // ... rest of code ...
})
```

3. **Expose it in the preload script** in `src/preload/index.ts`:

```typescript
const api = {
  books: {
    // ... existing books methods ...
  },
  users: {
    getAll: () => ipcRenderer.invoke('users:getAll'),
    getById: (id: number) => ipcRenderer.invoke('users:getById', id)
  }
}
```

4. **Add type definitions** in `src/preload/index.d.ts`:

```typescript
import type { BooksController } from '../main/controllers/books'
import type { UsersController } from '../main/controllers/users' // Import type

interface API {
  books: ControllerAPI<BooksController>
  users: ControllerAPI<UsersController> // Add type
}
```

5. **Use it in the renderer** with full type safety:

```typescript
const users = await window.api.users.getAll()
```

### Type Safety Benefits

- TypeScript will enforce correct parameter types and return types
- Autocomplete works for all exposed methods
- Compile-time errors if controller signatures don't match the preload definitions
- No runtime overhead from the type system
