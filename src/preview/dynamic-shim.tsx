/** next/dynamic stand-in for the static preview build (esbuild aliases next/dynamic here). */
import { lazy, Suspense, type ComponentType } from "react";

export default function dynamic<P extends object>(load: () => Promise<{ default: ComponentType<P> }>) {
  const L = lazy(load);
  return function Dynamic(props: P) {
    return (
      <Suspense fallback={null}>
        <L {...props} />
      </Suspense>
    );
  };
}
