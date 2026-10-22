import { motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";

interface AnimateChangeInHeightProps {
  children: React.ReactNode;
  className?: string;
}

export const AnimateChangeInHeight: React.FC<AnimateChangeInHeightProps> = ({
  children,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | "auto">(0);

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        // We only have one entry, so we can use entries[0].
        const observedHeight = entries[0].contentRect.height;
        setHeight(observedHeight);
      });

      resizeObserver.observe(containerRef.current);

      return () => {
        // Cleanup the observer when the component is unmounted
        resizeObserver.disconnect();
      };
    }
  }, []);

  return (
    <motion.div
      className="overflow-hidden"
      initial={{
        height: 0,
        opacity: 0,
        // y: 0,
        // paddingTop: 0,
      }}
      animate={{
        height,
        // y: 30,
        opacity: 1,
        // paddingTop: 10,
        transition: {
          height: {
            duration: 0.4,
            type: "spring",
            mass: 1,
            damping: 25,
            stiffness: 500,
          },
          opacity: {
            duration: 0.2,
            delay: 0.2,
          },
        },
      }}
      exit={{
        marginBottom: [0, 20, 5, 0],
        height: 0,
        opacity: 1,
        // paddingTop: 0,
        transition: {
          height: {
            duration: 0.2,
            delay: 0.2,
          },
          opacity: {
            duration: 0.25,
          },
        },
      }}
      key="test"
    >
      <div ref={containerRef}>{children}</div>
    </motion.div>
  );
};
