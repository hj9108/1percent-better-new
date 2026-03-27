import React, { useState, useEffect } from 'react';

export const motion = {
  div: React.forwardRef(({ initial, animate, exit, transition, whileHover, whileTap, layout, ...props }, ref) => {
    const [style, setStyle] = useState({});

    useEffect(() => {
      if (animate) {
        const s = {};
        if (animate.opacity !== undefined) s.opacity = animate.opacity;
        if (animate.y !== undefined) s.transform = `translateY(${animate.y}px)`;
        if (animate.x !== undefined) s.transform = `translateX(${animate.x}px)`;
        if (animate.scale !== undefined) s.transform = `scale(${animate.scale})`;
        s.transition = 'all 0.4s ease';
        setStyle(s);
      }
    }, []);

    return <div ref={ref} {...props} style={{ ...props.style, ...style }} />;
  }),
  button: React.forwardRef(({ initial, animate, exit, transition, whileHover, whileTap, layout, ...props }, ref) => {
    return <button ref={ref} {...props} />;
  }),
  span: React.forwardRef(({ initial, animate, exit, transition, whileHover, whileTap, layout, ...props }, ref) => {
    return <span ref={ref} {...props} />;
  }),
};

export const AnimatePresence = ({ children, mode }) => {
  return <>{children}</>;
};