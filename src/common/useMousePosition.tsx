import React from 'react';
const useMousePosition = (type: 'touchmove' | 'mousemove' = 'mousemove', mouseMoveEvent = null) => {
    const [
        mousePosition,
        setMousePosition
    ] = React.useState({ x: null, y: null });
    React.useEffect(() => {
        const updateMousePosition = ev => {
            mouseMoveEvent?.(ev);
            setMousePosition({ x: ev.clientX, y: ev.clientY });
        };
        window.addEventListener(type, updateMousePosition);
        return () => {
            window.removeEventListener(type, updateMousePosition);
        };
    }, []);
    return mousePosition;
};
export default useMousePosition;