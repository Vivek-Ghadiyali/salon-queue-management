export default function PreviewLabel({ children = 'Sample preview' }) {
  return <span className="preview-label"><span aria-hidden="true" />{children}</span>;
}
