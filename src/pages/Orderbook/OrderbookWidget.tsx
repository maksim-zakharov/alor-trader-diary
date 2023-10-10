import React from "react";
import AtsScalperOrderBookBody from "./AtsScalperOrderBookBody";

const OrderbookWidget = ({api}) => {

    return <>
    <div>
{/*      <div class="header flex-gap-2">*/}
{/*        <div class="d-flex flex-gap-2">*/}
{/*          <div>*/}
{/*              <AtsWorkingVolumesPanel selectedVolumeChanged={workingVolume$.next($event)} guid={guid} isActive={isActive}  />*/}
{/*          </div>*/}
{/*          <div class="mt-1">*/}
{/*            <AtsModifiersIndicator/>*/}
{/*          </div>*/}
{/*        </div>*/}
{/*</div>*/}
    <div className="order-book-body">
        <AtsScalperOrderBookBody guid={''} isActive={true} api={api}
        workingVolume={0}/>
</div>
{/*    <div class="footer">*/}
{/*        <AtsCurrentPositionPanel guid={guid}/>*/}
{/*</div>*/}
</div>
    </>
}

export default OrderbookWidget;