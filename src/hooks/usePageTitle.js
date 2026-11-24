import { useEffect } from 'react';

export default function usePageTitle(pageTitle) {
  useEffect(() => {
    document.title = `${pageTitle} - Salon Queue`;
  }, [pageTitle]);
}
