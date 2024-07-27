import ChevronBottomIcon from "../assets/chevron-bottom";
import {Select, SelectProps} from "antd";
import React, {FC} from "react";

export type TSelectProps = Omit<SelectProps, 'suffixIcon'>;

const ASelect: FC<TSelectProps> = (props) => <Select
    {...props}
    suffixIcon={<ChevronBottomIcon/>}/>

export default ASelect;