import { ArrowUpRight, Moon, Sun, Zap } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useTestActions } from '../../stores/testModel';
import { useTheme } from '../../hooks/useTheme';
import { AccountMenu } from './AccountMenu';

export function Header() {
  const historyCount = useTestActions((model) => model.historyCount);
  const { dark, toggleTheme } = useTheme();
  const navClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'nav-active' : undefined);

  return (
    <header className="header">
      <Link to="/" className="brand" aria-label="Flexspeed home">
        <span className="brand-icon">
          <Zap size={22} fill="currentColor" />
        </span>
        flexspeed<span className="brand-dot">.</span>
      </Link>
      <nav aria-label="Main navigation">
        <NavLink to="/" end className={navClass}>
          Speed test
        </NavLink>
        <NavLink to="/history" className={navClass}>
          History <span className="count">{historyCount}</span>
        </NavLink>
        <NavLink to="/about" className={navClass}>
          How it works <ArrowUpRight size={13} />
        </NavLink>
      </nav>
      <AccountMenu />
      <button
        className="icon-button theme-button"
        onClick={toggleTheme}
        aria-label={`Use ${dark ? 'light' : 'dark'} theme`}
      >
        {dark ? <Sun size={19} /> : <Moon size={19} />}
      </button>
    </header>
  );
}
