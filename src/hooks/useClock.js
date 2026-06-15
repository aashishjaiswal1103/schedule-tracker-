import { useState, useEffect, useRef } from 'react';

export function useClock() {
  const [now, setNow] = useState(new Date());
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  return now;
}
