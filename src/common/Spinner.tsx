import React from "react";

const Spinner = () => {
    return <div className="pro-non-ideal-state" data-qa-tag="nonIdealState">
        <div className="pro-non-ideal-state-visual">
            <div className="pro-spinner" data-qa-tag="spinner">
                <div className="pro-spinner-animation">
                    <svg width="40" height="40" stroke-width="8.00" viewBox="1.00 1.00 98.00 98.00">
                        <path className="pro-spinner-track"
                              d="M 50,50 m 0,-45 a 45,45 0 1 1 0,90 a 45,45 0 1 1 0,-90"></path>
                        <path className="pro-spinner-head" d="M 50,50 m 0,-45 a 45,45 0 1 1 0,90 a 45,45 0 1 1 0,-90"
                              pathLength="280" stroke-dasharray="280 280" stroke-dashoffset="210"></path>
                    </svg>
                </div>
            </div>
        </div>
    </div>
}

export default Spinner;