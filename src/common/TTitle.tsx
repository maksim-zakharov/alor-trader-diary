import Title, {TitleProps} from "antd/es/typography/Title";
import React, {FC, useMemo} from "react";
import useScroll from "./useScroll";
import useWindowDimensions from "./useWindowDimensions";

const TTitle: FC<TitleProps> = (props) => {
    const {height, width, isMobile} = useWindowDimensions();
    const {yOffset} = useScroll();

    const opacity = useMemo(() => isMobile ? (100 - yOffset * 2) / 100 : 1, [yOffset, isMobile]);

    return <>
        <Title {...props} style={{opacity}}/>
        <Title {...props} className="MobileHeader" style={{opacity: 2 - opacity}}/>
    </>
}

export default TTitle;