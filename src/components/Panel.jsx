import { classNames } from '../utils/classNames.js';

export default function Panel({ children, className = '' }) {
  return <section className={classNames('panel', className)}>{children}</section>;
}
