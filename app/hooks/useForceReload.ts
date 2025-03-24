// file: ./app/hooks/useForceReload.ts
// feature: WebApp Core
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export const useForceReload = () => {
  const router = useRouter();

  const forceReload = useCallback(() => {
    router.refresh();
    window.location.reload();
  }, [router]);

  return forceReload;
};