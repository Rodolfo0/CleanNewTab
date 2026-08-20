import { useEffect, useState } from "react";

const midnightBufferMs = 50;

function millisecondsUntilNextDay(now: Date) {
  const nextDay = new Date(now);
  nextDay.setHours(24, 0, 0, midnightBufferMs);
  return Math.max(1, nextDay.getTime() - now.getTime());
}

export function useToday(formatter: Intl.DateTimeFormat) {
  const [today, setToday] = useState(() => formatter.format(new Date()));

  useEffect(() => {
    let timeoutId: number | undefined;

    const scheduleNextDay = () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }

      const now = new Date();
      setToday(formatter.format(now));
      timeoutId = window.setTimeout(() => {
        scheduleNextDay();
      }, millisecondsUntilNextDay(now));
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        scheduleNextDay();
      }
    };

    scheduleNextDay();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [formatter]);

  return today;
}
