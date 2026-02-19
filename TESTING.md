# Testing Documentation

This project uses [Vitest](https://vitest.dev/) for unit testing with comprehensive test coverage across all major components.

## Test Structure

The test suite covers the following areas:

### Main Process Tests (`src/main/`)

- **Controllers**
  - `books.test.ts` - Tests for books controller (CRUD operations, bulk operations, stock management)
  - `tags.test.ts` - Tests for tags controller (tag management, book-tag relationships)

- **Library Functions**
  - `bookApi.test.ts` - Tests for external book API integrations (Google Books, Open Library, Indian ISBN API)

### Renderer Process Tests (`src/renderer/src/`)

- **Hooks**
  - `use-barcode-scanner.test.ts` - Tests for barcode scanner hook functionality
  - `use-debounced-callback.test.ts` - Tests for debounced callback hooks (both per-key and simple variants)

- **Utilities**
  - `utils.test.ts` - Tests for utility functions (className merging with Tailwind support)

## Running Tests

### Run all tests

```bash
npm test
```

### Run tests in watch mode (for development)

```bash
npm test
```

### Run tests once (for CI/CD)

```bash
npm run test:run
```

### Run tests with UI

```bash
npm run test:ui
```

### Generate coverage report

```bash
npm run test:coverage
```

## Test Statistics

- **Total Test Files**: 6
- **Total Tests**: 98
- **Coverage Areas**:
  - Controllers (books, tags)
  - API integrations (Google Books, Open Library, Indian ISBN)
  - Custom React hooks
  - Utility functions

## Test Coverage

### Books Controller (19 tests)

- ✅ Fetching all books with pagination and filters
- ✅ Fetching book by ISBN
- ✅ Creating books with and without tags
- ✅ Updating stock (set, increment, decrement)
- ✅ Deleting single and multiple books
- ✅ Bulk tag operations (update, add, remove)

### Tags Controller (14 tests)

- ✅ Fetching all tags
- ✅ Fetching tag by ID
- ✅ Creating single and multiple tags
- ✅ Handling duplicate tags
- ✅ Deleting tags
- ✅ Adding/removing tags from books

### Book API (17 tests)

- ✅ Google Books API integration
- ✅ Open Library API integration
- ✅ Indian ISBN API integration
- ✅ Error handling for all APIs
- ✅ Handling missing data fields
- ✅ Handling API failures

### Barcode Scanner Hook (12 tests)

- ✅ Scanning barcodes (character accumulation + Enter)
- ✅ Multiple scans with buffer reset
- ✅ Enable/disable functionality
- ✅ Input element filtering
- ✅ Special key handling
- ✅ Event listener cleanup

### Debounced Callback Hooks (16 tests)

- ✅ Per-key debouncing (useDebouncedCallback)
- ✅ Simple debouncing (useSimpleDebouncedCallback)
- ✅ Custom delay support
- ✅ Multiple argument handling
- ✅ Timer cleanup on unmount
- ✅ Callback reference updates

### Utils (20 tests)

- ✅ Class name merging
- ✅ Conditional classes
- ✅ Tailwind class conflict resolution
- ✅ Responsive and dark mode classes
- ✅ Component pattern support

## Writing New Tests

### Test File Naming Convention

- Place test files next to the code they test
- Name them with `.test.ts` or `.test.tsx` extension
- Example: `books.ts` → `books.test.ts`

### Test Structure Example

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { yourFunction } from './yourModule'

describe('YourModule', () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks()
  })

  describe('functionName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test'

      // Act
      const result = yourFunction(input)

      // Assert
      expect(result).toBe('expected')
    })
  })
})
```

### Mocking Guidelines

**Mocking Prisma:**

```typescript
vi.mock('../lib/prisma', () => ({
  prisma: {
    model: {
      methodName: vi.fn()
    }
  }
}))

// Get the mocked instance
const { prisma: mockPrisma } = await import('../lib/prisma')
```

**Mocking Fetch API:**

```typescript
global.fetch = vi.fn()

// In test
;(global.fetch as any).mockResolvedValueOnce({
  json: async () => ({ data: 'test' })
})
```

**Mocking React Hooks:**

```typescript
import { renderHook, act } from '@testing-library/react'

const { result } = renderHook(() => useYourHook())

act(() => {
  result.current.yourFunction()
})

expect(result.current.yourState).toBe('expected')
```

## Configuration

### Vitest Config (`vitest.config.ts`)

- Environment: jsdom (for React components)
- Coverage: v8 provider
- Setup file: `vitest.setup.ts`

### Test Setup (`vitest.setup.ts`)

- Automatic cleanup after each test
- Electron module mocks
- Testing Library matchers

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Clear Descriptions**: Use descriptive test names that explain what is being tested
3. **AAA Pattern**: Arrange, Act, Assert structure for clarity
4. **Mock External Dependencies**: Mock database, APIs, and file system operations
5. **Test Edge Cases**: Include tests for error conditions, empty inputs, and boundary values
6. **Avoid Test Implementation Details**: Test behavior, not implementation

## Continuous Integration

Tests are recommended to run on:

- Pre-commit hooks (via husky)
- Pull request checks
- Before deployment

Add to your CI/CD pipeline:

```yaml
- name: Run tests
  run: npm run test:run

- name: Generate coverage
  run: npm run test:coverage
```

## Troubleshooting

### Tests not found

- Ensure test files have `.test.ts` or `.test.tsx` extension
- Check that test files are not in `exclude` directories

### Mock not working

- Ensure `vi.mock()` is called before importing the module
- Use `vi.clearAllMocks()` in `beforeEach()` to reset mocks

### Timeout errors

- Increase timeout for slow operations: `{ timeout: 10000 }`
- Check for unresolved promises or missing awaits

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/)
- [Vitest UI](https://vitest.dev/guide/ui.html)
- [Coverage Reports](https://vitest.dev/guide/coverage.html)
