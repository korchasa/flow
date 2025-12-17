---
alwaysApply: true
---
## CODE STYLE RULES FOR FULLSTACK APPLICATIONS

- NO FALLBACKS/HACKS WITHOUT EXPLICIT REQUEST. "FAIL FAST, FAIL CLEARLY."
- USE TYPED CONSTANTS/ENUMS INSTEAD OF MAGIC NUMBERS/STRINGS
- FUNCTIONS ≤100 LINES; BREAK COMPLEX LOGIC INTO HELPERS
- TREAT LINTER/COMPILER WARNINGS AS ERRORS
- MAIN/EXPORTED FUNCTIONS FIRST, AUXILIARIES LAST
- PARAMETER STYLE: `{ REQUIRED, OPTIONAL = "DEFAULT" }`
- DOCUMENT ALL FILES AND FUNCTIONS WITH TSDOC
- TESTABILITY IS MORE IMPORTANT THAN PERFORMANCE AND ENCAPSULATION

### TypeScript
- Strict mode (`strict: true`)
- Interfaces > types for objects
- Union types over enums for simple cases
- Avoid `any`; use `unknown` for truly unknown types
- `readonly` for immutable data
- Use utility types (`Partial`, `Pick`, etc.)
- Don't use index files to import modules
- Use inline arguments objects instead of multiple parameters

### React
- Functional components + hooks
- Custom hooks for reusable logic
- `useCallback`/`useMemo` judiciously
- Small, focused components (single responsibility)
- Meaningful names; controlled components preferred
- TS for all props
- Pattern: hooks → helpers → component

### CSS (Chota CSS)
- CSS variables for theming
- BEM naming; utility classes preferred
- Modular, component-scoped styles
- Semantic > presentational class names
- Avoid deep nesting; Grid/Flexbox layouts

### API/Backend
- JSON-RPC endpoints;
- Input validation (client + server)
- Consistent error responses
- Auth/authz; env vars for config
- Error logging without sensitive data exposure

### Database
- Migrations for schema changes
- Proper indexing; transactions for consistency
- Avoid N+1 queries; prepared statements
- Data integrity constraints validation

### Testing
- Don't change prod code to pass tests
- Unit tests for pure functions
- Integration tests for interactions
- E2E for critical flows
- Given-When-Then test names
- Test errors/edge cases; mock dependencies
- Target 60% coverage

### File Organization
- Feature-based folders
- Separate concerns: components, hooks, utils, types, tests
- Shallow structure (≤3 levels)
- Consistent naming

### Documentation
- TSDoc for public APIs (params, returns, exceptions, examples)
- English comments only
- Intent/invariants when code unclear; no redundant comments
- Document complex logic/architecture
- Updated READMEs; inline comments for non-obvious code

### Performance
- Bundle optimization (tree shaking, code splitting)
- Lazy loading; virtualization for large lists
- Asset optimization; API response monitoring
- Appropriate caching strategies

### Security
- Input validation/sanitization
- HTTPS in production; proper CORS
- Secure secrets (env vars)
- Security headers (CSP, HSTS, etc.)
- Regular dependency updates
- No sensitive data in logs
