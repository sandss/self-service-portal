# 📁 Frontend File Structure

Post-refactoring directory organization following Domain-Driven Design principles.

```
web/src/
├── App.tsx                    # Main application component
├── main.tsx                   # Application entry point  
├── api.ts                     # API configuration
├── index.css                  # Global styles
├── vite-env.d.ts             # Vite type definitions
│
├── features/                  # 🎯 Feature-based modules
│   ├── jobs/                  # Job management feature
│   │   ├── components/        # Job-specific components
│   │   │   ├── JobHeader.tsx
│   │   │   ├── JobSummaryCard.tsx
│   │   │   ├── JobProgressSection.tsx
│   │   │   ├── JobTimeline.tsx
│   │   │   ├── JobDataSection.tsx
│   │   │   ├── JobLoading.tsx
│   │   │   ├── JobError.tsx
│   │   │   ├── JobDetailSkeleton.tsx
│   │   │   ├── JobsDashboard.tsx
│   │   │   ├── JobTable.tsx
│   │   │   └── index.ts       # Barrel exports
│   │   ├── hooks/             # Job-related hooks
│   │   │   ├── useJobDetailV2.ts
│   │   │   ├── jobReducer.ts
│   │   │   └── index.ts
│   │   ├── pages/             # Job pages
│   │   │   ├── JobDetail.tsx
│   │   │   └── index.ts
│   │   ├── types/             # Job domain types
│   │   │   ├── job.ts
│   │   │   └── index.ts
│   │   ├── utils/             # Job-specific utilities
│   │   │   ├── jobUtils.ts
│   │   │   ├── errorUtils.ts
│   │   │   └── index.ts
│   │   ├── constants/         # Job configuration
│   │   │   ├── jobConstants.ts
│   │   │   └── index.ts
│   │   └── index.ts           # Main feature export
│   │
│   └── README.md              # Feature architecture guide
│
├── shared/                    # 🔧 Reusable components & utilities
│   ├── components/            # Generic UI components
│   │   ├── Skeleton.tsx       # Loading skeletons
│   │   ├── CopyButton.tsx     # Copy-to-clipboard
│   │   ├── JsonViewer.tsx     # JSON display component
│   │   └── index.ts
│   ├── utils/                 # Common utilities
│   │   ├── clipboardUtils.ts  # Clipboard operations
│   │   └── index.ts
│   ├── index.ts               # Main shared export
│   └── README.md              # Shared components guide
│
├── components/                # 🏛️ Legacy/Layout components
│   ├── Catalog/               # Catalog-specific (to be moved)
│   ├── Layout/                # Layout components
│   ├── Navigation/            # Navigation components
│   ├── User/                  # User-related components
│   ├── icons/                 # Icon components
│   ├── JobFilters.tsx         # (to be moved to jobs/)
│   └── ConfirmationDialog.tsx # (to be moved to shared/)
│
├── hooks/                     # 🎣 Legacy/Global hooks
│   ├── useButtonLabeling.ts
│   ├── useCatalogForm.ts
│   ├── useCatalogItems.ts
│   ├── useCatalogNavigation.ts
│   ├── useDeleteOperations.ts
│   ├── useErrorManagement.ts
│   ├── useItemSelection.ts
│   ├── useLayout.ts
│   ├── useLoadingState.ts
│   ├── useModalState.ts
│   ├── useResponsiveLayout.ts
│   └── useUser.ts
│
├── pages/                     # 📄 Legacy/Top-level pages
│   └── Catalog.tsx            # (to be moved to features/)
│
├── types/                     # 📝 Legacy/Global types
│   ├── catalog.ts             # (to be moved to features/)
│   ├── errors.ts              # (could move to shared/)
│   └── types.ts               # Global types
│
├── utils/                     # 🛠️ Legacy utilities (mostly empty now)
│
├── constants/                 # ⚙️ Legacy constants
│   └── catalog.ts             # (to be moved to features/)
│
├── config/                    # 🔧 Configuration
├── context/                   # 🔄 React contexts
├── services/                  # 🌐 API services
└── styles/                    # 🎨 Styling files
```

## 🎯 Migration Status

### ✅ **Completed**
- **Jobs Feature**: Fully migrated to `features/jobs/`
- **Shared Components**: Generic components in `shared/`
- **Barrel Exports**: Clean import paths established
- **Documentation**: Architecture guides created

### 🚧 **In Progress**
- **Route Updates**: Routes pointing to new structure
- **Import Cleanup**: Updating remaining import paths

### 📅 **Future Migrations**
- **Catalog Feature**: Move to `features/catalog/`
- **Auth Feature**: If authentication is added
- **Shared Utilities**: Move common hooks to `shared/`
- **Legacy Cleanup**: Remove old directories when empty

## 🚀 Benefits Achieved

### **🔍 Better Organization**
- Domain-based structure instead of technical layers
- Related code is colocated
- Clear feature boundaries

### **📦 Cleaner Imports**
```typescript
// Before
import JobHeader from '../components/JobHeader';
import { useJobDetailV2 } from '../hooks/useJobDetailV2';
import { getStateColor } from '../utils/jobUtils';

// After  
import { JobHeader, useJobDetailV2, getStateColor } from 'features/jobs';
```

### **🎯 Scalability**
- Easy to add new features
- Independent development of features
- Clear ownership boundaries
- Supports micro-frontend patterns

### **🧪 Better Testing**
- Feature-level testing strategies
- Isolated test suites per feature
- Easier to mock dependencies

## 🛠️ Usage Guidelines

### **Adding New Job Functionality**
1. Add to appropriate `features/jobs/` subfolder
2. Export in subfolder's `index.ts`
3. Re-export in `features/jobs/index.ts`

### **Adding Generic Components**
1. Add to `shared/components/`
2. Ensure it's truly generic (not domain-specific)
3. Export in `shared/index.ts`

### **Imports Best Practices**
```typescript
// ✅ Preferred - Feature-level imports
import { JobDetailPage, useJobDetailV2 } from 'features/jobs';
import { CopyButton, JsonViewer } from 'shared';

// ✅ Acceptable - When you need many items from one category
import { JobHeader, JobSummaryCard } from 'features/jobs/components';

// ❌ Avoid - Deep imports
import JobHeader from 'features/jobs/components/JobHeader';
```

This structure positions the codebase for future growth and maintainability!
