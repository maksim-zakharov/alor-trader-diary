import Title, {TitleProps} from "antd/es/typography/Title";
import React, {FC, useEffect, useMemo} from "react";
import useScroll from "./useScroll";
import useWindowDimensions from "./useWindowDimensions";

const TTitle: FC<TitleProps> = (props) => {
    const {height, width, isMobile} = useWindowDimensions();
    const {yOffset} = useScroll();

    const opacity = useMemo(() => isMobile ? (58*2 - yOffset * 2) / 100 : 1, [yOffset, isMobile]);

    // Ускорение появления мобильного хедера
    const FIXED_HEADER_OPACITY_SPEED = 2;

    return <>
        <Title {...props} style={{opacity}}/>
        <Title {...props} className="MobileHeader" style={{opacity: 0 - opacity * FIXED_HEADER_OPACITY_SPEED}}/>
    </>
}

export default TTitle;