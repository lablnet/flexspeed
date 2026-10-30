import { Link } from 'react-router-dom';
import { PageHeading } from '../components/layout/PageHeading';

export function NotFoundPage() {
  return (
    <>
      <PageHeading
        title="This route is a little quiet."
        description="The page you’re looking for could not be found."
      />
      <section className="panel history-empty">
        <Link to="/" className="start-button">
          Back to speed test
        </Link>
      </section>
    </>
  );
}
