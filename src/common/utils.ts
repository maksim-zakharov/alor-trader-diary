import * as React from "react";

export const random = (maxValue = 100) => {
  return Math.floor(Math.random() * maxValue);
};

export const moneyFormat = (money: number, maximumFractionDigits = undefined, minimumFractionDigits = undefined) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits,
      minimumFractionDigits
  }).format(money);

export const fillCanvas = (
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
) => {
  const context = canvas.getContext('2d')!;

  context.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width = width;
  canvas.height = height;

  return canvas;
};

export const shortNumberFormat = (number: number,minimumFractionDigits = undefined, maximumFractionDigits = 1) =>
  Intl.NumberFormat('en', {
    notation: 'compact',
      minimumFractionDigits,
    maximumFractionDigits,
  }).format(number || 0);

export const virtualListStyles : {
    horizontalScrollBar?: React.CSSProperties;
    horizontalScrollBarThumb?: React.CSSProperties;
    verticalScrollBar?: React.CSSProperties;
    verticalScrollBarThumb?: React.CSSProperties;
} = {
    verticalScrollBar: {
        width: 'calc(var(--scrollbar-width) - 2px)',
        height: 'var(--scrollbar-width)',
        background: 'rgba(var(--scrollbars-bg-color), var(--scrollbars-bg-opacity))',
        cursor: 'pointer'
    },
    verticalScrollBarThumb: {
        border: '2px solid transparent',
        backgroundColor: "rgba(var(--scrollbars-thumb-color), var(--scrollbars-thumb-opacity))",
        backgroundClip: "padding-box",
        borderRadius: "5px",
        cursor: "pointer",
        // -webkit-transition: "background-color .2s ease-in",
        transition: "background-color .2s ease-in"
    }
}

export function getTimezone(): { name: string; utcOffset: number; formattedOffset: string } {
    let offset = new Date().getTimezoneOffset();
    let timezoneName = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // if (this.displayTimezone === 'MskTime') {
    timezoneName = 'Europe/Moscow';
    const localTime = new Date();
    localTime.setMilliseconds(0);
    localTime.setSeconds(0);
    const mskTime = toMskTime(localTime);
    const correction = (localTime.getTime() - mskTime.getTime()) / 1000 / 60;
    offset = localTime.getTimezoneOffset() + correction;
    // }

    const hoursOffset = Math.trunc(offset / 60);
    const minutesOffset = Math.abs(Math.round((offset / 60 - hoursOffset) * 60));
    let formattedOffset = `${Math.abs(hoursOffset)}`;
    if (minutesOffset > 0) {
        formattedOffset += `:${minutesOffset}`;
    }

    return {
        name: timezoneName,
        utcOffset: offset,
        formattedOffset: formattedOffset,
    };
}

function toMskTime(utcDate: Date): Date {
    return new Date(utcDate.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
}

/**
 * Returns the number of decimal places
 * @param a Target number
 * @returns The number of decimal places
 */
export function getPrecision(a: number): number {
    if (!isFinite(a)) return 0;
    let e = 1;
    let p = 0;

    while (Math.round(a * e) / e !== a) {
        e *= 10;
        p++;
    }

    return p;
}
