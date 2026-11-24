import { Link } from 'react-router-dom';
import SectionHeading from '../components/SectionHeading.jsx';

export default function NotFoundPage() {
  return <div className="content-page not-found-page"><span className="not-found-number">404</span><SectionHeading eyebrow="A WRONG TURN" title="This page isn’t here." description="The page may have moved, or the address may be mistyped." /><Link className="button button-gold" to="/">Back to home <span aria-hidden="true">↗</span></Link></div>;
}
