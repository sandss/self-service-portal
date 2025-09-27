# Features Directory Structure

This directory contains feature-based modules following Domain-Driven Design principles.

## 📁 Structure

```
features/
├── jobs/                    # Job management feature
│   ├── components/          # Job-specific UI components
│   ├── hooks/              # Job-related custom hooks
│   ├── pages/              # Job pages (JobDetail, etc.)
│   ├── types/              # Job-related TypeScript types
│   ├── utils/              # Job-specific utilities
│   ├── constants/          # Job configuration and constants
│   └── index.ts            # Barrel export for clean imports
│
└── [future-features]/      # Other features (catalog, auth, etc.)
```

## 🎯 Benefits

### **Clean Imports**
```typescript
// ✅ Good - Feature-based import
import { JobDetailPage, useJobDetailV2, JobError } from 'features/jobs';

// ❌ Bad - Deep imports
import JobDetailPage from 'pages/JobDetail';
import { useJobDetailV2 } from 'hooks/useJobDetailV2';
import { JobError } from 'components/JobError';
```

### **Domain Boundaries**
- Each feature is self-contained
- Related code is colocated
- Easy to understand feature scope
- Supports micro-frontend architecture

### **Scalability**
- Easy to add new features
- Clear ownership boundaries
- Independent development
- Feature-based testing strategies

## 📋 Guidelines

### **What Goes Where**

| Type | Location | Purpose |
|------|----------|---------|
| **Components** | `features/{feature}/components/` | Feature-specific UI components |
| **Hooks** | `features/{feature}/hooks/` | Feature-specific React hooks |
| **Pages** | `features/{feature}/pages/` | Top-level page components |
| **Types** | `features/{feature}/types/` | Feature domain types |
| **Utils** | `features/{feature}/utils/` | Feature-specific utilities |
| **Constants** | `features/{feature}/constants/` | Feature configuration |

### **Shared vs Feature-Specific**

**Shared** (`shared/`):
- Generic UI components (Button, Modal, Skeleton)
- Common utilities (clipboard, formatting)
- Cross-cutting concerns

**Feature-Specific** (`features/{feature}/`):
- Domain-specific components
- Business logic hooks
- Feature-related types

## 🔧 Usage Examples

```typescript
// Import entire feature
import * from 'features/jobs';

// Import specific items
import { JobDetailPage, useJobDetailV2 } from 'features/jobs';

// Import from submodules (when needed)
import { JobHeader } from 'features/jobs/components';
import { getStateColor } from 'features/jobs/utils';
```

## 🚀 Migration Guide

When adding new job-related functionality:

1. **Components** → `features/jobs/components/`
2. **Hooks** → `features/jobs/hooks/`
3. **Types** → `features/jobs/types/`
4. **Utils** → `features/jobs/utils/`
5. **Update** → `features/jobs/index.ts` for exports

This structure supports future features like `features/catalog/`, `features/auth/`, etc.
