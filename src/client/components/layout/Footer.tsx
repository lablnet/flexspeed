import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer>
      <span className="footer-brand">
        <Zap size={15} fill="currentColor" /> flexspeed<span className="brand-dot">.</span>
      </span>
      <div className="footer-credits">
        <Link to="/privacy">Data & privacy</Link>
        <span aria-hidden="true">·</span>
        <span>Hosted on Cloudflare</span>
        <span aria-hidden="true">·</span>
        <span>
          Built by <a href="https://lablnet.com">Muhammad Umer Farooq</a>
        </span>
      </div>
    </footer>
  );
}
