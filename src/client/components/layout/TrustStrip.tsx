import { ShieldCheck } from 'lucide-react';

export function TrustStrip() {
  return (
    <div className="trust-strip">
      <span>
        <ShieldCheck size={17} /> No account needed to test or share.
      </span>
    </div>
  );
}
