import { useEffect, useState } from "react";

const useFade = (initial?: any) => {
  // show is controlling the CSS animation
  const [show, setShow] = useState(initial);

  // isVisible is exposed to the component (toggled after animation)
  const [isVisible, setVisible] = useState(show);

  // Update visibility when show changes
  useEffect(() => {
    if (show) setVisible(true);
  }, [show]);

  // These props go on the fading DOM element
  let fromProps = {
    style: { animation: `${show ? "fadeIn" : "fadeOut"} .4s` },
    onAnimationEnd: () => !show && setVisible(false),
  };

  let toProps = {
    style: { animation: `${show ? "fadeOut" : "fadeIn"} 2s` },
    onAnimationEnd: () => show && setVisible(true),
  };

  return [isVisible, setShow, fromProps, toProps];
};

export default useFade;
