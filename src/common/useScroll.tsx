import {useEffect, useState} from "react";

function getWindowDimensions() {
    const {pageYOffset: yOffset} = window;
    return {
        yOffset,
    };
}

const useScroll = () => {
    const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

    // useEffect(() => {
    //     const timeout = setTimeout(() => {
    //         setWindowDimensions(getWindowDimensions());
    //     }, 1);
    //
    //     return () => clearTimeout(timeout);
    // }, [])

    useEffect(() => {
        function handleResize(e) {
            console.log(e)
            setWindowDimensions(getWindowDimensions());
        }

        window.addEventListener('scroll', handleResize);
        return () => window.removeEventListener('scroll', handleResize);
    }, []);

    return windowDimensions;
}

export default useScroll;