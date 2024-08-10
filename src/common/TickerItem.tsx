import React, {FC, ReactNode} from "react";
import {Property} from 'csstype';

interface IProps {
    key?: React.Key,
    logo?: ReactNode;
    title: string,
    description: string,
    actionTitle?: ReactNode,
    actionTitleColor?: Property.Color,
    actionDescription?: ReactNode,
}

const TickerItem: FC<IProps> = (props) => {

    return <div className="ticker-info" key={props.key}>
        <div style={{display: 'flex'}}>
            {props.logo}
            <div className="ticker_name">
                <div
                    className="ticker_name_title">{props.title}</div>
                <div className="ticker_name_description">
                    {props.description}
                </div>
            </div>
        </div>
        {(props.actionTitle || props.actionDescription) && <div className="ticker_actions">
            {props.actionTitle && <div className="ticker_name_title" style={{ color: props.actionTitleColor }}>
                {props.actionTitle}
            </div>}
            {props.actionDescription && <div className="ticker_name_description">{props.actionDescription}</div>}
        </div>}
    </div>
}

export default TickerItem;