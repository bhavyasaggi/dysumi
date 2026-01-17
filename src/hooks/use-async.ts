import { useEffect, useRef, useState } from "react";

export function useAsync<T>(
  fn: (...args: unknown[]) => Promise<T>,
  ...args: unknown[]
) {
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [data, setData] = useState<T | undefined>(undefined);

  const fnRef = useRef<typeof fn | undefined>(undefined);
  useEffect(() => {
    if (fn && fnRef.current !== fn) {
      setLoading(true);
      fn(...args).then((data) => {
        if (fnRef.current === fn) {
          setError(undefined);
          setData(data);
          setLoading(false);
        }
      }).catch((error) => {
        if (fnRef.current === fn) {
          setError(error.message);
          setLoading(false);
        }
      });
      fnRef.current = fn;
    }
  }, [fn, args]);

  return { data, error, isLoading };
}
