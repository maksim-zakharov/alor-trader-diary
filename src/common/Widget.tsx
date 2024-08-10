import React, {FC, ReactNode} from "react";

interface IProps {
    title: string;
    children?: ReactNode
}

const Widget: FC<IProps> = (props) => {

    return <div className="widget">
        <div className="widget_header">{props.title}</div>
        {props.children}
    </div>
}

export default Widget;