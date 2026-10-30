import { PageHeading } from '../components/layout/PageHeading';
import { methodology } from '../content/methodology';

export function AboutPage() {
  return (
    <>
      <PageHeading
        title="Clarity behind the numbers."
        description="Independent measurements. A transparent method. Your own perspective."
      />
      <div className="about-grid">
        {methodology.map(([number, title, body]) => (
          <section className="panel about-card" key={number}>
            <span className="eyebrow">{number} / THE METHOD</span>
            <h2>{title}</h2>
            <p>{body}</p>
          </section>
        ))}
      </div>
    </>
  );
}
