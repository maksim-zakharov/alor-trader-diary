import React, {useMemo, useState} from "react";
import useWindowDimensions from "./useWindowDimensions";
import {Drawer} from "antd";
import {DrawerProps} from "antd/lib";

const DraggableDrawer = (props: DrawerProps) => {
    const {height} = useWindowDimensions();
    const [top, setTop] = useState(0);

    function onMouseDown(event) {
        event.target.closest('.ant-drawer-content-wrapper').classList.add('ant-drawer-content-wrapper-dragger');
    }

    const onMouseMove = (event) => {
        var touch = event.touches[0];
        var y = touch.pageY;
        // setTitle(touch.pageY);
        setTop(y - 24)
        event.target.closest('.ant-drawer-content-wrapper').style.top = `${y - 24}px`;
    }

    function onMouseUp(event) {
        // console.log(event.target.closest('.ant-drawer-content-wrapper'))
        event.target.closest('.ant-drawer-content-wrapper').classList.remove('ant-drawer-content-wrapper-dragger');
        var touch = event.changedTouches[0];
        var y = touch.pageY;

        const diff = y / height;
        if (diff >= 0.2) {
            props?.onClose(event);
            setTimeout(() => event.target.closest('.ant-drawer-content-wrapper').style.removeProperty('top'), 500);
        } else {
            event.target.closest('.ant-drawer-content-wrapper').style.removeProperty('top')
        }
    }

    const pipka = () => {

        return <div className="drawer-slider"/>
    }

    const title = useMemo(() => <div onMouseDown={onMouseDown} onMouseUp={onMouseUp} onTouchMove={onMouseMove} onTouchStart={onMouseDown}
                                           onTouchEnd={onMouseUp}>
        {pipka()}
        {props.title}
    </div>, [props.title]);

    return <Drawer {...props} title={title} />;
}

export default DraggableDrawer;