import type { ReactNode } from 'react';

export function PageHeading({ title, description }: { title: ReactNode; description: string }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">
          <span className="status-dot" /> YOUR INTERNET, IN FOCUS
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  );
}
