# Shared Directory

This directory contains reusable components, utilities, and resources that are used across multiple features.

## 📁 Structure

```
shared/
├── components/             # Reusable UI components
│   ├── Skeleton.tsx       # Loading skeletons
│   ├── CopyButton.tsx     # Copy-to-clipboard button
│   ├── JsonViewer.tsx     # Collapsible JSON display
│   └── index.ts           # Barrel export
│
├── utils/                 # Common utilities
│   ├── clipboardUtils.ts  # Clipboard operations
│   └── index.ts           # Barrel export
│
└── index.ts               # Main barrel export
```

## 🎯 Purpose

The shared directory contains:
- **Generic UI Components** that can be used in any feature
- **Common Utilities** for cross-cutting concerns
- **Shared Types** (if any) that span multiple domains

## 📋 Guidelines

### **What Belongs Here**

✅ **Should be in shared/**:
- Generic UI components (Button, Modal, Skeleton)
- Common utilities (formatting, validation, API helpers)
- Cross-cutting concerns (logging, analytics)
- Design system components

❌ **Should NOT be in shared/**:
- Feature-specific business logic
- Domain-specific components
- Feature-coupled utilities

### **Component Guidelines**

Components in shared should be:
- **Generic** - Not tied to specific business domains
- **Reusable** - Used by multiple features
- **Self-contained** - Minimal external dependencies
- **Well-documented** - Clear API and usage examples

## 🔧 Usage

```typescript
// Import shared components
import { Skeleton, CopyButton, JsonViewer } from 'shared';

// Import specific utilities
import { copyToClipboard } from 'shared/utils';

// Import from submodules (when needed)
import { SkeletonText } from 'shared/components';
```

## 🚀 Adding New Shared Items

When adding new shared components or utilities:

1. **Create** the component/utility in appropriate subfolder
2. **Export** it in the subfolder's `index.ts`
3. **Re-export** in the main `shared/index.ts`
4. **Document** usage and API if complex
5. **Consider** if it's truly generic vs feature-specific

## 📊 Examples

### **Good Shared Components**
```typescript
// ✅ Generic, reusable
<Skeleton width="100px" height="20px" />
<CopyButton text="copy this" />
<JsonViewer data={anyJsonData} />
```

### **Bad Shared Components**
```typescript
// ❌ Too specific to jobs domain
<JobStatusBadge status="running" />
<CatalogItemCard item={catalogItem} />
```
