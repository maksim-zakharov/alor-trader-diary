import Title, {TitleProps} from "antd/es/typography/Title";
import React, {FC, useMemo} from "react";
import useScroll from "./useScroll";
import useWindowDimensions from "./useWindowDimensions";

interface IProps{
    isMobile?: boolean;
}

const TTitle: FC<TitleProps & IProps> = (props) => {
    const {isMobile} = useWindowDimensions();
    const {yOffset} = useScroll();

    // Ускорение появления мобильного хедера
    const FIXED_HEADER_OPACITY_SPEED = 2;

    // Высота мобильного хедера
    const MOBILE_HEADER_HEIGHT = 54;

    const opacity = useMemo(() => isMobile ? (MOBILE_HEADER_HEIGHT*2 - yOffset * 2) / 100 : 1, [yOffset, isMobile]);
    const mobileOpacity= useMemo(() => opacity < 0 ? 1 : 0, [opacity]);

    return <>
        <Title {...props} style={{opacity}}/>
        {!!props.isMobile &&<Title {...props} className="MobileHeader" style={{opacity: mobileOpacity}}/>}
    </>
}

export default TTitle;