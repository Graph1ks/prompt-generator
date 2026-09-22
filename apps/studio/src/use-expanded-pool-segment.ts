import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";

export interface ExpandedPoolSegmentController {
  readonly segmentRef: MutableRefObject<HTMLElement | null>;
  readonly showReturnToStart: boolean;
  readonly scrollToStart: () => void;
}

export function useExpandedPoolSegment(
  expanded: boolean,
): ExpandedPoolSegmentController {
  const segmentRef = useRef<HTMLElement | null>(null);
  const [showReturnToStart, setShowReturnToStart] = useState(false);

  const scrollToStart = useCallback(() => {
    segmentRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  useEffect(() => {
    if (!expanded) {
      setShowReturnToStart(false);
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const element = segmentRef.current;
      if (!element) {
        setShowReturnToStart(false);
        return;
      }

      const rect = element.getBoundingClientRect();
      const stickyHeaderAllowance = 92;
      const hasScrolledIntoSegment = rect.top < stickyHeaderAllowance - 120;
      const hasNotPassedSegment = rect.bottom > stickyHeaderAllowance + 80;
      setShowReturnToStart(hasScrolledIntoSegment && hasNotPassedSegment);
    };

    const schedule = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [expanded]);

  return { segmentRef, showReturnToStart, scrollToStart };
}
