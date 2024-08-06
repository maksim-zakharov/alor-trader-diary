import Title, {TitleProps} from "antd/es/typography/Title";
import React, {FC, useMemo} from "react";
import useScroll from "./useScroll";
import useWindowDimensions from "./useWindowDimensions";

const TTitle: FC<TitleProps> = (props) => {
    const {isMobile} = useWindowDimensions();
    const {yOffset} = useScroll();

    // Ускорение появления мобильного хедера
    const FIXED_HEADER_OPACITY_SPEED = 2;

    // Высота мобильного хедера
    const MOBILE_HEADER_HEIGHT = 54;

    const opacity = useMemo(() => isMobile ? (MOBILE_HEADER_HEIGHT*2 - yOffset * 2) / 100 : 1, [yOffset, isMobile]);

    return <>
        <Title {...props} style={{opacity}}/>
        <Title {...props} className="MobileHeader" style={{opacity: 0 - opacity * FIXED_HEADER_OPACITY_SPEED}}/>
    </>
}

export default TTitle;