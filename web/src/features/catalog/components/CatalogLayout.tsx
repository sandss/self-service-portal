import { ReactNode } from 'react';
import { LAYOUT_CLASSES } from '../../../constants/catalog';

interface CatalogLayoutProps {
  children: ReactNode;
}

export function CatalogLayout({ children }: CatalogLayoutProps) {
  return (
    <div className={LAYOUT_CLASSES.container}>
      <div className={LAYOUT_CLASSES.wrapper}>
        {children}
      </div>
    </div>
  );
}
